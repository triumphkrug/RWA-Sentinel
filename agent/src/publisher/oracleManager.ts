import { createHash, randomUUID } from 'crypto';

interface OracleInfo {
  oracleId: string;
  name: string;
  endpoint: string;
  stake: number;
  reputation: number;
  totalReports: number;
  slashedCount: number;
  lastReportAt: Date | null;
  status: 'active' | 'suspended' | 'slashed' | 'inactive';
  registeredAt: Date;
}

interface PriceReport {
  oracleId: string;
  assetId: string;
  price: number;
  confidence: number;
  timestamp: Date;
  sourceHash: string;
}

interface SlashEvent {
  oracleId: string;
  amount: number;
  reason: string;
  evidence: string;
  timestamp: Date;
  reportId: string;
}

interface ConsensusResult {
  assetId: string;
  consensusPrice: number;
  reportCount: number;
  outliers: string[];
  confidence: number;
  timestamp: Date;
}

interface OracleConfig {
  minStake: number;
  slashPercent: number;
  maxDeviation: number;
  minReportsForConsensus: number;
  reputationDecayRate: number;
  suspensionThreshold: number;
}

const MAX_REPORTS_PER_ASSET = 10_000;
const MAX_SLASH_HISTORY = 50_000;
const MAX_CONSENSUS_HISTORY = 1_000;

class OracleManager {
  private oracles: Map<string, OracleInfo>;
  private reports: Map<string, PriceReport[]>;
  private slashHistory: SlashEvent[];
  private consensusHistory: Map<string, ConsensusResult[]>;
  private config: OracleConfig;
  private consecutiveSlashes: Map<string, number>;

  constructor(config?: Partial<OracleConfig>) {
    this.oracles = new Map();
    this.reports = new Map();
    this.slashHistory = [];
    this.consensusHistory = new Map();
    this.consecutiveSlashes = new Map();
    this.config = {
      minStake: 1000,
      slashPercent: 10,
      maxDeviation: 5,
      minReportsForConsensus: 3,
      reputationDecayRate: 0.01,
      suspensionThreshold: 3,
      ...config,
    };
  }

  registerOracle(id: string, name: string, endpoint: string, stake: number): OracleInfo {
    if (this.oracles.has(id)) {
      throw new Error(`Oracle ${id} already registered`);
    }
    if (stake < this.config.minStake) {
      throw new Error(`Stake ${stake} below minimum ${this.config.minStake}`);
    }

    const oracle: OracleInfo = {
      oracleId: id,
      name,
      endpoint,
      stake,
      reputation: 50,
      totalReports: 0,
      slashedCount: 0,
      lastReportAt: null,
      status: 'active',
      registeredAt: new Date(),
    };

    this.oracles.set(id, oracle);
    this.consecutiveSlashes.set(id, 0);
    return oracle;
  }

  submitReport(report: PriceReport): void {
    // Validate report fields
    if (typeof report.price !== 'number' || !Number.isFinite(report.price) || report.price < 0) {
      throw new Error('invalid price: must be a non-negative finite number');
    }
    if (typeof report.confidence !== 'number' || report.confidence < 0 || report.confidence > 100) {
      throw new Error('invalid confidence: must be 0-100');
    }
    if (!(report.timestamp instanceof Date) || isNaN(report.timestamp.getTime())) {
      throw new Error('invalid timestamp');
    }
    // Reject future timestamps (allow 5 min tolerance)
    if (report.timestamp.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new Error('future timestamps are not allowed');
    }

    const oracle = this.oracles.get(report.oracleId);
    if (!oracle) {
      throw new Error(`Oracle ${report.oracleId} not found`);
    }
    if (oracle.status === 'suspended') {
      throw new Error(`Oracle ${report.oracleId} is suspended`);
    }
    if (oracle.status !== 'active') {
      throw new Error(`Oracle ${report.oracleId} is not active (status: ${oracle.status})`);
    }

    const assetReports = this.reports.get(report.assetId) || [];
    assetReports.push(report);
    // Prune oldest reports if exceeding limit
    while (assetReports.length > MAX_REPORTS_PER_ASSET) {
      assetReports.shift();
    }
    this.reports.set(report.assetId, assetReports);

    oracle.totalReports++;
    oracle.lastReportAt = report.timestamp;
    this.oracles.set(report.oracleId, oracle);
  }

