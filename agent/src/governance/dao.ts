/**
 * RWA Sentinel — Governance DAO integration.
 *
 * Manages proposal creation, voting, and execution for protocol parameter changes
 * and other governance actions. Integrates with on-chain DAO contracts via CasperPublisher.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { CasperPublisher } from '../publisher/casperPublisher.js';

/**
 * Represents the status of a governance proposal.
 */
export type ProposalStatus = 'pending' | 'voting' | 'approved' | 'rejected' | 'executed' | 'expired';

/**
 * Defines the type of a governance proposal.
 */
export type ProposalType = 'parameter_change' | 'contract_upgrade' | 'treasury_spend';

/**
 * Interface for a governance proposal.
 */
export interface GovernanceProposal {
  id: string;
  type: ProposalType;
  description: string;
  proposerPublicKey: string;
  status: ProposalStatus;
  createdAt: Date;
  votingEndsAt: Date;
  votesFor: number; // Sum of stake weight for
  votesAgainst: number; // Sum of stake weight against
  totalStakeAtCreation: number; // Total stake in the system at proposal creation
  quorumRequired: number; // Percentage of totalStakeAtCreation required for quorum
  executionData: Record<string, any>; // Data needed for execution (e.g., new scoring weights)
  voters: Map<string, 'for' | 'against'>; // Track who voted to prevent double voting
}

/**
 * Configuration for the GovernanceService.
 */
interface GovernanceServiceConfig {
  votingPeriodHours: number;
  quorumThresholdPercent: number; // e.g., 51 for 51%
  minProposalStake: number; // Minimum stake required to propose
}

/**
 * Service for managing governance proposals and voting.
 */
export class GovernanceService {
  private readonly config: GovernanceServiceConfig;
  private readonly publisher: CasperPublisher;
  private readonly proposals = new Map<string, GovernanceProposal>();

  constructor(config: GovernanceServiceConfig, publisher: CasperPublisher) {
    this.config = config;
    this.publisher = publisher;
    console.log('[governance] Governance service initialized.');
  }

  /**
   * Simulates fetching the total staked amount in the system.
   * In a real system, this would query a staking contract.
   * @returns The total simulated stake.
   */
  private async getTotalStakedAmount(): Promise<number> {
    // TODO: Replace with actual on-chain query to staking contract
    return 1_000_000; // Simulate 1,000,000 units of stake
  }

  /**
   * Simulates fetching the stake weight of a given public key.
   * @param publicKey The public key of the staker.
   * @returns The simulated stake weight.
   */
  private async getStakeWeight(publicKey: string): Promise<number> {
    // TODO: Replace with actual on-chain query
    // Simulate some stake for specific keys, or random for others
    if (publicKey === '01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3') {
      return 100_000;
    }
    if (publicKey === '02a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4') {
      return 50_000;
    }
    return Math.floor(Math.random() * 1000) + 100; // Random stake for others
  }

  /**
   * Creates a new governance proposal.
   * @param type The type of the proposal.
   * @param description A description of the proposal.
   * @param proposerPublicKey The public key of the proposer.
   * @param executionData Data required for executing the proposal.
   * @returns The newly created proposal.
   * @throws Error if proposer does not meet minimum stake.
   */
  async createProposal(
    type: ProposalType,
    description: string,
    proposerPublicKey: string,
    executionData: Record<string, any>,
  ): Promise<GovernanceProposal> {
    const proposerStake = await this.getStakeWeight(proposerPublicKey);
    if (proposerStake < this.config.minProposalStake) {
      throw new Error(`Proposer ${proposerPublicKey} does not meet minimum stake of ${this.config.minProposalStake}`);
    }

    const id = `PROP-${randomUUID().slice(0, 8)}`;
    const createdAt = new Date();
    const votingEndsAt = new Date(createdAt.getTime() + this.config.votingPeriodHours * 60 * 60 * 1000);
    const totalStakeAtCreation = await this.getTotalStakedAmount();

    const proposal: GovernanceProposal = {
      id,
      type,
      description,
      proposerPublicKey,
      status: 'voting',
      createdAt,
      votingEndsAt,
      votesFor: 0,
      votesAgainst: 0,
      totalStakeAtCreation,
      quorumRequired: this.config.quorumThresholdPercent,
      executionData,
      voters: new Map(),
    };

    this.proposals.set(id, proposal);
    console.log(`[governance] New proposal created: ${id} by ${proposerPublicKey}`);
    return proposal;
  }

