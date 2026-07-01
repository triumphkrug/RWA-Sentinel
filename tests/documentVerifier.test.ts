import { createHash } from 'crypto';
import { DocumentVerifier } from '../../validator/documentVerifier';

jest.mock('crypto', () => ({
  createHash: jest.fn(),
}));

describe('DocumentVerifier', () => {
  let verifier: DocumentVerifier;
  let mockCreateHash: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDigest: jest.Mock;

  const validDoc = {
    docId: 'doc-123',
    docType: 'invoice',
    issuer: 'gov-us',
    subject: 'Test Subject',
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date('2025-01-01'),
    contentHash: 'a'.repeat(64),
    size: 1000,
    mimeType: 'application/pdf',
  };

  beforeEach(() => {
    mockDigest = jest.fn().mockReturnValue('mockedhash1234567890abcdef1234567890abcdef1234567890abcdef123456');
    mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
    mockCreateHash = jest.fn().mockReturnValue({ update: mockUpdate });
    (createHash as jest.Mock).mockImplementation(mockCreateHash);

    verifier = new DocumentVerifier();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create verifier with default config', () => {
      const v = new DocumentVerifier();
      const stats = v.getVerificationStats();
      expect(stats.total).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    test('should create verifier with custom config overriding defaults', () => {
      const v = new DocumentVerifier({ minDocSize: 200, strictMode: true });
      const result = v.verify(validDoc);
      expect(result.checks.find(c => c.name === 'format')?.passed).toBe(true);
    });

    test('should create verifier with partial config merged with defaults', () => {
      const v = new DocumentVerifier({ maxAgeYears: 10 });
      expect(v).toBeDefined();
    });

    test('should initialize known issuers with default set', () => {
      const v = new DocumentVerifier();
      const result = v.verify(validDoc);
      const issuerCheck = result.checks.find(c => c.name === 'issuer');
      expect(issuerCheck?.passed).toBe(true);
      expect(issuerCheck?.details).toContain('trust level: 0.95');
    });
  });

  describe('registerIssuer', () => {
    test('should register new issuer with valid trust level', () => {
      verifier.registerIssuer('new-issuer', 'New Issuer', 0.75);
      const doc = { ...validDoc, issuer: 'new-issuer' };
      const result = verifier.verify(doc);
      expect(result.checks.find(c => c.name === 'issuer')?.passed).toBe(true);
    });

    test('should clamp trust level to 0 when negative', () => {
      verifier.registerIssuer('low-issuer', 'Low Issuer', -0.5);
      const doc = { ...validDoc, issuer: 'low-issuer' };
      const result = verifier.verify(doc);
      expect(result.checks.find(c => c.name === 'issuer')?.passed).toBe(false);
    });

    test('should clamp trust level to 1 when over 1', () => {
      verifier.registerIssuer('high-issuer', 'High Issuer', 1.5);
      const doc = { ...validDoc, issuer: 'high-issuer' };
      const result = verifier.verify(doc);
      expect(result.checks.find(c => c.name === 'issuer')?.passed).toBe(true);
    });

    test('should update existing issuer', () => {
      verifier.registerIssuer('gov-us', 'Updated Gov', 0.3);
      const result = verifier.verify(validDoc);
      expect(result.checks.find(c => c.name === 'issuer')?.passed).toBe(false);
    });
  });

  describe('verify', () => {
    test('should return verified true for valid document with all checks passing', () => {
      const result = verifier.verify(validDoc);
      expect(result.verified).toBe(true);
      expect(result.score).toBe(100);
      expect(result.checks).toHaveLength(6);
    });

    test('should return verified false when required check fails', () => {
      const doc = { ...validDoc, contentHash: 'invalid' };
      const result = verifier.verify(doc);
      expect(result.verified).toBe(false);
    });

    test('should return verified false in strict mode when score below 80', () => {
      const v = new DocumentVerifier({ strictMode: true });
      const doc = { ...validDoc, issuer: 'unknown-issuer' };
      const result = v.verify(doc);
      expect(result.verified).toBe(false);
    });

    test('should include warning for low score', () => {
      const doc = { ...validDoc, issuer: 'unknown-issuer', docType: 'unknown' };
      const result = verifier.verify(doc);
      expect(result.warnings).toContain('Low verification score');
    });

    test('should include warning for expired document', () => {
      const doc = { ...validDoc, expiresAt: new Date('2020-01-01') };
      const result = verifier.verify(doc);
      expect(result.warnings).toContain('Document has expired');
    });

    test('should handle document with null expiresAt', () => {
      const doc = { ...validDoc, expiresAt: null };
      const result = verifier.verify(doc);
      const expiryCheck = result.checks.find(c => c.name === 'expiry');
      expect(expiryCheck?.passed).toBe(true);
    });

    test('should compute evidence hash using crypto', () => {
      const result = verifier.verify(validDoc);
      expect(createHash).toHaveBeenCalledWith('sha256');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDigest).toHaveBeenCalledWith('hex');
      expect(result.evidenceHash).toBe('mockedhash1234567890abcdef1234567890abcdef1234567890abcdef123456');
    });

    test('should update stats on successful verification', () => {
      verifier.verify(validDoc);
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(1);
      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    test('should update stats on failed verification', () => {
      verifier.verify({ ...validDoc, contentHash: 'invalid' });
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(1);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(1);
    });

    test('should calculate correct score for partially passing checks', () => {
      const doc = { ...validDoc, issuer: 'unknown-issuer' };
      const result = verifier.verify(doc);
      expect(result.score).toBe(75);
    });

    test('should fail format check with invalid mime type', () => {
      const doc = { ...validDoc, mimeType: 'application/unknown' };
      const result = verifier.verify(doc);
      const formatCheck = result.checks.find(c => c.name === 'format');
      expect(formatCheck?.passed).toBe(false);
      expect(formatCheck?.details).toContain('invalid');
    });

    test('should fail format check with size below minimum', () => {
      const doc = { ...validDoc, size: 50 };
      const result = verifier.verify(doc);
      const formatCheck = result.checks.find(c => c.name === 'format');
      expect(formatCheck?.passed).toBe(false);
      expect(formatCheck?.details).toContain('out of bounds');
    });

    test('should fail format check with size above maximum', () => {
      const doc = { ...validDoc, size: 100_000_000 };
      const result = verifier.verify(doc);
      const formatCheck = result.checks.find(c => c.name === 'format');
      expect(formatCheck?.passed).toBe(false);
    });

    test('should fail freshness check with future issuedAt date', () => {
      const doc = { ...validDoc, issuedAt: new Date(Date.now() + 86400000) };
      const result = verifier.verify(doc);
      const freshnessCheck = result.checks.find(c => c.name === 'freshness');
      expect(freshnessCheck?.passed).toBe(false);
    });

    test('should fail freshness check with age exceeding maxAgeYears', () => {
      const doc = { ...validDoc, issuedAt: new Date('2010-01-01') };
      const result = verifier.verify(doc);
      const freshnessCheck = result.checks.find(c => c.name === 'freshness');
      expect(freshnessCheck?.passed).toBe(false);
    });

    test('should fail hash check with non-hex characters', () => {
      const doc = { ...validDoc, contentHash: 'g'.repeat(64) };
      const result = verifier.verify(doc);
      const hashCheck = result.checks.find(c => c.name === 'hash');
      expect(hashCheck?.passed).toBe(false);
    });

    test('should fail hash check with wrong length', () => {
      const doc = { ...validDoc, contentHash: 'a'.repeat(63) };
      const result = verifier.verify(doc);
      const hashCheck = result.checks.find(c => c.name === 'hash');
      expect(hashCheck?.passed).toBe(false);
    });

    test('should fail type check with unrecognized docType', () => {
      const doc = { ...validDoc, docType: 'unknown-type' };
      const result = verifier.verify(doc);
      const typeCheck = result.checks.find(c => c.name === 'type');
      expect(typeCheck?.passed).toBe(false);
    });

    test('should pass expiry check when expiresAt is in future', () => {
      const doc = { ...validDoc, expiresAt: new Date(Date.now() + 86400000) };
      const result = verifier.verify(doc);
      const expiryCheck = result.checks.find(c => c.name === 'expiry');
      expect(expiryCheck?.passed).toBe(true);
    });

    test('should include verifierVersion in result', () => {
      const result = verifier.verify(validDoc);
      expect(result.verifierVersion).toBe('1.0.0');
    });

    test('should include verifiedAt timestamp in result', () => {
      const before = new Date();
      const result = verifier.verify(validDoc);
      const after = new Date();
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.verifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.verifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('verifyBatch', () => {
    test('should verify multiple documents', () => {
      const docs = [validDoc, { ...validDoc, docId: 'doc-456' }];
      const results = verifier.verifyBatch(docs);
      expect(results).toHaveLength(2);
      expect(results[0].docId).toBe('doc-123');
      expect(results[1].docId).toBe('doc-456');
    });

    test('should return empty array for empty input', () => {
      const results = verifier.verifyBatch([]);
      expect(results).toHaveLength(0);
    });

    test('should update stats for batch verification', () => {
      const docs = [validDoc, { ...validDoc, contentHash: 'invalid' }];
      verifier.verifyBatch(docs);
      const stats = verifier.getVerificationStats();
      expect(stats.total).toBe(2);
      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('getVerificationStats', () => {
    test('should return zero stats for new verifier', () => {
      const stats = verifier.getVerificationStats();
      expect(stats).toEqual({ total: 0, passed: 0, failed: 0, avgScore: 0 });
    });

    test('should calculate average score correctly', () => {
      verifier.verify(validDoc);
      verifier.verify({ ...validDoc, issuer: 'unknown-issuer' });
      const stats = verifier.getVerificationStats();
      expect(stats.avgScore).toBe(87.5);
    });

    test('should round average score to 2 decimal places', () => {
      const v = new DocumentVerifier();
      v.verify({ ...validDoc, issuer: 'unknown-issuer' });
      const stats = v.getVerificationStats();
      expect(stats.avgScore).toBe(75);
    });

    test('should handle single verification for average', () => {
      verifier.verify(validDoc);
      const stats = verifier.getVerificationStats();
      expect(stats.avgScore).toBe(100);
    });
  });

  describe('edge cases and boundary values', () => {
    test('should handle document at exact minDocSize boundary', () => {
      const v = new DocumentVerifier({ minDocSize: 100 });
      const doc = { ...validDoc, size: 100 };
      const result = v.verify(doc);
      expect(result.checks.find(c => c.name === 'format')?.passed).toBe(true);
    });

    test('should handle document at exact maxDocSize boundary', () => {
      const v = new DocumentVerifier({ maxDocSize: 1000 });
      const doc = { ...validDoc, size: 1000 };
      const result = v.verify(doc);
      expect(result.checks.find(c => c.name === 'format')?.passed).toBe(true);
    });

    test('should handle document just below minDocSize', () => {
      const v = new DocumentVerifier({ minDocSize: 100 });
      const doc = { ...validDoc, size: 99 };
      const result = v.verify(doc);
      expect(result.checks.find(c => c.name === 'format')?.passed).toBe(false);
    });

    test('should handle document just above maxDocSize', () => {
      const v = new DocumentVerifier({ maxDocSize: 1000 });
      const doc = { ...validDoc, size: 1001 };
      const result = v.verify(doc);
      expect(result.checks.find(c => c.name === 'format')?.passed).toBe(false);
    });

    test('should handle maxAgeYears boundary for freshness', () => {
      const maxAgeYears = 5;
      const v = new DocumentVerifier({ maxAgeYears });
      const exactBoundary = new Date(Date.now() - maxAgeYears * 365.25 * 24 * 60 * 60 * 1000);
      const doc = { ...validDoc, issuedAt: exactBoundary };
      const result = v.verify(doc);
      expect(result.checks.find(c => c.name === 'freshness')?.passed).toBe(true);
    });

    test('should handle all allowed document types', () => {
      const types = ['invoice', 'deed', 'certificate', 'appraisal', 'insurance', 'lease', 'audit'];
      types.forEach(type => {
        const doc = { ...validDoc, docType: type };
        const result = verifier.verify(doc);
        expect(result.checks.find(c => c.name === 'type')?.passed).toBe(true);
      });
    });

    test('should handle all allowed mime types', () => {
      const mimes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/json', 'application/xml'];
      mimes.forEach(mime => {
        conststo  = new DocumentVerifier();
        const doc = { ...validDoc, mimeType: mime };
        const result = verifier.verify(doc);
        expect(result.checks.find(c => c.name === 'format')?.passed).toBe(true);
      });
    });

    test('should handle hash with mixed case hex', () => {
      const doc = { ...validDoc, contentHash: 'A'.repeat(64) };
      const result = verifier.verify(doc);
      expect(result.checks.find(c => c.name === 'hash')?.passed).toBe(true);
    });

    test('should handle hash with mixed case hex lowercase', () => {
      const doc = { ...validDoc, contentHash: 'a'.repeat(64) };
      const result = verifier.verify(doc);
      expect(result.checks.find(c => c.name === 'hash')?.passed).toBe(true);
    });

    test('should handle expiresAt exactly at current time', () => {
      const now = new Date();
      const doc = { ...validDoc, expiresAt: now };
      const result = verifier.verify(doc);
      const expiryCheck = result.checks.find(c => c.name === 'expiry');
      expect(expiryCheck?.passed).toBe(false);
    });
  });

  describe('strict mode behavior', () => {
    test('should require score >= 80 in strict mode', () => {
      const v = new DocumentVerifier({ strictMode: true });
      const doc = { ...validDoc, issuer: 'unknown-issuer' };
      const result = v.verify(doc);
      expect(result.verified).toBe(false);
      expect(result.score).toBe(75);
    });

    test('should pass in strict mode with score >= 80', () => {
      const v = new DocumentVerifier({ strictMode: true });
      const result = v.verify(validDoc);
      expect(result.verified).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe('required checks configuration', () => {
    test('should allow custom required checks', () => {
      const v = new DocumentVerifier({ requiredChecks: ['format', 'hash'] });
      const doc = { ...validDoc, issuer: 'unknown-issuer' };
      const result = v.verify(doc);
      expect(result.verified).toBe(true);
    });

    test('should fail when custom required check fails', () => {
      const v = new DocumentVerifier({ requiredChecks: ['format', 'hash'] });
      const doc = { ...validDoc, mimeType: 'invalid' };
      const result = v.verify(doc);
      expect(result.verified).toBe(false);
    });
  });
});
