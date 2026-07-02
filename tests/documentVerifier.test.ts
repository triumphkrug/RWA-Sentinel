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
    contentHash: 'abc123',
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
    test('should register a new issuer', () => {
      verifier.registerIssuer('new-issuer', 'New Issuer', 0.9);
      const issuer = verifier['#knownIssuers'].get('new-issuer');
      expect(issuer).toEqual({ name: 'New Issuer', trustLevel: 0.9 });
    });

    test('should clamp trust level between 0 and 1', () => {
      verifier.registerIssuer('low-trust', 'Low Trust', -1);
      verifier.registerIssuer('high-trust', 'High Trust', 2);
      expect(verifier['#knownIssuers'].get('low-trust')?.trustLevel).toBe(0);
      expect(verifier['#knownIssuers'].get('high-trust')?.trustLevel).toBe(1);
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
      const lowScoreDoc = { ...mockDoc, size: 50 };
      const result = verifier.verify(lowScoreDoc);
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

    test('should fail in strict mode with score < 80', () => {
      const config = { strictMode: true };
      const customVerifier = new DocumentVerifier(config);
      const result = customVerifier.verify(mockDoc);
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

  describe('checkFormat', () => {
    test('should pass for allowed mime type', () => {
      const result = verifier['#checkFormat'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for disallowed mime type', () => {
      const invalidDoc = { ...mockDoc, mimeType: 'video/mp4' };
      const result = verifier['#checkFormat'](invalidDoc);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkFreshness', () => {
    test('should pass for recent document', () => {
      const result = verifier['#checkFreshness'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for old document', () => {
      const oldDoc = { ...mockDoc, issuedAt: new Date('2020-01-01') };
      const result = verifier['#checkFreshness'](oldDoc);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkIssuer', () => {
    test('should pass for known issuer', () => {
      const result = verifier['#checkIssuer'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for unknown issuer', () => {
      const unknownDoc = { ...mockDoc, issuer: 'unknown-issuer' };
      const result = verifier['#checkIssuer'](unknownDoc);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkHash', () => {
    test('should pass for matching hash', () => {
      const result = verifier['#checkHash'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for mismatched hash', () => {
      const invalidDoc = { ...mockDoc, contentHash: 'wrong-hash' };
      const result = verifier['#checkHash'](invalidDoc);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkType', () => {
    test('should pass for allowed type', () => {
      const result = verifier['#checkType'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for disallowed type', () => {
      const invalidDoc = { ...mockDoc, docType: 'unknown-type' };
      const result = verifier['#checkType'](invalidDoc);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkExpiry', () => {
    test('should pass for non-expired document', () => {
      const result = verifier['#checkExpiry'](mockDoc);
      expect(result.passed).toBe(true);
    });

    test('should fail for expired document', () => {
      const expiredDoc = { ...mockDoc, expiresAt: new Date('2020-01-01') };
      const result = verifier['#checkExpiry'](expiredDoc);
      expect(result.passed).toBe(false);
    });

    test('should pass for document without expiry', () => {
      const noExpiryDoc = { ...mockDoc, expiresAt: null };
      const result = verifier['#checkExpiry'](noExpiryDoc);
      expect(result.passed).toBe(true);
    });
  });
});
