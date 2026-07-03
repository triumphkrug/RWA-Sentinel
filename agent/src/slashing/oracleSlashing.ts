/**
 * RWA Sentinel — Oracle Slashing Mechanics.
 *
 * Implements the challenge and slashing process for misbehaving oracles
 * that submit incorrect or malicious attestations.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { CasperPublisher } from '../publisher/casperPublisher.js';

/**
 * Status of a slashing report.
 */
export type SlashingReportStatus = 'pending' | 'challenged' | 'validated' | 'invalidated' | 'slashed' | 'resolved';

/**
 * Interface for a slashing report.
 */
export interface SlashingReport {
  id: string;
  oracleId: string; // The ID of the oracle being reported
  attestationId: string; // The ID of the attestation in question
  reporterPublicKey: string; // The public key of the entity reporting
  evidenceHash: string; // Hash of the evidence (e.g., IPFS CID)
  status: SlashingReportStatus;
  createdAt: Date;
  challengePeriodEndsAt: Date;
  challengerPublicKey: string | null; // The public key of the entity challenging the report
  challengerStakeAmount: number; // Amount of stake put up by challenger
  validationResult: 'pending' | 'valid' | 'invalid' | null; // Result of evidence validation
  slashingAmount: number; // Amount of stake to be slashed from oracle
  rewardAmount: number; // Amount to be rewarded to reporter/challenger
}

/**
 * Configuration for the OracleSlashingService.
 */
interface OracleSlashingConfig {
  challengePeriodHours: number; // How long challengers have to respond
  slashingPenaltyPercent: number; // Percentage of oracle stake to slash
  reporterRewardPercent: number; // Percentage of slashed amount to reward reporter
  challengerRewardPercent: number; // Percentage of slashed amount to reward challenger
  minChallengeStake: number; // Minimum stake required to challenge
}

/**
 * Service for managing oracle slashing.
 */
export class OracleSlashingService {
  private readonly config: OracleSlashingConfig;
  private readonly publisher: CasperPublisher;
  private readonly reports = new Map<string, SlashingReport>();

  constructor(config: OracleSlashingConfig, publisher: CasperPublisher) {
    this.config = config;
    this.publisher = publisher;
    console.log('[slashing] Oracle slashing service initialized.');
  }

  /**
   * Simulates fetching an oracle's current stake.
   * @param oracleId The ID of the oracle.
   * @returns The simulated stake amount.
   */
  private async getOracleStake(oracleId: string): Promise<number> {
    // TODO: Replace with actual on-chain query to oracle staking contract
    // Simulate different stakes for different oracles
    if (oracleId === 'oracle_alpha') return 500_000;
    if (oracleId === 'oracle_beta') return 200_000;
    return 100_000; // Default stake
  }

  /**
   * Creates a new slashing report against an oracle.
   * @param oracleId The ID of the oracle being reported.
   * @param attestationId The ID of the attestation that is deemed faulty.
   * @param reporterPublicKey The public key of the entity submitting the report.
   * @param evidenceHash A hash or identifier for the evidence (e.g., IPFS CID).
   * @returns The newly created slashing report.
   */
  async reportMisbehavior(
    oracleId: string,
    attestationId: string,
    reporterPublicKey: string,
    evidenceHash: string,
  ): Promise<SlashingReport> {
    const id = `SLASH-${randomUUID().slice(0, 8)}`;
    const createdAt = new Date();
    const challengePeriodEndsAt = new Date(createdAt.getTime() + this.config.challengePeriodHours * 60 * 60 * 1000);
    const oracleStake = await this.getOracleStake(oracleId);
    const slashingAmount = (oracleStake * this.config.slashingPenaltyPercent) / 100;
    const rewardAmount = slashingAmount * (this.config.reporterRewardPercent + this.config.challengerRewardPercent) / 100; // Total potential reward

    const report: SlashingReport = {
      id,
      oracleId,
      attestationId,
      reporterPublicKey,
      evidenceHash,
      status: 'pending',
      createdAt,
      challengePeriodEndsAt,
      challengerPublicKey: null,
      challengerStakeAmount: 0,
      validationResult: null,
      slashingAmount,
      rewardAmount,
    };

    this.reports.set(id, report);
    console.log(`[slashing] New report created: ${id} against ${oracleId} by ${reporterPublicKey}`);
    return report;
  }