  /**
   * Submits a vote for a given proposal.
   * @param proposalId The ID of the proposal.
   * @param voterPublicKey The public key of the voter.
   * @param choice The vote choice ('for' or 'against').
   * @returns The updated proposal.
   * @throws Error if proposal not found, voting period ended, or voter already voted.
   */
  async voteOnProposal(
    proposalId: string,
    voterPublicKey: string,
    choice: 'for' | 'against',
  ): Promise<GovernanceProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found.`);
    }
    if (proposal.status !== 'voting' || new Date() > proposal.votingEndsAt) {
      throw new Error(`Voting for proposal ${proposalId} is closed or expired.`);
    }
    if (proposal.voters.has(voterPublicKey)) {
      throw new Error(`Voter ${voterPublicKey} has already voted on proposal ${proposalId}.`);
    }

    const stakeWeight = await this.getStakeWeight(voterPublicKey);
    if (stakeWeight === 0) {
      throw new Error(`Voter ${voterPublicKey} has no stake to vote.`);
    }

    if (choice === 'for') {
      proposal.votesFor += stakeWeight;
    } else {
      proposal.votesAgainst += stakeWeight;
    }
    proposal.voters.set(voterPublicKey, choice);

    console.log(`[governance] Vote cast for proposal ${proposalId} by ${voterPublicKey}: ${choice} with ${stakeWeight} stake.`);
    return proposal;
  }

  /**
   * Retrieves a proposal by its ID.
   * @param proposalId The ID of the proposal.
   * @returns The proposal, or null if not found.
   */
  getProposal(proposalId: string): GovernanceProposal | null {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * Retrieves all current proposals.
   * @returns An array of all proposals.
   */
  getAllProposals(): GovernanceProposal[] {
    // Update status for expired proposals
    this.proposals.forEach((proposal) => {
      if (proposal.status === 'voting' && new Date() > proposal.votingEndsAt) {
        proposal.status = 'expired';
        console.log(`[governance] Proposal ${proposal.id} expired.`);
      }
    });
    return Array.from(this.proposals.values());
  }

  /**
   * Executes an approved proposal.
   * @param proposalId The ID of the proposal to execute.
   * @returns The executed proposal.
   * @throws Error if proposal not found, not approved, or execution fails.
   */
  async executeProposal(proposalId: string): Promise<GovernanceProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found.`);
    }
    if (proposal.status === 'executed') {
      throw new Error(`Proposal ${proposalId} already executed.`);
    }
    if (proposal.status === 'voting' && new Date() <= proposal.votingEndsAt) {
      throw new Error(`Voting for proposal ${proposalId} is still open.`);
    }
    if (proposal.status !== 'approved' && new Date() > proposal.votingEndsAt) {
      // Check if it's approved now that voting is over
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      const quorumMet = totalVotes >= (proposal.totalStakeAtCreation * proposal.quorumRequired) / 100;
      const passed = proposal.votesFor > proposal.votesAgainst;

      if (!quorumMet) {
        proposal.status = 'rejected';
        console.log(`[governance] Proposal ${proposalId} rejected: Quorum not met.`);
        throw new Error(`Proposal ${proposalId} rejected: Quorum not met.`);
      }
      if (!passed) {
        proposal.status = 'rejected';
        console.log(`[governance] Proposal ${proposalId} rejected: Did not pass vote.`);
        throw new Error(`Proposal ${proposalId} rejected: Did not pass vote.`);
      }
      proposal.status = 'approved';
      console.log(`[governance] Proposal ${proposalId} approved.`);
    }

    if (proposal.status !== 'approved') {
      throw new Error(`Proposal ${proposalId} is not in 'approved' state. Current status: ${proposal.status}`);
    }

    // Simulate on-chain execution via CasperPublisher
    console.log(`[governance] Executing proposal ${proposalId} on-chain...`);
    try {
      // This would involve building a deploy for the DAO contract
      // For example, calling a `set_scoring_weight` entry point
      const deployResult = await this.publisher.publishBatch({
        assetIds: [`governance-proposal-${proposalId}`],
        trustScores: [100],
        factorsHashes: [proposalId],
        evidenceHashes: [JSON.stringify(proposal.executionData ?? {})],
      });
      console.log(`[governance] On-chain execution deploy submitted for ${proposalId}: ${deployResult.transactionHash}`);
      proposal.status = 'executed';
      return proposal;
    } catch (error) {
      console.error(`[governance] Failed to execute proposal ${proposalId} on-chain:`, error);
      throw new Error(`Failed to execute proposal ${proposalId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Fastify plugin for Governance DAO routes.
 */
const governanceRoutes: FastifyPluginAsync<{
  governanceService: GovernanceService;
}> = async (fastify, options) => {
  const { governanceService } = options;

  const proposeSchema = z.object({
    type: z.enum(['parameter_change', 'contract_upgrade', 'treasury_spend']),
    description: z.string().min(10).max(500),
    proposerPublicKey: z.string().regex(/^0[1-2][0-9a-fA-F]{64}$/, 'Invalid Casper public key format'),
    executionData: z.record(z.string(), z.any()),
  });

  const voteSchema = z.object({
    proposalId: z.string().regex(/^PROP-[0-9a-fA-F]{8}$/),
    voterPublicKey: z.string().regex(/^0[1-2][0-9a-fA-F]{64}$/, 'Invalid Casper public key format'),
    choice: z.enum(['for', 'against']),
  });

  const executeSchema = z.object({
    proposalId: z.string().regex(/^PROP-[0-9a-fA-F]{8}$/),
  });

  fastify.post('/governance/propose', {
    schema: {
      body: proposeSchema,
      response: {
        200: z.object({
          proposalId: z.string(),
          status: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { type, description, proposerPublicKey, executionData } = request.body as { type: ProposalType; description: string; proposerPublicKey: string; executionData?: Record<string, unknown> };
      const proposal = await governanceService.createProposal(type, description, proposerPublicKey, executionData ?? {});
      return reply.status(200).send({ proposalId: proposal.id, status: proposal.status });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to create proposal' });
    }
  });

  fastify.post('/governance/vote', {
    schema: {
      body: voteSchema,
      response: {
        200: z.object({
          proposalId: z.string(),
          status: z.string(),
          votesFor: z.number(),
          votesAgainst: z.number(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { proposalId, voterPublicKey, choice } = request.body as { proposalId: string; voterPublicKey: string; choice: 'for' | 'against' };
      const proposal = await governanceService.voteOnProposal(proposalId, voterPublicKey, choice);
      return reply.status(200).send({
        proposalId: proposal.id,
        status: proposal.status,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to cast vote' });
    }
  });

  fastify.get('/governance/proposals', {
    schema: {
      response: {
        200: z.array(z.object({
          id: z.string(),
          type: z.string(),
          description: z.string(),
          proposerPublicKey: z.string(),
          status: z.string(),
          createdAt: z.string().datetime(),
          votingEndsAt: z.string().datetime(),
          votesFor: z.number(),
          votesAgainst: z.number(),
          totalStakeAtCreation: z.number(),
          quorumRequired: z.number(),
          executionData: z.record(z.string(), z.any()),
        })),
      },
    },
  }, async (request, reply) => {
    const proposals = governanceService.getAllProposals();
    return reply.status(200).send(proposals.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      votingEndsAt: p.votingEndsAt.toISOString(),
      // Exclude the internal 'voters' map for API response
      voters: undefined,
    })));
  });

  fastify.get('/governance/proposals/:id', {
    schema: {
      params: z.object({
        id: z.string().regex(/^PROP-[0-9a-fA-F]{8}$/),
      }),
      response: {
        200: z.object({
          id: z.string(),
          type: z.string(),
          description: z.string(),
          proposerPublicKey: z.string(),
          status: z.string(),
          createdAt: z.string().datetime(),
          votingEndsAt: z.string().datetime(),
          votesFor: z.number(),
          votesAgainst: z.number(),
          totalStakeAtCreation: z.number(),
          quorumRequired: z.number(),
          executionData: z.record(z.string(), z.any()),
        }).nullable(),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const proposal = governanceService.getProposal(id);
    if (!proposal) {
      return reply.status(404).send(null);
    }
    return reply.status(200).send({
      ...proposal,
      createdAt: proposal.createdAt.toISOString(),
      votingEndsAt: proposal.votingEndsAt.toISOString(),
      voters: undefined,
    });
  });

  fastify.post('/governance/execute', {
    schema: {
      body: executeSchema,
      response: {
        200: z.object({
          proposalId: z.string(),
          status: z.string(),
          transactionHash: z.string().optional(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { proposalId } = request.body as { proposalId: string };
      const proposal = await governanceService.executeProposal(proposalId);
      // In a real scenario, the publisher might return a transaction hash
      return reply.status(200).send({ proposalId: proposal.id, status: proposal.status, transactionHash: 'simulated_tx_hash' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to execute proposal' });
    }
  });
};

export default governanceRoutes;
