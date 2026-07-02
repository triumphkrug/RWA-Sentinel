import { createHash } from 'crypto';
import { OracleManager } from '../agent/src/publisher/oracleManager';

describe('OracleManager', () => {
  let oracleManager: OracleManager;
  const mockConfig = {
    minStake: 1000,
    slashPercent: 10,
    maxDeviation: 5,
    minReportsForConsensus: 3,
    reputationDecayRate: 0.01,
    suspensionThreshold: 3,
  };

  beforeEach(() => {
    oracleManager = new OracleManager(mockConfig);
  });

  describe('Constructor', () => {
    test('should initialize with default config when no config provided', () => {
      const manager = new OracleManager();
      expect(manager).toBeInstanceOf(OracleManager);
    });

    test('should initialize with provided config', () => {
      expect(oracleManager).toBeInstanceOf(OracleManager);
    });

    test('should set default values when partial config is provided', () => {
      const partialConfig = { minStake: 2000 };
      const manager = new OracleManager(partialConfig);
      expect(manager['config'].minStake).toBe(2000);
      expect(manager['config'].slashPercent).toBe(10);
    });
  });

  describe('registerOracle', () => {
    test('should register a new oracle successfully', () => {
      const oracle = oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
      expect(oracle).toEqual({
        oracleId: 'oracle1',
        name: 'Oracle One',
        endpoint: 'http://oracle1.com',
        stake: 1500,
        reputation: 50,
        totalReports: 0,
        slashedCount: 0,
        lastReportAt: null,
        status: 'active',
        registeredAt: expect.any(Date),
      });
      expect(oracleManager['oracles'].has('oracle1')).toBe(true);
    });

    test('should throw error when oracle already registered', () => {
      oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
      expect(() => {
        oracleManager.registerOracle('oracle1', 'Duplicate', 'http://duplicate.com', 2000);
      }).toThrow('Oracle oracle1 already registered');
    });

    test('should throw error when stake is below minimum', () => {
      expect(() => {
        oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 500);
      }).toThrow('Stake 500 below minimum 1000');
    });

    test('should initialize consecutiveSlashes counter for new oracle', () => {
      oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
      expect(oracleManager['consecutiveSlashes'].get('oracle1')).toBe(0);
    });
  });

  describe('submitReport', () => {
    let oracle: any;

    beforeEach(() => {
      oracle = oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
    });

    test('should submit a report successfully', () => {
      const report = {
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      };
      oracleManager.submitReport(report);
      expect(oracleManager['reports'].get('BTC')).toEqual([report]);
      expect(oracle.totalReports).toBe(1);
      expect(oracle.lastReportAt).toBe(report.timestamp);
    });

    test('should throw error when oracle not found', () => {
      const report = {
        oracleId: 'nonexistent',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      };
      expect(() => {
        oracleManager.submitReport(report);
      }).toThrow('Oracle nonexistent not found');
    });

    test('should throw error when oracle is suspended', () => {
      oracle.status = 'suspended';
      oracleManager['oracles'].set('oracle1', oracle);
      const report = {
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      };
      expect(() => {
        oracleManager.submitReport(report);
      }).toThrow('Oracle oracle1 is suspended');
    });

    test('should add report to existing asset reports', () => {
      const report1 = {
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      };
      const report2 = {
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50001,
        confidence: 0.96,
        timestamp: new Date(),
        sourceHash: 'hash2',
      };
      oracleManager.submitReport(report1);
      oracleManager.submitReport(report2);
      expect(oracleManager['reports'].get('BTC')).toEqual([report1, report2]);
    });
  });

  describe('computeConsensus', () => {
    let oracle1: any, oracle2: any, oracle3: any;

    beforeEach(() => {
      oracle1 = oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
      oracle2 = oracleManager.registerOracle('oracle2', 'Oracle Two', 'http://oracle2.com', 2000);
      oracle3 = oracleManager.registerOracle('oracle3', 'Oracle Three', 'http://oracle3.com', 2500);
    });

    test('should compute consensus with minimum required reports', () => {
      const now = new Date();
      oracleManager.submitReport({
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: now,
        sourceHash: 'hash1',
      });
      oracleManager.submitReport({
        oracleId: 'oracle2',
        assetId: 'BTC',
        price: 50001,
        confidence: 0.96,
        timestamp: now,
        sourceHash: 'hash2',
      });
      oracleManager.submitReport({
        oracleId: 'oracle3',
        assetId: 'BTC',
        price: 50002,
        confidence: 0.97,
        timestamp: now,
        sourceHash: 'hash3',
      });

      const result = oracleManager.computeConsensus('BTC');
      expect(result.assetId).toBe('BTC');
      expect(result.reportCount).toBe(3);
      expect(result.outliers).toEqual([]);
      expect(result.consensusPrice).toBeGreaterThanOrEqual(50000);
      expect(result.consensusPrice).toBeLessThanOrEqual(50002);
    });

    test('should throw error when insufficient reports for consensus', () => {
      oracleManager.submitReport({
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      });
      expect(() => {
        oracleManager.computeConsensus('BTC');
      }).toThrow('Insufficient reports for consensus: 1 < 3');
    });

    test('should exclude outliers from consensus calculation', () => {
      const now = new Date();
      oracleManager.submitReport({
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: now,
        sourceHash: 'hash1',
      });
      oracleManager.submitReport({
        oracleId: 'oracle2',
        assetId: 'BTC',
        price: 50001,
        confidence: 0.96,
        timestamp: now,
        sourceHash: 'hash2',
      });
      oracleManager.submitReport({
        oracleId: 'oracle3',
        assetId: 'BTC',
        price: 55000, // Outlier
        confidence: 0.97,
        timestamp: now,
        sourceHash: 'hash3',
      });

      const result = oracleManager.computeConsensus('BTC');
      expect(result.outliers).toContain('oracle3');
      expect(result.reportCount).toBe(2);
    });

    test('should handle single report as median when odd number of reports', () => {
      const now = new Date();
      oracleManager.submitReport({
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: now,
        sourceHash: 'hash1',
      });
      oracleManager.submitReport({
        oracleId: 'oracle2',
        assetId: 'BTC',
        price: 50001,
        confidence: 0.96,
        timestamp: now,
        sourceHash: 'hash2',
      });
      oracleManager.submitReport({
        oracleId: 'oracle3',
        assetId: 'BTC',
        price: 50002,
        confidence: 0.97,
        timestamp: now,
        sourceHash: 'hash3',
      });
      oracleManager.submitReport({
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50003,
        confidence: 0.98,
        timestamp: now,
        sourceHash: 'hash4',
      });

      const result = oracleManager.computeConsensus('BTC');
      expect(result.reportCount).toBe(4);
    });
  });

  describe('computeMedian', () => {
    test('should compute median for odd number of values', () => {
      const values = [1, 3, 2];
      const median = oracleManager['computeMedian'](values);
      expect(median).toBe(2);
    });

    test('should compute median for even number of values', () => {
      const values = [1, 3, 2, 4];
      const median = oracleManager['computeMedian'](values);
      expect(median).toBe(2.5);
    });

    test('should return single value as median', () => {
      const values = [42];
      const median = oracleManager['computeMedian'](values);
      expect(median).toBe(42);
    });

    test('should sort values before computing median', () => {
      const values = [5, 1, 3, 2, 4];
      const median = oracleManager['computeMedian'](values);
      expect(median).toBe(3);
    });
  });

  describe('computeMAD', () => {
    test('should compute median absolute deviation', () => {
      const values = [1, 2, 3, 4, 5];
      const median = 3;
      const mad = oracleManager['computeMAD'](values, median);
      expect(mad).toBe(1.6);
    });

    test('should return 0 when all values are same', () => {
      const values = [5, 5, 5];
      const median = 5;
      const mad = oracleManager['computeMAD'](values, median);
      expect(mad).toBe(0);
    });

    test('should handle empty array', () => {
      const values: number[] = [];
      const median = 0;
      const mad = oracleManager['computeMAD'](values, median);
      expect(mad).toBe(0);
    });
  });

  describe('Oracle Status Management', () => {
    let oracle: any;

    beforeEach(() => {
      oracle = oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
    });

    test('should suspend oracle after suspension threshold is reached', () => {
      for (let i = 0; i < mockConfig.suspensionThreshold; i++) {
        oracleManager['consecutiveSlashes'].set('oracle1', i + 1);
        oracleManager['slashOracle']('oracle1', 100, 'test reason', 'evidence');
      }
      expect(oracle.status).toBe('suspended');
    });

    test('should not allow reporting when oracle is suspended', () => {
      oracle.status = 'suspended';
      oracleManager['oracles'].set('oracle1', oracle);
      const report = {
        oracleId: 'oracle1',
        assetId: 'BTC',
        price: 50000,
        confidence: 0.95,
        timestamp: new Date(),
        sourceHash: 'hash1',
      };
      expect(() => {
        oracleManager.submitReport(report);
      }).toThrow('Oracle oracle1 is suspended');
    });

    test('should reset consecutive slashes when oracle is not slashed', () => {
      oracleManager['consecutiveSlashes'].set('oracle1', 2);
      oracleManager['slashOracle']('oracle1', 0, 'test reason', 'evidence'); // Not a slash
      expect(oracleManager['consecutiveSlashes'].get('oracle1')).toBe(0);
    });
  });

  describe('Config Management', () => {
    test('should use default minReportsForConsensus', () => {
      expect(oracleManager['config'].minReportsForConsensus).toBe(3);
    });

    test('should allow custom minReportsForConsensus', () => {
      const customConfig = { minReportsForConsensus: 5 };
      const manager = new OracleManager(customConfig);
      expect(manager['config'].minReportsForConsensus).toBe(5);
    });

    test('should use default maxDeviation', () => {
      expect(oracleManager['config'].maxDeviation).toBe(5);
    });

    test('should allow custom maxDeviation', () => {
      const customConfig = { maxDeviation: 10 };
      const manager = new OracleManager(customConfig);
      expect(manager['config'].maxDeviation).toBe(10);
    });
  });

  describe('Reputation System', () => {
    let oracle: any;

    beforeEach(() => {
      oracle = oracleManager.registerOracle('oracle1', 'Oracle One', 'http://oracle1.com', 1500);
    });

    test('should initialize oracle with default reputation', () => {
      expect(oracle.reputation).toBe(50);
    });

    test('should decrease reputation on slash', () => {
      const initialReputation = oracle.reputation;
      oracleManager['slashOracle']('oracle1', 100, 'test reason', 'evidence');
      expect(oracle.reputation).toBeLessThan(initialReputation);
    });

    test('should apply reputation decay over time', () => {
      const initialReputation = oracle.reputation;
      oracleManager['applyReputationDecay']('oracle1');
      expect(oracle.reputation).toBeLessThan(initialReputation);
    });
  });
});