  /**
   * Allows an entity to challenge a slashing report by putting up stake.
   * @param reportId The ID of the report to challenge.
   * @param challengerPublicKey The public key of the entity challenging.
   * @param challengeStakeAmount The amount of stake the challenger puts up.
   * @returns The updated slashing report.
   * @throws Error if report not found, already challenged, or challenge period expired.
   */
  async challengeReport(
    reportId: string,
    challengerPublicKey: string,
    challengeStakeAmount: number,
  ): Promise<SlashingReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Slashing report ${reportId} not found.`);
    }
    if (report.status !== 'pending') {
      throw new Error(`Report ${reportId} is not in 'pending' status.`);
    }
    if (new Date() > report.challengePeriodEndsAt) {
      throw new Error(`Challenge period for report ${reportId} has expired.`);
    }
    if (challengeStakeAmount < this.config.minChallengeStake) {
      throw new Error(`Challenge stake must be at least ${this.config.minChallengeStake}.`);
    }

    report.challengerPublicKey = challengerPublicKey;
    report.challengerStakeAmount = challengeStakeAmount;
    report.status = 'challenged';

    console.log(`[slashing] Report ${reportId} challenged by ${challengerPublicKey} with ${challengeStakeAmount} stake.`);
    return report;
  }

  /**
   * Simulates the validation of evidence for a slashing report.
   * In a real system, this would involve an off-chain dispute resolution
   * or a more complex on-chain validation mechanism.
   * @param reportId The ID of the report to validate.
   * @param isValid Whether the evidence is deemed valid or invalid.
   * @returns The updated slashing report.
   * @throws Error if report not found or not in a valid state for validation.
   */
  async validateEvidence(reportId: string, isValid: boolean): Promise<SlashingReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Slashing report ${reportId} not found.`);
    }
    if (report.status !== 'pending' && report.status !== 'challenged') {
      throw new Error(`Report ${reportId} is not in a state to be validated.`);
    }
    if (report.validationResult !== null) {
      throw new Error(`Report ${reportId} has already been validated.`);
    }

    report.validationResult = isValid ? 'valid' : 'invalid';
    report.status = isValid ? 'validated' : 'invalidated';

    console.log(`[slashing] Evidence for report ${reportId} validated as ${isValid ? 'valid' : 'invalid'}.`);
    return report;
  }

  /**
   * Executes the slashing process based on a validated report.
   * This would typically involve an on-chain transaction to reduce oracle stake
   * and distribute rewards.
   * @param reportId The ID of the report to execute.
   * @returns The updated slashing report.
   * @throws Error if report not found, not validated, or already executed.
   */
  async executeSlash(reportId: string): Promise<SlashingReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Slashing report ${reportId} not found.`);
    }
    if (report.status === 'slashed' || report.status === 'resolved') {
      throw new Error(`Report ${reportId} already executed or resolved.`);
    }
    if (report.validationResult !== 'valid') {
      throw new Error(`Report ${reportId} is not validated as 'valid'. Current result: ${report.validationResult}`);
    }

    // Simulate on-chain slashing and reward distribution
    console.log(`[slashing] Executing slash for report ${reportId}...`);
    try {
      // This would involve building a deploy for a slashing contract
      // e.g., calling `slash_oracle` and `distribute_rewards` entry points
      const deployResult = await this.publisher.publishBatch({
        assetIds: [`slashing-report-${reportId}`],
        attestationData: {
          action: 'slash',
          oracleId: report.oracleId,
          amount: report.slashingAmount,
          reporter: report.reporterPublicKey,
          challenger: report.challengerPublicKey,
          rewardReporter: report.slashingAmount * this.config.reporterRewardPercent / 100,
          rewardChallenger: report.challengerPublicKey ? report.slashingAmount * this.config.challengerRewardPercent / 100 : 0,
        },
      });
      console.log(`[slashing] On-chain slash deploy submitted for ${reportId}: ${deployResult.transactionHash}`);
      report.status = 'slashed';
      return report;
    } catch (error) {
      console.error(`[slashing] Failed to execute slash for report ${reportId} on-chain:`, error);
      throw new Error(`Failed to execute slash for report ${reportId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves a slashing report by its ID.
   * @param reportId The ID of the report.
   * @returns The report, or null if not found.
   */
  getReport(reportId: string): SlashingReport | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * Retrieves all current slashing reports.
   * @returns An array of all slashing reports.
   */
  getAllReports(): SlashingReport[] {
    // Update status for expired challenge periods if still pending
    this.reports.forEach((report) => {
      if (report.status === 'pending' && new Date() > report.challengePeriodEndsAt) {
        report.status = 'resolved'; // No challenge, report expires without action
        report.validationResult = 'invalid'; // Implicitly invalid if no one challenged
        console.log(`[slashing] Report ${report.id} resolved due to expired challenge period.`);
      }
    });
    return Array.from(this.reports.values());
  }
}

/**
 * Fastify plugin for Oracle Slashing routes.
 */
