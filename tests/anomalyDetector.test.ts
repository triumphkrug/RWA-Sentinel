import { createHash } from 'crypto';
import { AnomalyDetector, PriceFeedEntry, AnomalyResult, DetectorConfig } from '../agent/src/validator/anomalyDetector';

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash'),
  }),
}));

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;
  const mockAssetId = 'BTC-USD';
  const mockSource = 'test-source';

  beforeEach(() => {
    detector = new AnomalyDetector();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default config when no config provided', () => {
      expect(detector).toBeInstanceOf(AnomalyDetector);
      const config = (detector as any).config;
      expect(config.windowSize).toBe(30);
      expect(config.zScoreThreshold).toBe(2.5);
      expect(config.volumeMultiplier).toBe(3);
      expect(config.stalenessMinutes).toBe(60);
      expect(config.minDataPoints).toBe(10);
      expect(config.ewmaAlpha).toBe(0.1);
    });

    test('should override default config with provided values', () => {
      const customConfig: Partial<DetectorConfig> = {
        windowSize: 50,
        zScoreThreshold: 3,
        volumeMultiplier: 5,
      };
      detector = new AnomalyDetector(customConfig);
      const config = (detector as any).config;
      expect(config.windowSize).toBe(50);
      expect(config.zScoreThreshold).toBe(3);
      expect(config.volumeMultiplier).toBe(5);
    });
  });

  describe('ingestPrice', () => {
    test('should add entry to price history for new asset', () => {
      const entry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const history = (detector as any).priceHistory.get(mockAssetId);
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(entry);
    });

    test('should add entry to existing price history for asset', () => {
      const firstEntry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      const secondEntry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 101,
        volume: 1010,
        timestamp: new Date(),
      };
      detector.ingestPrice(firstEntry);
      detector.ingestPrice(secondEntry);
      const history = (detector as any).priceHistory.get(mockAssetId);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(firstEntry);
      expect(history[1]).toEqual(secondEntry);
    });

    test('should maintain window size by removing oldest entry when limit exceeded', () => {
      const config: Partial<DetectorConfig> = { windowSize: 2 };
      detector = new AnomalyDetector(config);
      const entries: PriceFeedEntry[] = Array.from({ length: 5 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100 + i,
        volume: 1000 + i * 100,
        timestamp: new Date(),
      }));
      entries.forEach(entry => detector.ingestPrice(entry));
      const history = (detector as any).priceHistory.get(mockAssetId);
      expect(history).toHaveLength(2);
      expect(history[0].price).toBe(103);
      expect(history[1].price).toBe(104);
    });
  });

  describe('ingestBatch', () => {
    test('should ingest multiple entries for same asset', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 3 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100 + i,
        volume: 1000 + i * 100,
        timestamp: new Date(),
      }));
      detector.ingestBatch(entries);
      const history = (detector as any).priceHistory.get(mockAssetId);
      expect(history).toHaveLength(3);
    });

    test('should ingest entries for multiple assets', () => {
      const btcEntry: PriceFeedEntry = {
        source: mockSource,
        assetId: 'BTC-USD',
        price: 50000,
        volume: 2000,
        timestamp: new Date(),
      };
      const ethEntry: PriceFeedEntry = {
        source: mockSource,
        assetId: 'ETH-USD',
        price: 3000,
        volume: 5000,
        timestamp: new Date(),
      };
      detector.ingestBatch([btcEntry, ethEntry]);
      expect((detector as any).priceHistory.get('BTC-USD')).toHaveLength(1);
      expect((detector as any).priceHistory.get('ETH-USD')).toHaveLength(1);
    });
  });

  describe('detectAnomalies', () => {
    test('should return empty array when no history for asset', () => {
      const results = detector.detectAnomalies(mockAssetId);
      expect(results).toEqual([]);
    });

    test('should return empty array when insufficient data points', () => {
      const entry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const results = detector.detectAnomalies(mockAssetId);
      expect(results).toEqual([]);
    });

    test('should detect price spike anomaly', () => {
      // 14 stable entries around 100, last one a genuine outlier spike -> z-score ~3.74 (> 2.5 threshold)
      const entries: PriceFeedEntry[] = Array.from({ length: 14 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      entries.push({
        source: mockSource,
        assetId: mockAssetId,
        price: 200,
        volume: 1000,
        timestamp: new Date(),
      });
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      const spike = results.find((r) => r.anomalyType === 'spike');
      expect(spike).toBeDefined();
      expect(spike?.isAnomaly).toBe(true);
    });

    test('should detect price drop anomaly', () => {
      // 14 stable entries around 200, last one a genuine outlier drop -> z-score ~-3.74 (below -2.5 threshold)
      const entries: PriceFeedEntry[] = Array.from({ length: 14 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 200,
        volume: 1000,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      entries.push({
        source: mockSource,
        assetId: mockAssetId,
        price: 50,
        volume: 1000,
        timestamp: new Date(),
      });
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      const drop = results.find((r) => r.anomalyType === 'drop');
      expect(drop).toBeDefined();
      expect(drop?.isAnomaly).toBe(true);
    });

    test('should detect volume surge anomaly', () => {
      // 14 entries at stable volume 1000, last entry at 10x average -> multiplier ~6.25 (> 3x threshold)
      const entries: PriceFeedEntry[] = Array.from({ length: 14 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      entries.push({
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 10000,
        timestamp: new Date(),
      });
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      const surge = results.find((r) => r.anomalyType === 'volume-surge');
      expect(surge).toBeDefined();
      expect(surge?.isAnomaly).toBe(true);
    });

    test('should detect stale feed anomaly', () => {
      const config: Partial<DetectorConfig> = { stalenessMinutes: 1 };
      detector = new AnomalyDetector(config);
      const oldDate = new Date(Date.now() - 2 * 60 * 1000);
      const entry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 100,
        volume: 1000,
        timestamp: oldDate,
      };
      detector.ingestPrice(entry);
      const results = detector.detectAnomalies(mockAssetId);
      expect(results).toHaveLength(1);
      expect(results[0].anomalyType).toBe('stale-feed');
      expect(results[0].isAnomaly).toBe(true);
    });

    test('should detect manipulation anomaly', () => {
      // Two distinct sources reporting for the same asset with >5% divergence between their means
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: i % 2 === 0 ? 'source-a' : 'source-b',
        assetId: mockAssetId,
        price: i % 2 === 0 ? 100 : 130,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      const manipulation = results.find((r) => r.anomalyType === 'manipulation');
      expect(manipulation).toBeDefined();
      expect(manipulation?.isAnomaly).toBe(true);
    });

    test('should return multiple anomalies when multiple conditions met', () => {
      // 14 stable entries split across two divergent sources (manipulation), plus a
      // final volume outlier (volume-surge) -> at least two independent detectors fire
      const entries: PriceFeedEntry[] = Array.from({ length: 14 }, (_, i) => ({
        source: i % 2 === 0 ? 'source-a' : 'source-b',
        assetId: mockAssetId,
        price: i % 2 === 0 ? 100 : 130,
        volume: 1000,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      entries.push({
        source: 'source-a',
        assetId: mockAssetId,
        price: 100,
        volume: 10000,
        timestamp: new Date(),
      });
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test('should not detect anomalies when no anomalies present', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100 + i,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies(mockAssetId);
      expect(results).toEqual([]);
    });
  });

  describe('detectPriceSpike', () => {
    test('should return null when insufficient data points', () => {
      const entry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 200,
        volume: 2000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const result = (detector as any).detectPriceSpike(mockAssetId);
      expect(result).toBeNull();
    });

    test('should return null when z-score below threshold', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100 + i,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const result = (detector as any).detectPriceSpike(mockAssetId);
      expect(result).toBeNull();
    });

    test('should return anomaly result when z-score above threshold', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: i < 14 ? 100 : 200,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const result = (detector as any).detectPriceSpike(mockAssetId);
      expect(result).not.toBeNull();
      expect(result?.anomalyType).toBe('spike');
      expect(result?.isAnomaly).toBe(true);
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.anomalyScore).toBeGreaterThan(0);
    });

    test('should cap anomaly score at 100', () => {
      const config: Partial<DetectorConfig> = { zScoreThreshold: 1 };
      detector = new AnomalyDetector(config);
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: i < 14 ? 100 : 300,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const result = (detector as any).detectPriceSpike(mockAssetId);
      expect(result?.anomalyScore).toBe(100);
    });
  });

  describe('detectPriceDrop', () => {
    test('should return null when insufficient data points', () => {
      const entry: PriceFeedEntry = {
        source: mockSource,
        assetId: mockAssetId,
        price: 50,
        volume: 500,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const result = (detector as any).detectPriceDrop(mockAssetId);
      expect(result).toBeNull();
    });

    test('should return null when z-score above negative threshold', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: 100 + i,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const result = (detector as any).detectPriceDrop(mockAssetId);
      expect(result).toBeNull();
    });

    test('should return anomaly result when z-score below negative threshold', () => {
      const entries: PriceFeedEntry[] = Array.from({ length: 15 }, (_, i) => ({
        source: mockSource,
        assetId: mockAssetId,
        price: i < 14 ? 100 : 50,
        volume: 1000 + i * 100,
        timestamp: new Date(Date.now() - (15 - i) * 60000),
      }));
      detector.ingestBatch(entries);
      const result = (detector as any).detectPriceDrop(mockAssetId);
      expect(result).not.toBeNull();
      expect(result?.anomalyType).toBe('drop');
      expect(result?.isAnomaly).toBe(true);
    });
  });

  describe('hashEvidence', () => {
    test('should generate consistent hash for same input', () => {
      const result: Omit<AnomalyResult, 'evidenceHash'> = {
        assetId: mockAssetId,
        anomalyScore: 75,
        isAnomaly: true,
        anomalyType: 'spike',
        confidence: 0.8,
        windowSize: 15,
        deviation: 50,
        detectedAt: new Date(),
        details: 'Test evidence',
      };
      const hash1 = (detector as any).hashEvidence(result);
      const hash2 = (detector as any).hashEvidence(result);
      expect(hash1).toBe(hash2);
    });

    test('should use crypto.createHash with sha256', () => {
      const result: Omit<AnomalyResult, 'evidenceHash'> = {
        assetId: mockAssetId,
        anomalyScore: 75,
        isAnomaly: true,
        anomalyType: 'spike',
        confidence: 0.8,
        windowSize: 15,
        deviation: 50,
        detectedAt: new Date(),
        details: 'Test evidence',
      };
      (detector as any).hashEvidence(result);
      expect(createHash).toHaveBeenCalledWith('sha256');
    });
  });

  describe('computeZScore', () => {
    test('should compute correct z-score for normal distribution', () => {
      const values = [100, 101, 102, 99, 100];
      const current = 120;
      const zScore = (detector as any).computeZScore(values, current);
      // Population stddev of [100,101,102,99,100] is ~1.0198; (120-100.4)/1.0198 ~= 19.22
      expect(zScore).toBeCloseTo(19.22, 1);
    });

    test('should return 0 when all values are same', () => {
      const values = [100, 100, 100, 100];
      const current = 100;
      const zScore = (detector as any).computeZScore(values, current);
      expect(zScore).toBe(0);
    });
  });
});
