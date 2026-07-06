import { createHash } from 'crypto';
import { DocumentVerifier } from '../agent/src/validator/documentVerifier';

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash'),
  }),
}));

describe('DocumentVerifier', () => {
  let verifier: DocumentVerifier;
  const mockDoc: any = {
    docId: 'doc-123',
    docType: 'invoice',
    issuer: 'gov-us',
    subject: 'Test Document',
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date('2028-01-01'),
    contentHash: 'a'.repeat(64), // valid sha256-format hex string, required by #checkHash
    size: 1000,
    mimeType: 'application/pdf',
  };

  beforeEach(() => {
    verifier = new DocumentVerifier();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default config when no config provided', () => {
      expect(verifier).toBeInstanceOf(DocumentVerifier);
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    test('should initialize with custom config when provided', () => {
      const customConfig = {
        minDocSize: 200,
        maxDocSize: 10_000_000,
        maxAgeYears: 10,
        requiredChecks: ['format', 'hash'],
        strictMode: true,
      };
      const customVerifier = new DocumentVerifier(customConfig);
      expect(customVerifier).toBeInstanceOf(DocumentVerifier);
    });
  });

  describe('registerIssuer', () => {
    // #knownIssuers is a true JS private field — exercised indirectly through verify()'s
    // public 'issuer' check rather than reached into directly (private fields aren't
    // accessible via bracket-notation from outside the class).
    test('should register a new issuer that then passes the issuer check', () => {
      verifier.registerIssuer('new-issuer', 'New Issuer', 0.9);
      const result = verifier.verify({ ...mockDoc, issuer: 'new-issuer' });
      const issuerCheck = result.checks.find((c) => c.name === 'issuer');
      expect(issuerCheck?.passed).toBe(true);
      expect(issuerCheck?.details).toContain('0.9');
    });

    test('should clamp trust level between 0 and 1, low trust still fails issuer check', () => {
      verifier.registerIssuer('low-trust', 'Low Trust', -1);
      verifier.registerIssuer('high-trust', 'High Trust', 2);
      const lowResult = verifier.verify({ ...mockDoc, issuer: 'low-trust' });
      const highResult = verifier.verify({ ...mockDoc, issuer: 'high-trust' });
      expect(lowResult.checks.find((c) => c.name === 'issuer')?.passed).toBe(false); // trustLevel clamped to 0, below 0.5 threshold
      expect(highResult.checks.find((c) => c.name === 'issuer')?.passed).toBe(true); // trustLevel clamped to 1
    });
  });

  describe('verify', () => {
    test('should return verified result for valid document', () => {
      const result = verifier.verify(mockDoc);
      expect(result.verified).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.checks.length).toBeGreaterThan(0);
    });

    test('should return unverified result for invalid document', () => {
      const invalidDoc = { ...mockDoc, mimeType: 'invalid/type' };
      const result = verifier.verify(invalidDoc);
      expect(result.verified).toBe(false);
    });

    test('should include warnings for low score', () => {
      // Fail format (size below minDocSize), issuer (unknown) and type (unrecognized) checks
      // so passed weight (freshness 20 + hash 20 + expiry 10 = 50) drops below the 60 threshold.
      const lowScoreDoc = { ...mockDoc, size: 50, issuer: 'unknown-issuer', docType: 'unknown-type' };
      const result = verifier.verify(lowScoreDoc);
      expect(result.score).toBeLessThan(60);
      expect(result.warnings).toContain('Low verification score');
    });

    test('should include warning for expired document', () => {
      const expiredDoc = { ...mockDoc, expiresAt: new Date('2020-01-01') };
      const result = verifier.verify(expiredDoc);
      expect(result.warnings).toContain('Document has expired');
    });

    test('should compute evidence hash', () => {
      const result = verifier.verify(mockDoc);
      expect(result.evidenceHash).toBe('mocked-hash');
      expect(createHash).toHaveBeenCalled();
    });

    test('should fail when required check is missing', () => {
      const config = { requiredChecks: ['format', 'hash', 'nonexistent'] };
      const customVerifier = new DocumentVerifier(config);
      const result = customVerifier.verify(mockDoc);
      expect(result.verified).toBe(false);
    });

    test('should pass in non-strict mode with score >= 60', () => {
      const config = { strictMode: false };
      const customVerifier = new DocumentVerifier(config);
      const result = customVerifier.verify(mockDoc);
      expect(result.verified).toBe(true);
    });

    test('should fail in strict mode when a required check fails', () => {
      // Required checks (format/freshness/issuer/hash) sum to 80 of the 100-point weight,
      // so the strict >=80 score gate can only ever reject when a required check itself fails.
      const config = { strictMode: true };
      const customVerifier = new DocumentVerifier(config);
      const invalidDoc = { ...mockDoc, mimeType: 'invalid/type' };
      const result = customVerifier.verify(invalidDoc);
      expect(result.verified).toBe(false);
    });

    test('should pass in strict mode with score >= 80', () => {
      const highScoreDoc = { ...mockDoc, size: 1_000_000 };
      const config = { strictMode: true };
      const customVerifier = new DocumentVerifier(config);
      const result = customVerifier.verify(highScoreDoc);
      expect(result.verified).toBe(true);
    });
  });

  describe('verifyBatch', () => {
    test('should verify multiple documents', () => {
      const docs = [mockDoc, { ...mockDoc, docId: 'doc-456' }];
      const results = verifier.verifyBatch(docs);
      expect(results.length).toBe(2);
      expect(results.every(r => r.docId)).toBe(true);
    });

    test('should return empty array for empty input', () => {
      const results = verifier.verifyBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('getVerificationStats', () => {
    test('should return initial stats', () => {
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    test('should update stats after verification', () => {
      verifier.verify(mockDoc);
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(1);
      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    test('should calculate average score correctly', () => {
      verifier.verify(mockDoc);
      verifier.verify({ ...mockDoc, docId: 'doc-456', size: 2000 });
      const stats = verifier.getVerificationStats();
      expect(stats.avgScore).toBeGreaterThan(0);
    });
  });

  // The six checks below (#checkFormat, #checkFreshness, #checkIssuer, #checkHash,
  // #checkType, #checkExpiry) are true JS private class fields (`#name`), which are
  // NOT reachable via bracket-notation (`verifier['#checkFormat']`) from outside the
  // class — that always throws "is not a function". They're exercised black-box
  // through the public verify() result's `checks` array instead.
  function checkFor(result: ReturnType<DocumentVerifier['verify']>, name: string) {
    return result.checks.find((c) => c.name === name);
  }

  describe('checkFormat', () => {
    test('should pass for allowed mime type', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'format')?.passed).toBe(true);
    });

    test('should fail for disallowed mime type', () => {
      const invalidDoc = { ...mockDoc, mimeType: 'video/mp4' };
      const result = verifier.verify(invalidDoc);
      expect(checkFor(result, 'format')?.passed).toBe(false);
    });
  });

  describe('checkFreshness', () => {
    test('should pass for recent document', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'freshness')?.passed).toBe(true);
    });

    test('should fail for old document', () => {
      const oldDoc = { ...mockDoc, issuedAt: new Date('2010-01-01') };
      const result = verifier.verify(oldDoc);
      expect(checkFor(result, 'freshness')?.passed).toBe(false);
    });
  });

  describe('checkIssuer', () => {
    test('should pass for known issuer', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'issuer')?.passed).toBe(true);
    });

    test('should fail for unknown issuer', () => {
      const unknownDoc = { ...mockDoc, issuer: 'unknown-issuer' };
      const result = verifier.verify(unknownDoc);
      expect(checkFor(result, 'issuer')?.passed).toBe(false);
    });
  });

  describe('checkHash', () => {
    test('should pass for well-formed sha256 hash', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'hash')?.passed).toBe(true);
    });

    test('should fail for malformed hash', () => {
      const invalidDoc = { ...mockDoc, contentHash: 'wrong-hash' };
      const result = verifier.verify(invalidDoc);
      expect(checkFor(result, 'hash')?.passed).toBe(false);
    });
  });

  describe('checkType', () => {
    test('should pass for allowed type', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'type')?.passed).toBe(true);
    });

    test('should fail for disallowed type', () => {
      const invalidDoc = { ...mockDoc, docType: 'unknown-type' };
      const result = verifier.verify(invalidDoc);
      expect(checkFor(result, 'type')?.passed).toBe(false);
    });
  });

  describe('checkExpiry', () => {
    test('should pass for non-expired document', () => {
      const result = verifier.verify(mockDoc);
      expect(checkFor(result, 'expiry')?.passed).toBe(true);
    });

    test('should fail for expired document', () => {
      const expiredDoc = { ...mockDoc, expiresAt: new Date('2020-01-01') };
      const result = verifier.verify(expiredDoc);
      expect(checkFor(result, 'expiry')?.passed).toBe(false);
    });

    test('should pass for document without expiry', () => {
      const noExpiryDoc = { ...mockDoc, expiresAt: null };
      const result = verifier.verify(noExpiryDoc);
      expect(checkFor(result, 'expiry')?.passed).toBe(true);
    });
  });
});