const slashingRoutes: FastifyPluginAsync<{
  slashingService: OracleSlashingService;
}> = async (fastify, options) => {
  const { slashingService } = options;

  const reportSchema = z.object({
    oracleId: z.string().min(1),
    attestationId: z.string().min(1),
    reporterPublicKey: z.string().regex(/^0[1-2][0-9a-fA-F]{64}$/, 'Invalid Casper public key format'),
    evidenceHash: z.string().min(1), // e.g., IPFS CID
  });

  const challengeSchema = z.object({
    reportId: z.string().regex(/^SLASH-[0-9a-fA-F]{8}$/),
    challengerPublicKey: z.string().regex(/^0[1-2][0-9a-fA-F]{64}$/, 'Invalid Casper public key format'),
    challengeStakeAmount: z.number().min(1),
  });

  const validateSchema = z.object({
    reportId: z.string().regex(/^SLASH-[0-9a-fA-F]{8}$/),
    isValid: z.boolean(),
  });

  const executeSchema = z.object({
    reportId: z.string().regex(/^SLASH-[0-9a-fA-F]{8}$/),
  });

  fastify.post('/slashing/report', {
    schema: {
      body: reportSchema,
      response: {
        200: z.object({
          reportId: z.string(),
          status: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { oracleId, attestationId, reporterPublicKey, evidenceHash } = request.body;
      const report = await slashingService.reportMisbehavior(oracleId, attestationId, reporterPublicKey, evidenceHash);
      return reply.status(200).send({ reportId: report.id, status: report.status });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to create report' });
    }
  });

  fastify.post('/slashing/challenge', {
    schema: {
      body: challengeSchema,
      response: {
        200: z.object({
          reportId: z.string(),
          status: z.string(),
          challengerPublicKey: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { reportId, challengerPublicKey, challengeStakeAmount } = request.body;
      const report = await slashingService.challengeReport(reportId, challengerPublicKey, challengeStakeAmount);
      return reply.status(200).send({
        reportId: report.id,
        status: report.status,
        challengerPublicKey: report.challengerPublicKey!,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to challenge report' });
    }
  });

  // This endpoint would typically be called by an internal validation service or a trusted party
  fastify.post('/slashing/validate', {
    schema: {
      body: validateSchema,
      response: {
        200: z.object({
          reportId: z.string(),
          status: z.string(),
          validationResult: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { reportId, isValid } = request.body;
      const report = await slashingService.validateEvidence(reportId, isValid);
      return reply.status(200).send({
        reportId: report.id,
        status: report.status,
        validationResult: report.validationResult!,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to validate evidence' });
    }
  });

  fastify.post('/slashing/execute', {
    schema: {
      body: executeSchema,
      response: {
        200: z.object({
          reportId: z.string(),
          status: z.string(),
          transactionHash: z.string().optional(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { reportId } = request.body;
      const report = await slashingService.executeSlash(reportId);
      return reply.status(200).send({ reportId: report.id, status: report.status, transactionHash: 'simulated_tx_hash' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to execute slash' });
    }
  });

  fastify.get('/slashing/reports', {
    schema: {
      response: {
        200: z.array(z.object({
          id: z.string(),
          oracleId: z.string(),
          attestationId: z.string(),
          reporterPublicKey: z.string(),
          evidenceHash: z.string(),
          status: z.string(),
          createdAt: z.string().datetime(),
          challengePeriodEndsAt: z.string().datetime(),
          challengerPublicKey: z.string().nullable(),
          challengerStakeAmount: z.number(),
          validationResult: z.string().nullable(),
          slashingAmount: z.number(),
          rewardAmount: z.number(),
        })),
      },
    },
  }, async (request, reply) => {
    const reports = slashingService.getAllReports();
    return reply.status(200).send(reports.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      challengePeriodEndsAt: r.challengePeriodEndsAt.toISOString(),
    })));
  });

  fastify.get('/slashing/reports/:id', {
    schema: {
      params: z.object({
        id: z.string().regex(/^SLASH-[0-9a-fA-F]{8}$/),
      }),
      response: {
        200: z.object({
          id: z.string(),
          oracleId: z.string(),
          attestationId: z.string(),
          reporterPublicKey: z.string(),
          evidenceHash: z.string(),
          status: z.string(),
          createdAt: z.string().datetime(),
          challengePeriodEndsAt: z.string().datetime(),
          challengerPublicKey: z.string().nullable(),
          challengerStakeAmount: z.number(),
          validationResult: z.string().nullable(),
          slashingAmount: z.number(),
          rewardAmount: z.number(),
        }).nullable(),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const report = slashingService.getReport(id);
    if (!report) {
      return reply.status(404).send(null);
    }
    return reply.status(200).send({
      ...report,
      createdAt: report.createdAt.toISOString(),
      challengePeriodEndsAt: report.challengePeriodEndsAt.toISOString(),
    });
  });
};

export default slashingRoutes;
