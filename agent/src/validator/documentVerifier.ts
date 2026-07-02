import { createHash } from 'crypto';

interface DocumentMetadata {
  docId: string;
  docType: string;
  issuer: string;
  subject: string;
  issuedAt: Date;
  expiresAt: Date | null;
  contentHash: string;
  size: number;
  mimeType: string;
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  weight: number;
  details: string;
}

interface VerificationResult {
  docId: string;
  verified: boolean;
  score: number;
  checks: VerificationCheck[];
  verifiedAt: Date;
  verifierVersion: string;
  evidenceHash: string;
  warnings: string[];
}

interface VerifierConfig {
  minDocSize: number;
  maxDocSize: number;
  maxAgeYears: number;
  requiredChecks: string[];
  strictMode: boolean;
}

const DEFAULT_CONFIG: VerifierConfig = {
  minDocSize: 100,
  maxDocSize: 50_000_000,
  maxAgeYears: 5,
  requiredChecks: ['format', 'freshness', 'issuer', 'hash'],
  strictMode: false,
};

const ALLOWED_TYPES = ['invoice', 'deed', 'certificate', 'appraisal', 'insurance', 'lease', 'audit'];
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/json', 'application/xml'];

class DocumentVerifier {
  #config: VerifierConfig;
  #knownIssuers: Map<string, { name: string; trustLevel: number }>;
  #stats: { total: number; passed: number; failed: number; scoreSum: number };

  constructor(config?: Partial<VerifierConfig>) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#stats = { total: 0, passed: 0, failed: 0, scoreSum: 0 };
    this.#knownIssuers = new Map([
      ['gov-us', { name: 'US Government', trustLevel: 0.95 }],
      ['eu-central', { name: 'EU Central Bank', trustLevel: 0.92 }],
      ['big-four', { name: 'Big Four Auditor', trustLevel: 0.88 }],
      ['title-co', { name: 'National Title Company', trustLevel: 0.82 }],
      ['appraisal-inst', { name: 'Appraisal Institute', trustLevel: 0.78 }],
    ]);
    this.#stats = { total: 0, passed: 0, failed: 0, scoreSum: 0 };
  }

  registerIssuer(id: string, name: string, trustLevel: number): void {
    this.#knownIssuers.set(id, { name, trustLevel: Math.max(0, Math.min(1, trustLevel)) });
  }

  verify(doc: DocumentMetadata): VerificationResult {
    // Validate issuedAt to prevent crashes from invalid Date
    if (!(doc.issuedAt instanceof Date) || isNaN(doc.issuedAt.getTime())) {
      throw new Error('invalid issuedAt: must be a valid Date');
    }
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    checks.push(this.#checkFormat(doc));
    checks.push(this.#checkFreshness(doc));
    checks.push(this.#checkIssuer(doc));
    checks.push(this.#checkHash(doc));
    checks.push(this.#checkType(doc));
    checks.push(this.#checkExpiry(doc));

    const requiredPassed = this.#config.requiredChecks.every(name =>
      checks.find(c => c.name === name)?.passed ?? false
    );

    const score = this.#computeScore(checks);
    const verified = requiredPassed && (!this.#config.strictMode || score >= 80);

    if (score < 60) warnings.push('Low verification score');
    if (doc.expiresAt && doc.expiresAt < new Date()) warnings.push('Document has expired');

    const resultBase: Omit<VerificationResult, 'evidenceHash'> = {
      docId: doc.docId,
      verified,
      score,
      checks,
      verifiedAt: new Date(),
      verifierVersion: '1.0.0',
      warnings,
    };

    const result: VerificationResult = {
      ...resultBase,
      evidenceHash: this.#hashResult(resultBase),
    };

    this.#stats.total++;
    if (verified) this.#stats.passed++; else this.#stats.failed++;
    this.#stats.scoreSum += score;

    return result;
  }

  verifyBatch(docs: DocumentMetadata[]): VerificationResult[] {
    const MAX_BATCH = 1000;
    if (docs.length > MAX_BATCH) {
      throw new Error(`batch size ${docs.length} exceeds maximum ${MAX_BATCH}`);
    }
    return docs.map(doc => this.verify(doc));
  }

  getVerificationStats(): { total: number; passed: number; failed: number; avgScore: number } {
    return {
      total: this.#stats.total,
      passed: this.#stats.passed,
      failed: this.#stats.failed,
      avgScore: this.#stats.total > 0 ? Math.round((this.#stats.scoreSum / this.#stats.total) * 100) / 100 : 0,
    };
  }

  #checkFormat(doc: DocumentMetadata): VerificationCheck {
    const validMime = ALLOWED_MIMES.includes(doc.mimeType);
    const validSize = doc.size >= this.#config.minDocSize && doc.size <= this.#config.maxDocSize;
    return {
      name: 'format',
      passed: validMime && validSize,
      weight: 15,
      details: `mime: ${validMime ? 'ok' : 'invalid'}, size: ${validSize ? 'ok' : 'out of bounds'}`,
    };
  }

  #checkFreshness(doc: DocumentMetadata): VerificationCheck {
    const age = Date.now() - doc.issuedAt.getTime();
    const maxAge = this.#config.maxAgeYears * 365.25 * 24 * 60 * 60 * 1000;
    const fresh = age >= 0 && age <= maxAge;
    return {
      name: 'freshness',
      passed: fresh,
      weight: 20,
      details: fresh ? 'within acceptable age' : `age exceeds ${this.#config.maxAgeYears} years`,
    };
  }

  #checkIssuer(doc: DocumentMetadata): VerificationCheck {
    const issuer = this.#knownIssuers.get(doc.issuer);
    const passed = !!issuer && issuer.trustLevel >= 0.5;
    return {
      name: 'issuer',
      passed,
      weight: 25,
      details: issuer ? `trust level: ${issuer.trustLevel}` : 'unknown issuer',
    };
  }

  #checkHash(doc: DocumentMetadata): VerificationCheck {
    const valid = /^[a-f0-9]{64}$/i.test(doc.contentHash);
    return {
      name: 'hash',
      passed: valid,
      weight: 20,
      details: valid ? 'valid sha256 format' : 'invalid hash format',
    };
  }

  #checkType(doc: DocumentMetadata): VerificationCheck {
    const valid = ALLOWED_TYPES.includes(doc.docType);
    return {
      name: 'type',
      passed: valid,
      weight: 10,
      details: valid ? 'recognized type' : 'unrecognized type',
    };
  }

  #checkExpiry(doc: DocumentMetadata): VerificationCheck {
    const expired = doc.expiresAt !== null && doc.expiresAt < new Date();
    return {
      name: 'expiry',
      passed: !expired,
      weight: 10,
      details: expired ? 'document expired' : 'not expired',
    };
  }

  #computeScore(checks: VerificationCheck[]): number {
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const passedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
    return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  }

  #hashResult(result: Omit<VerificationResult, 'evidenceHash'>): string {
    // Use structured JSON to prevent delimiter-based hash collisions
    const data = JSON.stringify({
      docId: result.docId,
      verified: result.verified,
      score: result.score,
      verifiedAt: result.verifiedAt.toISOString(),
      verifierVersion: result.verifierVersion,
    });
    return createHash('sha256').update(data).digest('hex');
  }
}

export { DocumentVerifier };
export type { DocumentMetadata, VerificationResult, VerificationCheck, VerifierConfig };
