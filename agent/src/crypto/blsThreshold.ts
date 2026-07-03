/**
 * RWA Sentinel — BLS Threshold Signatures.
 *
 * Implements a multi-oracle consensus mechanism using BLS threshold signatures
 * to aggregate partial signatures into a final, verifiable attestation.
 * This file simulates BLS operations as a full BLS library is complex.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

/**
 * Represents the state of a BLS consensus process for a specific attestation.
 */
export interface ConsensusState {
  attestationId: string;
  messageHash: string; // Hash of the data being signed
  requiredSignatures: number; // The 'k' in k-of-n threshold
  totalOracles: number; // The 'n' in k-of-n threshold
  collectedPartialSignatures: Map<string, string>; // Map of oracleId to partial signature
  status: 'pending' | 'threshold_met' | 'finalized' | 'failed';
  finalSignature: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuration for the BlsThresholdService.
 */
interface BlsThresholdConfig {
  threshold: number; // k-of-n, e.g., 3 for 3-of-5
  totalOracles: number; // n, e.g., 5
  oraclePublicKeys: string[]; // List of participating oracle public keys
}

/**
 * Service for managing BLS threshold signatures.
 *
 * NOTE: This implementation *simulates* BLS operations. A real-world
 * implementation would require a robust BLS cryptography library (e.g., noble-bls12-381).
 */
export class BlsThresholdService {
  private readonly config: BlsThresholdConfig;
  private readonly consensusStates = new Map<string, ConsensusState>();

  constructor(config: BlsThresholdConfig) {
    if (config.threshold <= 0 || config.threshold > config.totalOracles) {
      throw new Error('BLS threshold must be greater than 0 and less than or equal to total oracles.');
    }
    if (config.oraclePublicKeys.length !== config.totalOracles) {
      throw new Error('Number of oracle public keys must match totalOracles config.');
    }
    this.config = config;
    console.log(`[bls-threshold] BLS Threshold service initialized: ${config.threshold}-of-${config.totalOracles} consensus.`);
  }

  /**
   * Initializes a new consensus state for a given attestation.
   * @param attestationId The ID of the attestation to sign.
   * @param messageHash The hash of the data (attestation content) to be signed.
   * @returns The initial consensus state.
   * @throws Error if a state for this attestation already exists.
   */
  async initializeConsensus(attestationId: string, messageHash: string): Promise<ConsensusState> {
    if (this.consensusStates.has(attestationId)) {
      throw new Error(`Consensus already initialized for attestation ${attestationId}`);
    }

    const now = new Date();
    const state: ConsensusState = {
      attestationId,
      messageHash,
      requiredSignatures: this.config.threshold,
      totalOracles: this.config.totalOracles,
      collectedPartialSignatures: new Map(),
      status: 'pending',
      finalSignature: null,
      createdAt: now,
      updatedAt: now,
    };
    this.consensusStates.set(attestationId, state);
    console.log(`[bls-threshold] Consensus initialized for attestation ${attestationId}`);
    return state;
  }

  /**
   * Submits a partial BLS signature from an oracle for a specific attestation.
   * @param attestationId The ID of the attestation.
   * @param oracleId The ID of the oracle submitting the signature.
   * @param partialSignature The partial BLS signature string.
   * @returns The updated consensus state.
   * @throws Error if attestation not found, oracle not recognized, or oracle already signed.
   */
  async submitPartialSignature(
    attestationId: string,
    oracleId: string,
    partialSignature: string,
  ): Promise<ConsensusState> {
    const state = this.consensusStates.get(attestationId);
    if (!state) {
      throw new Error(`Consensus state not found for attestation ${attestationId}. Initialize first.`);
    }
    if (!this.config.oraclePublicKeys.includes(oracleId)) {
      throw new Error(`Oracle ID ${oracleId} is not a recognized participant.`);
    }
    if (state.collectedPartialSignatures.has(oracleId)) {
      throw new Error(`Oracle ${oracleId} has already submitted a partial signature for attestation ${attestationId}.`);
    }
    if (state.status === 'finalized' || state.status === 'failed') {
      throw new Error(`Consensus for attestation ${attestationId} is already ${state.status}.`);
    }

    // In a real BLS system, you'd verify the partial signature here
    // For simulation, we just store it.
    // simulateVerifyPartialSignature(state.messageHash, oracleId, partialSignature);

    state.collectedPartialSignatures.set(oracleId, partialSignature);
    state.updatedAt = new Date();

    if (state.collectedPartialSignatures.size >= state.requiredSignatures) {
      state.status = 'threshold_met';
      console.log(`[bls-threshold] Threshold met for attestation ${attestationId}.`);
    }

    console.log(`[bls-threshold] Partial signature submitted for attestation ${attestationId} by ${oracleId}.`);
    return state;
  }

  /**
   * Retrieves the current consensus status for an attestation.
   * @param attestationId The ID of the attestation.
   * @returns The consensus state, or null if not found.
   */
  getConsensusStatus(attestationId: string): ConsensusState | null {
    const state = this.consensusStates.get(attestationId);
    if (!state) return null;

    // Return a copy without the internal Map for API response
    return {
      ...state,
      collectedPartialSignatures: new Map(state.collectedPartialSignatures),
    };
  }