  computeConsensus(assetId: string): ConsensusResult {
    const assetReports = this.reports.get(assetId) || [];
    const activeReports = assetReports.filter((r) => {
      const oracle = this.oracles.get(r.oracleId);
      return oracle && oracle.status === 'active';
    });

    if (activeReports.length < this.config.minReportsForConsensus) {
      throw new Error(`Insufficient reports for consensus: ${activeReports.length} < ${this.config.minReportsForConsensus}`);
    }

    const prices = activeReports.map((r) => r.price);
    const median = this.computeMedian(prices);
    const mad = this.computeMAD(prices, median);

    // Use absolute deviation when median is 0 to avoid threshold=0 edge case
    const threshold = median !== 0
      ? (this.config.maxDeviation / 100) * median
      : this.config.maxDeviation;
    const outliers: string[] = [];

    for (const report of activeReports) {
      const deviation = Math.abs(report.price - median);
      if (deviation > threshold) {
        outliers.push(report.oracleId);
      }
    }

    const validReports = activeReports.filter((r) => !outliers.includes(r.oracleId));
    const avgConfidence = validReports.reduce((sum, r) => sum + r.confidence, 0) / validReports.length;

    const result: ConsensusResult = {
      assetId,
      consensusPrice: median,
      reportCount: validReports.length,
      outliers,
      confidence: avgConfidence,
      timestamp: new Date(),
    };

    const history = this.consensusHistory.get(assetId) || [];
    history.push(result);
    // Prune old consensus history
    while (history.length > MAX_CONSENSUS_HISTORY) {
      history.shift();
    }
    this.consensusHistory.set(assetId, history);

    return result;
  }

  slashOracle(oracleId: string, reason: string, evidence: string, reportId: string): SlashEvent {
    const oracle = this.oracles.get(oracleId);
    if (!oracle) {
      throw new Error(`Oracle ${oracleId} not found`);
    }

    const slashAmount = (oracle.stake * this.config.slashPercent) / 100;
    oracle.stake = Math.max(0, oracle.stake - slashAmount);
    oracle.slashedCount++;
    oracle.reputation = Math.max(0, oracle.reputation - 10);

    const consecutive = (this.consecutiveSlashes.get(oracleId) || 0) + 1;
    this.consecutiveSlashes.set(oracleId, consecutive);

    if (consecutive >= this.config.suspensionThreshold) {
      this.suspendOracle(oracleId, `Auto-suspended after ${consecutive} consecutive slashes`);
    }

    const slashEvent: SlashEvent = {
      oracleId,
      amount: slashAmount,
      reason,
      evidence,
      timestamp: new Date(),
      reportId,
    };

    this.slashHistory.push(slashEvent);
    // Prune slash history
    while (this.slashHistory.length > MAX_SLASH_HISTORY) {
      this.slashHistory.shift();
    }
    this.oracles.set(oracleId, oracle);

    return slashEvent;
  }

  autoSlashOutliers(assetId: string): SlashEvent[] {
    const result = this.computeConsensus(assetId);
    const slashEvents: SlashEvent[] = [];

    for (const oracleId of result.outliers) {
      const event = this.slashOracle(
        oracleId,
        `Outlier deviation from consensus on ${assetId}`,
        `Consensus: ${result.consensusPrice}, deviation exceeded ${this.config.maxDeviation}%`,
        randomUUID()
      );
      slashEvents.push(event);
    }

    for (const report of this.reports.get(assetId) || []) {
      if (!result.outliers.includes(report.oracleId)) {
        this.consecutiveSlashes.set(report.oracleId, 0);
        this.updateReputation(report.oracleId, true);
      }
    }

    return slashEvents;
  }

