import { createHash } from 'crypto';
import { AnomalyDetector, PriceFeedEntry, AnomalyResult, DetectorConfig } from '../../validator/anomalyDetector';

jest.mock('crypto", () => ({
  createHash: jest.fn(),
}));

describe("AnomalyDetector", () => {
  let detector: AnomalyDetector;
  let mockCreateHash: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDigest: jest.Mock;

  const defaultConfig: DetectorConfig = {
    windowSize: 30,
    zScoreThreshold: 2.5,
    volumeMultiplier: 3,
    stalenessMinutes: 60,
    minDataPoints: 10,
    ewmaAlpha: 0.1,
  };

  const createMockHash = () => {
    mockDigest = jest.fn().mockReturnValue("mockedhash1234567890abcdef");
    mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
    mockCreateHash = jest.fn().mockReturnValue({ update: mockUpdate });
    (createHash as jest.Mock).mockImplementation(mockCreateHash);
  };

  const generatePriceEntries = (
    assetId: string,
    count: number,
    price: number = 100,
    volume: number = 1000,
    source: string = "source1"
  ): PriceFeedEntry[] => {
    const entries: PriceFeedEntry[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      entries.push({
        source,
        assetId,
        price,
        volume,
        timestamp: new Date(now.getTime() - (count - i) * 60000),
      });
    }
    return entries;
  };

  const generatePriceEntriesWithVariation = (
    assetId: string,
    count: number,
    prices: number[],
    volumes: number[] = [],
    source: string = "source1"
  ): PriceFeedEntry[] => {
    const entries: PriceFeedEntry[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      entries.push({
        source,
        assetId,
        price: prices[i] ?? 100,
        volume: volumes[i] ?? 1000,
        timestamp: new Date(now.getTime() - (count - i) * 60000),
      });
    }
    return entries;
  };

  beforeEach(() => {
    createMockHash();
    detector = new AnomalyDetector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    test("should create detector with default config when no config provided", () => {
      const detector = new AnomalyDetector();
      expect(detector).toBeDefined();
    });

    test("should create detector with partial config merged with defaults", () => {
      const detector = new AnomalyDetector({ windowSize: 50 });
      expect(detector).toBeDefined();
    });

    test("should create detector with fully custom config", () => {
      const customConfig: DetectorConfig = {
        windowSize: 20,
        zScoreThreshold: 3.0,
        volumeMultiplier: 5,
        stalenessMinutes: 30,
        minDataPoints: 5,
        ewmaAlpha: 0.2,
      };
      const detector = new AnomalyDetector(customConfig);
      expect(detector).toBeDefined();
    });

    test("should create detector with empty object and still use defaults", () => {
      const detector = new AnomalyDetector({});
      expect(detector).toBeDefined();
    });
  });

  describe("ingestPrice", () => {
    test("should add entry to new asset history", () => {
      const entry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 50000,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(1);
    });

    test("should maintain window size limit by removing oldest entries", () => {
      const detector = new AnomalyDetector({ windowSize: 5 });
      const entries = generatePriceEntries("BTC", 10);
      entries.forEach((e) => detector.ingestPrice(e));
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(5);
    });

    test("should append to existing history for same asset", () => {
      const entry1: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 50000,
        volume: 1000,
        timestamp: new Date(),
      };
      const entry2: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 51000,
        volume: 1200,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry1);
      detector.ingestPrice(entry2);
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(2);
    });
  });

  describe("ingestBatch", () => {
    test("should ingest multiple entries in batch", () => {
      const entries = generatePriceEntries("BTC", 5);
      detector.ingestBatch(entries);
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(5);
    });

    test("should handle empty batch", () => {
      detector.ingestBatch([]);
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(0);
    });

    test("should ingest batch with multiple assets", () => {
      const entries = [
        ...generatePriceEntries("BTC", 3),
        ...generatePriceEntries("ETH", 3),
      ];
      detector.ingestBatch(entries);
      expect(detector.getStats("BTC").count).toBe(3);
      expect(detector.getStats("ETH").count).toBe(3);
    });
  });

  describe("detectPriceSpike", () => {
    test("should return null when insufficient data points", () => {
      const entries = generatePriceEntries("BTC", 5);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).toBeNull();
    });

    test("should return null when no history exists", () => {
      const result = detector.detectPriceSpike("NONEXISTENT");
      expect(result).toBeNull();
    });

    test("should detect price spike when z-score exceeds threshold", () => {
      const prices = Array(10).fill(100);
      prices[9] = 200;
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).not.toBeNull();
      expect(result!.anomalyType).toBe("spike");
      expect(result!.isAnomaly).toBe(true);
    });

    test("should return null when z-score does not exceed threshold", () => {
      const prices = Array(10).fill(100);
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).toBeNull();
    });

    test("should cap anomaly score at 100", () => {
      const prices = Array(10).fill(100);
      prices[9] = 10000;
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result!.anomalyScore).toBe(100);
    });
  });

  describe("detectPriceDrop", () => {
    test("should return null when insufficient data points", () => {
      const entries = generatePriceEntries("BTC", 5);
      detector.ingestBatch(entries);
      const result = detector.detectPriceDrop("BTC");
      expect(result).toBeNull();
    });

    test("should detect price drop when z-score below negative threshold", () => {
      const prices = Array(10).fill(100);
      prices[9] = 10;
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceDrop("BTC");
      expect(result).not.toBeNull();
      expect(result!.anomalyType).toBe("drop");
    });

    test("should return null when z-score not below negative threshold", () => {
      const prices = Array(10).fill(100);
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceDrop("BTC");
      expect(result).toBeNull();
    });
  });

  describe("detectManipulation", () => {
    test("should return null when insufficient data points", () => {
      const entries = generatePriceEntries("BTC", 5);
      detector.ingestBatch(entries);
      const result = detector.detectManipulation("BTC");
      expect(result).toBeNull();
    });

    test("should return null when only one source", () => {
      const entries = generatePriceEntries("BTC", 10, 100, 1000, "source1");
      detector.ingestBatch(entries);
      const result = detector.detectManipulation("BTC");
      expect(result).toBeNull();
    });

    test("should detect manipulation with multiple divergent sources", () => {
      const entries: PriceFeedEntry[] = [];
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        entries.push({
          source: "source1",
          assetId: "BTC",
          price: 100,
          volume: 1000,
          timestamp: new Date(now.getTime() - (10 - i) * 60000),
        });
        entries.push({
          source: "source2",
          assetId: "BTC",
          price: 200,
          volume: 1000,
          timestamp: new Date(now.getTime() - (10 - i) * 60000),
        });
      }
      detector.ingestBatch(entries);
      const result = detector.detectManipulation("BTC");
      expect(result).not.toBeNull();
      expect(result!.anomalyType).toBe("manipulation");
    });

    test("should return null when divergence is below threshold", () => {
      const entries: PriceFeedEntry[] = [];
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        entries.push({
          source: "source1",
          assetId: "BTC",
          price: 100,
          volume: 1000,
          timestamp: new Date(now.getTime() - (10 - i) * 60000),
        });
        entries.push({
          source: "source2",
          assetId: "BTC",
          price: 102,
          volume: 1000,
          timestamp: new Date(now.getTime() - (10 - i) * 60000),
        });
      }
      detector.ingestBatch(entries);
      const result = detector.detectManipulation("BTC");
      expect(result).toBeNull();
    });
  });

  describe("detectStaleFeed", () => {
    test("should return null when no history exists", () => {
      const result = detector.detectStaleFeed("NONEXISTENT");
      expect(result).toBeNull();
    });

    test("should return null when feed is not stale", () => {
      const entry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const result = detector.detectStaleFeed("BTC");
      expect(result).toBeNull();
    });

    test("should detect stale feed", () => {
      const staleEntry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 100,
        volume: 1000,
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
      };
      detector.ingestPrice(staleEntry);
      const result = detector.detectStaleFeed("BTC");
      expect(result).not.toBeNull();
      expect(result!.anomalyType).toBe("stale");
    });
  });

  describe("detectVolumeSurge", () => {
    test("should return null when insufficient data points", () => {
      const entries = generatePriceEntries("BTC", 5);
      detector.ingestBatch(entries);
      const result = detector.detectVolumeSurge("BTC");
      expect(result).toBeNull();
    });

    test("should detect volume surge", () => {
      const volumes = Array(9).fill(1000);
      volumes.push(10000);
      const entries = generatePriceEntriesWithVariation("BTC", 10, Array(10).fill(100), volumes);
      detector.ingestBatch(entries);
      const result = detector.detectVolumeSurge("BTC");
      expect(result).not.toBeNull();
      expect(result!.anomalyType).toBe("volume_surge");
    });

    test("should return null when volume multiplier not exceeded", () => {
      const volumes = Array(10).fill(1000);
      const entries = generatePriceEntriesWithVariation("BTC", 10, Array(10).fill(100), volumes);
      detector.ingestBatch(entries);
      const result = detector.detectVolumeSurge("BTC");
      expect(result).toBeNull();
    });
  });

  describe("detectAnomalies", () => {
    test("should return empty array when no anomalies detected", () => {
      const entries = generatePriceEntries("BTC", 10);
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies("BTC");
      expect(results).toEqual([]);
    });

    test("should return multiple anomalies when detected", () => {
      const prices = Array(9).fill(100);
      prices.push(200);
      const volumes = Array(9).fill(1000);
      volumes.push(10000);
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices, volumes);
      detector.ingestBatch(entries);
      const results = detector.detectAnomalies("BTC");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("scanAll", () => {
    test("should return empty map when no assets", () => {
      const results = detector.scanAll();
      expect(results.size).toBe(0);
    });

    test("should scan all assets with anomalies", () => {
      const prices = Array(9).fill(100);
      prices.push(200);
      const entries = generatePriceEntriesWithVariation("BTC", 10, [...prices]);
      const entries2 = generatePriceEntriesWithVariation("ETH", 10, [...prices]);
      detector.ingestBatch([...entries, ...entries2]);
      const results = detector.scanAll();
      expect(results.size).toBeGreaterThan(0);
    });

    test("should not include assets with no anomalies", () => {
      const entries = generatePriceEntries("BTC", 10);
      detector.ingestBatch(entries);
      const results = detector.scanAll();
      expect(results.size).toBe(0);
    });
  });

  describe("getEWMA", () => {
    test("should return 0 when no history", () => {
      const result = detector.getEWMA("NONEXISTENT");
      expect(result).toBe(0);
    });

    test("should return first price when single entry", () => {
      const entry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const result = detector.getEWMA("BTC");
      expect(result).toBe(100);
    });

    test("should compute EWMA correctly for multiple entries", () => {
      const entries = generatePriceEntriesWithVariation("BTC", 3, [100, 110, 120]);
      detector.ingestBatch(entries);
      const result = detector.getEWMA("BTC");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    test("should return zero stats for nonexistent asset", () => {
      const stats = detector.getStats("NONEXISTENT");
      expect(stats).toEqual({ mean: 0, stddev: 0, min: 0, max: 0, count: 0 });
    });

    test("should compute correct stats for single entry", () => {
      const entry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const stats = detector.getStats("BTC");
      expect(stats.mean).toBe(100);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(100);
      expect(stats.count).toBe(1);
    });

    test("should compute correct stats for multiple entries", () => {
      const entries = generatePriceEntriesWithVariation("BTC", 5, [10, 20, 30, 40, 50]);
      detector.ingestBatch(entries);
      const stats = detector.getStats("BTC");
      expect(stats.mean).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.count).toBe(5);
    });
  });

  describe("hashEvidence", () => {
    test("should call createHash with sha256", () => {
      const prices = Array(10).fill(100);
      prices[9] = 200;
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      detector.detectPriceSpike("BTC");
      expect(createHash).toHaveBeenCalledWith("sha256");
    });

    test("should generate consistent hash for same data", () => {
      const prices = Array(10).fill(100);
      prices[9] = 200;
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      detector.detectPriceSpike("BTC");
      expect(mockDigest).toHaveBeenCalled();
    });
  });

  describe("edge cases and boundary values", () => {
    test("should handle zero standard deviation in z-score calculation", () => {
      const entries = generatePriceEntries("BTC", 10, 100);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).toBeNull();
    });

    test("should handle very large prices values", () => {
      const entries = generatePriceEntries("BTC", 10, 1e15);
      detector.ingestBatch(entries);
      const stats = detector.getStats("BTC");
      expect(stats.mean).toBe(1e15);
    });

    test("should handle negative prices in stats", () => {
      const entries = generatePriceEntriesWithVariation("BTC", 5, [-100, -200, -300, -400, -500]);
      detector.ingestBatch(entries);
      const stats = detector.getStats("BTC");
      expect(stats.min).toBe(-500);
      expect(stats.max).toBe(-100);
    });

    test("should handle window size of 1", () => {
      const detector = new AnomalyDetector({ windowSize: 1 });
      const entry: PriceFeedEntry = {
        source: "source1",
        assetId: "BTC",
        price: 100,
        volume: 1000,
        timestamp: new Date(),
      };
      detector.ingestPrice(entry);
      const stats = detector.getStats("BTC");
      expect(stats.count).toBe(1);
    });

    test("should handle exactly minimum data points", () => {
      const prices = Array(9).fill(100);
      prices.push(200);
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).not.toBeNull();
    });

    test("should handle boundary z-score exactly at threshold", () => {
      const basePrice = 100;
      const stddev = 10;
      const thresholdPrice = basePrice + 2.5 * stddev;
      const prices = Array(9).fill(basePrice);
      prices.push(thresholdPrice);
      const entries = generatePriceEntriesWithVariation("BTC", 10, prices);
      detector.ingestBatch(entries);
      const result = detector.detectPriceSpike("BTC");
      expect(result).toBeNull();
    });
  });
});
