import { createHash } from 'crypto';

interface PriceFeedEntry {
  source: string;
  assetId: string;
  price: number;
  volume: number;
  timestamp: Date;
}

interface AnomalyResult {
  assetId: string;
  anomalyScore: number;
  isAnomaly: boolean;
  anomalyType: string;
  confidence: number;
  windowSize: number;
  deviation: number;
  evidenceHash: string;
  detectedAt: Date;
  details: string;
}

interface DetectorConfig {
  windowSize: number;
  zScoreThreshold: number;
  volumeMultiplier: number;
  stalenessMinutes: number;
  minDataPoints: number;
  ewmaAlpha: number;
}

class AnomalyDetector {
  private priceHistory: Map<string, PriceFeedEntry[]>;
  private config: DetectorConfig;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.priceHistory = new Map();
    this.config = {
      windowSize: 30,
      zScoreThreshold: 2.5,
      volumeMultiplier: 3,
      stalenessMinutes: 60,
      minDataPoints: 10,
      ewmaAlpha: 0.1,
      ...config,
    };
  }

  ingestPrice(entry: PriceFeedEntry): void {
    // Validate input fields
    if (typeof entry.price !== 'number' || !Number.isFinite(entry.price) || entry.price < 0) {
      throw new Error('invalid price: must be a non-negative finite number');
    }
    if (typeof entry.volume !== 'number' || !Number.isFinite(entry.volume) || entry.volume < 0) {
      throw new Error('invalid volume: must be a non-negative finite number');
    }
    if (!(entry.timestamp instanceof Date) || isNaN(entry.timestamp.getTime())) {
      throw new Error('invalid timestamp: must be a valid Date');
    }
    if (typeof entry.assetId !== 'string' || entry.assetId.length === 0 || entry.assetId.length > 128) {
      throw new Error('invalid assetId: must be 1-128 chars');
    }
    if (typeof entry.source !== 'string' || entry.source.length === 0 || entry.source.length > 128) {
      throw new Error('invalid source: must be 1-128 chars');
    }
    const history = this.priceHistory.get(entry.assetId) ?? [];
    history.push(entry);
    while (history.length > this.config.windowSize) {
      history.shift();
    }
    this.priceHistory.set(entry.assetId, history);
  }

  ingestBatch(entries: PriceFeedEntry[]): void {
    for (const entry of entries) {
      this.ingestPrice(entry);
    }
  }

  detectAnomalies(assetId: string): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const detectors: (() => AnomalyResult | null)[] = [
      () => this.detectPriceSpike(assetId),
      () => this.detectPriceDrop(assetId),
      () => this.detectManipulation(assetId),
      () => this.detectStaleFeed(assetId),
      () => this.detectVolumeSurge(assetId),
    ];
    for (const detector of detectors) {
      const result = detector();
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  detectPriceSpike(assetId: string): AnomalyResult | null {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length < this.config.minDataPoints) return null;
    const prices = history.map((e) => e.price);
    const current = history[history.length - 1].price;
    const zScore = this.computeZScore(prices, current);
    if (zScore <= this.config.zScoreThreshold) return null;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviation = current - mean;
    const result: Omit<AnomalyResult, 'evidenceHash'> = {
      assetId,
      anomalyScore: Math.min(100, (zScore / this.config.zScoreThreshold) * 50),
      isAnomaly: true,
      anomalyType: 'spike',
      confidence: Math.min(1, zScore / (this.config.zScoreThreshold * 2)),
      windowSize: history.length,
      deviation,
      detectedAt: new Date(),
      details: `Price spike detected: z-score=${zScore.toFixed(2)}, current=${current}, mean=${mean.toFixed(2)}`,
    };
    return { ...result, evidenceHash: this.hashEvidence(result) };
  }

  detectPriceDrop(assetId: string): AnomalyResult | null {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length < this.config.minDataPoints) return null;
    const prices = history.map((e) => e.price);
    const current = history[history.length - 1].price;
    const zScore = this.computeZScore(prices, current);
    if (zScore >= -this.config.zScoreThreshold) return null;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviation = current - mean;
    const result: Omit<AnomalyResult, 'evidenceHash'> = {
      assetId,
      anomalyScore: Math.min(100, (Math.abs(zScore) / this.config.zScoreThreshold) * 50),
      isAnomaly: true,
      anomalyType: 'drop',
      confidence: Math.min(1, Math.abs(zScore) / (this.config.zScoreThreshold * 2)),
      windowSize: history.length,
      deviation,
      detectedAt: new Date(),
      details: `Price drop detected: z-score=${zScore.toFixed(2)}, current=${current}, mean=${mean.toFixed(2)}`,
    };
    return { ...result, evidenceHash: this.hashEvidence(result) };
  }

  detectManipulation(assetId: string): AnomalyResult | null {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length < this.config.minDataPoints) return null;
    const bySource = new Map<string, number[]>();
    for (const entry of history) {
      const arr = bySource.get(entry.source) ?? [];
      arr.push(entry.price);
      bySource.set(entry.source, arr);
    }
    if (bySource.size < 2) return null;
    const sourceMeans: number[] = [];
    for (const [, prices] of bySource) {
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      sourceMeans.push(mean);
    }
    const overallMean = sourceMeans.reduce((a, b) => a + b, 0) / sourceMeans.length;
    // Guard against division by zero when all prices are 0
    if (overallMean === 0) return null;
    let maxDivergence = 0;
    for (const mean of sourceMeans) {
      const divergence = Math.abs(mean - overallMean) / overallMean;
      if (divergence > maxDivergence) {
        maxDivergence = divergence;
      }
    }
    if (maxDivergence < 0.05) return null;
    const result: Omit<AnomalyResult, 'evidenceHash'> = {
      assetId,
      anomalyScore: Math.min(100, maxDivergence * 100),
      isAnomaly: true,
      anomalyType: 'manipulation',
      confidence: Math.min(1, maxDivergence * 10),
      windowSize: history.length,
      deviation: maxDivergence,
      detectedAt: new Date(),
      details: `Cross-source manipulation detected: max divergence=${(maxDivergence * 100).toFixed(2)}%, sources=${bySource.size}`,
    };
    return { ...result, evidenceHash: this.hashEvidence(result) };
  }

  detectStaleFeed(assetId: string): AnomalyResult | null {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length === 0) return null;
    const lastEntry = history[history.length - 1];
    const now = new Date();
    const diffMinutes = (now.getTime() - lastEntry.timestamp.getTime()) / (1000 * 60);
    if (diffMinutes <= this.config.stalenessMinutes) return null;
    const result: Omit<AnomalyResult, 'evidenceHash'> = {
      assetId,
      anomalyScore: Math.min(100, (diffMinutes / this.config.stalenessMinutes) * 10),
      isAnomaly: true,
      anomalyType: 'stale',
      confidence: Math.min(1, diffMinutes / (this.config.stalenessMinutes * 2)),
      windowSize: history.length,
      deviation: diffMinutes,
      detectedAt: now,
      details: `Stale feed detected: last update ${diffMinutes.toFixed(1)} minutes ago`,
    };
    return { ...result, evidenceHash: this.hashEvidence(result) };
  }

  detectVolumeSurge(assetId: string): AnomalyResult | null {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length < this.config.minDataPoints) return null;
    const volumes = history.map((e) => e.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = history[history.length - 1].volume;
    const multiplier = currentVolume / avgVolume;
    if (multiplier <= this.config.volumeMultiplier) return null;
    const result: Omit<AnomalyResult, 'evidenceHash'> = {
      assetId,
      anomalyScore: Math.min(100, multiplier * 10),
      isAnomaly: true,
      anomalyType: 'volume_surge',
      confidence: Math.min(1, multiplier / (this.config.volumeMultiplier * 2)),
      windowSize: history.length,
      deviation: currentVolume - avgVolume,
      detectedAt: new Date(),
      details: `Volume surge detected: ${multiplier.toFixed(2)}x average, current=${currentVolume}, avg=${avgVolume.toFixed(2)}`,
    };
    return { ...result, evidenceHash: this.hashEvidence(result) };
  }

  scanAll(): Map<string, AnomalyResult[]> {
    const results = new Map<string, AnomalyResult[]>();
    for (const assetId of this.priceHistory.keys()) {
      const anomalies = this.detectAnomalies(assetId);
      if (anomalies.length > 0) {
        results.set(assetId, anomalies);
      }
    }
    return results;
  }

  getEWMA(assetId: string): number {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length === 0) return 0;
    let ewma = history[0].price;
    for (let i = 1; i < history.length; i++) {
      ewma = this.config.ewmaAlpha * history[i].price + (1 - this.config.ewmaAlpha) * ewma;
    }
    return ewma;
  }

  getStats(assetId: string): { mean: number; stddev: number; min: number; max: number; count: number } {
    const history = this.priceHistory.get(assetId);
    if (!history || history.length === 0) {
      return { mean: 0, stddev: 0, min: 0, max: 0, count: 0 };
    }
    const prices = history.map((e) => e.price);
    const count = prices.length;
    const sum = prices.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const stddev = this.computeStdDev(prices);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { mean, stddev, min, max, count };
  }

  private computeZScore(values: number[], current: number): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stddev = this.computeStdDev(values);
    if (stddev === 0) return 0;
    return (current - mean) / stddev;
  }

  private computeStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private hashEvidence(result: Omit<AnomalyResult, 'evidenceHash'>): string {
    const data = JSON.stringify({
      assetId: result.assetId,
      anomalyType: result.anomalyType,
      detectedAt: result.detectedAt.toISOString(),
      details: result.details,
    });
    return createHash('sha256').update(data).digest('hex');
  }
}

export { AnomalyDetector, type PriceFeedEntry, type AnomalyResult, type DetectorConfig };