  getOracle(id: string): OracleInfo | undefined {
    return this.oracles.get(id);
  }

  /**
   * Applies passive reputation decay for an oracle that hasn't reported recently:
   * reputation erodes by `reputationDecayRate` (fraction) per call. Intended to be
   * invoked periodically (e.g. from a scheduled sweep) per registered oracle so
   * idle/unresponsive oracles don't retain an indefinitely high reputation while
   * contributing nothing to consensus.
   */
  private applyReputationDecay(oracleId: string): void {
    const oracle = this.oracles.get(oracleId);
    if (!oracle) return;

    oracle.reputation = Math.max(0, oracle.reputation * (1 - this.config.reputationDecayRate));
    this.oracles.set(oracleId, oracle);
  }

  updateReputation(oracleId: string, accurate: boolean): void {
    const oracle = this.oracles.get(oracleId);
    if (!oracle) return;

    if (accurate) {
      oracle.reputation = Math.min(100, oracle.reputation + 1);
    } else {
      oracle.reputation = Math.max(0, oracle.reputation - 5);
    }

    this.oracles.set(oracleId, oracle);
  }

  suspendOracle(oracleId: string, reason: string): void {
    const oracle = this.oracles.get(oracleId);
    if (!oracle) return;

    oracle.status = 'suspended';
    this.oracles.set(oracleId, oracle);
  }

  reactivateOracle(oracleId: string): void {
    const oracle = this.oracles.get(oracleId);
    if (!oracle) {
      throw new Error(`Oracle ${oracleId} not found`);
    }

    oracle.status = 'active';
    this.consecutiveSlashes.set(oracleId, 0);
    this.oracles.set(oracleId, oracle);
  }

  getLeaderboard(): OracleInfo[] {
    return Array.from(this.oracles.values())
      .filter((o) => o.status === 'active')
      .sort((a, b) => b.reputation - a.reputation);
  }

  getSlashHistory(oracleId?: string): SlashEvent[] {
    if (oracleId) {
      return this.slashHistory.filter((s) => s.oracleId === oracleId);
    }
    return [...this.slashHistory];
  }

  pruneInactiveOracles(inactiveDays: number): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const [id, oracle] of this.oracles.entries()) {
      if (oracle.status === 'slashed') continue;

      const lastActive = oracle.lastReportAt?.getTime() || oracle.registeredAt.getTime();
      const daysInactive = (now - lastActive) / (1000 * 60 * 60 * 24);

      if (daysInactive > inactiveDays) {
        oracle.status = 'inactive';
        this.oracles.set(id, oracle);
        removed.push(id);
      }
    }

    return removed;
  }

  getConsensusHistory(assetId: string, limit: number): ConsensusResult[] {
    const history = this.consensusHistory.get(assetId) || [];
    return history.slice(-limit);
  }

  getStats(): {
    totalOracles: number;
    activeOracles: number;
    totalReports: number;
    totalSlashes: number;
    avgReputation: number;
  } {
    const allOracles = Array.from(this.oracles.values());
    const activeOracles = allOracles.filter((o) => o.status === 'active');

    const totalReports = allOracles.reduce((sum, o) => sum + o.totalReports, 0);
    const avgReputation =
      allOracles.length > 0
        ? allOracles.reduce((sum, o) => sum + o.reputation, 0) / allOracles.length
        : 0;

    return {
      totalOracles: allOracles.length,
      activeOracles: activeOracles.length,
      totalReports,
      totalSlashes: this.slashHistory.length,
      avgReputation: Math.round(avgReputation * 100) / 100,
    };
  }

  private computeMedian(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  private computeMAD(prices: number[], median: number): number {
    const deviations = prices.map((p) => Math.abs(p - median));
    return this.computeMedian(deviations);
  }
}

export {
  OracleManager,
  type OracleInfo,
  type PriceReport,
  type SlashEvent,
  type ConsensusResult,
  type OracleConfig,
};