  /**
   * Finalizes the BLS signature by aggregating collected partial signatures.
   * @param attestationId The ID of the attestation.
   * @returns The final aggregated BLS signature.
   * @throws Error if threshold not met or aggregation fails.
   */
  async finalizeConsensus(attestationId: string): Promise<string> {
    const state = this.consensusStates.get(attestationId);
    if (!state) {
      throw new Error(`Consensus state not found for attestation ${attestationId}.`);
    }
    if (state.status !== 'threshold_met') {
      throw new Error(`Threshold not met for attestation ${attestationId}. Current status: ${state.status}`);
    }
    if (state.finalSignature) {
      return state.finalSignature; // Already finalized
    }

    console.log(`[bls-threshold] Finalizing consensus for attestation ${attestationId}...`);

    // Simulate BLS aggregation
    // In a real BLS library, this would involve:
    // 1. Getting the public keys of the oracles that signed.
    // 2. Aggregating their partial signatures.
    // 3. Verifying the aggregated signature against the message hash and aggregated public key.
    const partials = Array.from(state.collectedPartialSignatures.values());
    if (partials.length < state.requiredSignatures) {
      state.status = 'failed';
      state.updatedAt = new Date();
      throw new Error(`Not enough partial signatures to finalize for ${attestationId}.`);
    }

    // Simple concatenation for simulation
    const simulatedFinalSignature = `BLS_SIG_${state.messageHash.slice(0, 8)}_${partials.length}_OF_${state.totalOracles}_${randomUUID().slice(0, 8)}`;

    state.finalSignature = simulatedFinalSignature;
    state.status = 'finalized';
    state.updatedAt = new Date();

    console.log(`[bls-threshold] Consensus finalized for attestation ${attestationId}. Final signature: ${simulatedFinalSignature}`);
    return simulatedFinalSignature;
  }

}

/**
 * Fastify plugin for BLS Threshold Signature routes.
 */
const blsThresholdRoutes: FastifyPluginAsync<{
  blsThresholdService: BlsThresholdService;
}> = async (fastify, options) => {
  const { blsThresholdService } = options;

  const initConsensusSchema = z.object({
    attestationId: z.string().min(1),
    messageHash: z.string().regex(/^[0-9a-fA-F]{64}$/, 'Invalid hash format (expected 64 hex chars)'),
  });

  const submitPartialSchema = z.object({
    attestationId: z.string().min(1),
    oracleId: z.string().min(1), // Public key or identifier for the oracle
    partialSignature: z.string().min(1), // Simulated partial signature string
  });

  const finalizeSchema = z.object({
    attestationId: z.string().min(1),
  });

  fastify.post('/consensus/init', async (request, reply) => {
    try {
      const { attestationId, messageHash } = request.body as { attestationId: string; messageHash: string };
      const state = await blsThresholdService.initializeConsensus(attestationId, messageHash);
      return reply.status(200).send({ attestationId: state.attestationId, status: state.status });
    } catch (error) {
      fastify.log.error(error, 'Failed to initialize consensus');
      return reply.status(500).send({ error: 'Failed to initialize consensus' });
    }
  });

  fastify.post('/consensus/submit', async (request, reply) => {
    try {
      const { attestationId, oracleId, partialSignature } = request.body as { attestationId: string; oracleId: string; partialSignature: string };
      const state = await blsThresholdService.submitPartialSignature(attestationId, oracleId, partialSignature);
      return reply.status(200).send({
        attestationId: state.attestationId,
        status: state.status,
        signaturesCollected: state.collectedPartialSignatures.size,
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to submit partial signature');
      return reply.status(500).send({ error: 'Failed to submit partial signature' });
    }
  });

  fastify.post('/consensus/finalize', async (request, reply) => {
    try {
      const { attestationId } = (request.body as { attestationId: string });
      const finalSignature = await blsThresholdService.finalizeConsensus(attestationId);
      return reply.status(200).send({
        attestationId,
        status: 'finalized',
        finalSignature,
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to finalize signature');
      return reply.status(500).send({ error: 'Failed to finalize signature' });
    }
  });

  fastify.get('/consensus/:attestationId', async (request, reply) => {
    try {
      const { attestationId } = request.params as { attestationId: string };
      const state = await blsThresholdService.getConsensusStatus(attestationId);
      if (!state) {
        return reply.status(404).send({ error: 'Consensus state not found' });
      }
      return reply.status(200).send({
        attestationId: state.attestationId,
        messageHash: state.messageHash,
        status: state.status,
        signaturesCollected: state.collectedPartialSignatures.size,
        requiredSignatures: state.requiredSignatures,
        totalOracles: state.totalOracles,
        finalSignature: state.finalSignature,
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to get consensus state');
      return reply.status(500).send({ error: 'Failed to get consensus state' });
    }
  });
};

export default blsThresholdRoutes;
