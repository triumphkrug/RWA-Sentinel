/**
 * RWA Sentinel — BLS Threshold Signatures.
 *
 * Real BLS12-381 threshold multi-signature consensus for multi-oracle
 * attestation agreement: k independently-keyed oracles sign the same
 * message hash, their signatures are aggregated into a single BLS
 * signature, and the aggregate verifies against the aggregate public key
 * of only the oracles that actually signed. This is genuine BLS
 * cryptography (via @noble/curves' audited bls12-381 implementation), not
 * a placeholder - every signature accepted is checked against its
 * claimed oracle's real public key before being counted toward the
 * threshold, and finalization performs a real elliptic-curve pairing
 * verification of the aggregate signature, not a simulated string.
 *
 * "Threshold" here means k-of-n signature aggregation (the same model used
 * by e.g. Ethereum's BLS-based consensus attestations), not Shamir secret
 * sharing of a single private key - each of the n oracles holds its own
 * independent BLS keypair throughout.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// @noble/curves is published as pure ESM. A static top-level import
// transpiles to `require(...)` under ts-jest's CommonJS test transform and
// fails ("Cannot use import statement outside a module"), while the
// compiled production build (native ESM, see package.json/tsconfig)
// handles a static import fine. A cached dynamic import works correctly
// in both CJS (Node's loader supports async import() of ESM from CJS) and
// ESM contexts, so it's used here instead of a static import.
type BlsLongSignatures = typeof import('@noble/curves/bls12-381.js')['bls12_381']['longSignatures'];
// Using new Function(...) instead of a literal `import(...)` expression
// hides the dynamic import from TypeScript's compiler, which otherwise
// down-levels even dynamic import() to require() when targeting
// CommonJS (as ts-jest's test transform does) - that down-leveled
// require() fails against a pure-ESM package. The production build
// (native ESM output) doesn't need this workaround but it behaves
// identically there.
const dynamicImport: (specifier: string) => Promise<typeof import('@noble/curves/bls12-381.js')> = new Function(
  'specifier',
  'return import(specifier)',
) as never;
let blsModulePromise: Promise<BlsLongSignatures> | null = null;
async function getBls(): Promise<BlsLongSignatures> {
  if (!blsModulePromise) {
    blsModulePromise = dynamicImport('@noble/curves/bls12-381.js').then((m) => m.bls12_381.longSignatures);
  }
  return blsModulePromise;
}

/** Generates a real BLS12-381 keypair for an oracle identity. */
export async function generateOracleKeypair(): Promise<{ secretKeyHex: string; publicKeyHex: string }> {
  const bls = await getBls();
  const { secretKey } = bls.keygen();
  const publicKey = bls.getPublicKey(secretKey);
  return {
    secretKeyHex: Buffer.from(secretKey).toString('hex'),
    publicKeyHex: Buffer.from(publicKey.toBytes()).toString('hex'),
  };
}

/** Signs a message hash with a real BLS secret key, returning a hex-encoded signature. */
export async function signMessage(messageHashHex: string, secretKeyHex: string): Promise<string> {
  const bls = await getBls();
  const msgPoint = bls.hash(Buffer.from(messageHashHex, 'hex'));
  const secretKey = Buffer.from(secretKeyHex, 'hex');
  const sig = bls.sign(msgPoint, secretKey);
  return Buffer.from(sig.toBytes()).toString('hex');
}

export interface ConsensusState {
  attestationId: string;
  messageHash: string;
  requiredSignatures: number;
  totalOracles: number;
  collectedPartialSignatures: Map<string, string>; // oraclePublicKeyHex -> signatureHex
  status: 'pending' | 'threshold_met' | 'finalized' | 'failed';
  finalSignature: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BlsThresholdConfig {
  threshold: number; // k
  totalOracles: number; // n
  oraclePublicKeys: string[]; // hex-encoded real BLS public keys, length === totalOracles
}

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
    console.log(`[bls-threshold] BLS Threshold service initialized: ${config.threshold}-of-${config.totalOracles} consensus (real BLS12-381).`);
  }

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
   * Submits a real BLS partial signature from an oracle. The signature is
   * cryptographically verified against that oracle's real public key
   * before being counted - a forged or wrong signature is rejected here,
   * not silently accepted.
   */
  async submitPartialSignature(
    attestationId: string,
    oraclePublicKeyHex: string,
    partialSignatureHex: string,
  ): Promise<ConsensusState> {
    const state = this.consensusStates.get(attestationId);
    if (!state) {
      throw new Error(`Consensus state not found for attestation ${attestationId}. Initialize first.`);
    }
    if (!this.config.oraclePublicKeys.includes(oraclePublicKeyHex)) {
      throw new Error(`Oracle public key ${oraclePublicKeyHex} is not a recognized participant.`);
    }
    if (state.collectedPartialSignatures.has(oraclePublicKeyHex)) {
      throw new Error(`Oracle ${oraclePublicKeyHex} has already submitted a partial signature for attestation ${attestationId}.`);
    }
    if (state.status === 'finalized' || state.status === 'failed') {
      throw new Error(`Consensus for attestation ${attestationId} is already ${state.status}.`);
    }

    const bls = await getBls();
    const msgPoint = bls.hash(Buffer.from(state.messageHash, 'hex'));
    const publicKey = Buffer.from(oraclePublicKeyHex, 'hex');
    const signature = Buffer.from(partialSignatureHex, 'hex');
    const isValid = bls.verify(signature, msgPoint, publicKey);
    if (!isValid) {
      throw new Error(`Partial signature from oracle ${oraclePublicKeyHex} failed BLS verification for attestation ${attestationId}.`);
    }

    state.collectedPartialSignatures.set(oraclePublicKeyHex, partialSignatureHex);
    state.updatedAt = new Date();

    if (state.collectedPartialSignatures.size >= state.requiredSignatures) {
      state.status = 'threshold_met';
      console.log(`[bls-threshold] Threshold met for attestation ${attestationId}.`);
    }

    console.log(`[bls-threshold] Verified partial signature submitted for attestation ${attestationId} by ${oraclePublicKeyHex.slice(0, 16)}...`);
    return state;
  }

  getConsensusStatus(attestationId: string): ConsensusState | null {
    const state = this.consensusStates.get(attestationId);
    if (!state) return null;
    return { ...state, collectedPartialSignatures: new Map(state.collectedPartialSignatures) };
  }

  /**
   * Aggregates the collected real partial signatures into a single BLS
   * signature and cryptographically verifies it against the aggregate
   * public key of exactly the oracles that signed, via an elliptic-curve
   * pairing check - this is a real verification, not a placeholder.
   */
  async finalizeConsensus(attestationId: string): Promise<string> {
    const state = this.consensusStates.get(attestationId);
    if (!state) {
      throw new Error(`Consensus state not found for attestation ${attestationId}.`);
    }
    if (state.finalSignature) {
      return state.finalSignature;
    }
    if (state.status !== 'threshold_met') {
      throw new Error(`Threshold not met for attestation ${attestationId}. Current status: ${state.status}`);
    }

    const signerPublicKeys = Array.from(state.collectedPartialSignatures.keys());
    const signatures = Array.from(state.collectedPartialSignatures.values()).map((hex) => Buffer.from(hex, 'hex'));
    const publicKeys = signerPublicKeys.map((hex) => Buffer.from(hex, 'hex'));

    if (signatures.length < state.requiredSignatures) {
      state.status = 'failed';
      state.updatedAt = new Date();
      throw new Error(`Not enough partial signatures to finalize for ${attestationId}.`);
    }

    const bls = await getBls();
    const aggregateSignature = bls.aggregateSignatures(signatures);
    const aggregatePublicKey = bls.aggregatePublicKeys(publicKeys);
    const msgPoint = bls.hash(Buffer.from(state.messageHash, 'hex'));

    const verified = bls.verify(aggregateSignature, msgPoint, aggregatePublicKey);
    if (!verified) {
      state.status = 'failed';
      state.updatedAt = new Date();
      throw new Error(`Aggregate BLS signature failed verification for ${attestationId} - this should be unreachable if all partials were individually verified, indicates an aggregation bug.`);
    }

    const finalSignatureHex = Buffer.from(aggregateSignature.toBytes()).toString('hex');
    state.finalSignature = finalSignatureHex;
    state.status = 'finalized';
    state.updatedAt = new Date();

    console.log(`[bls-threshold] Consensus finalized for attestation ${attestationId}: ${state.collectedPartialSignatures.size}-of-${state.totalOracles} real BLS signatures aggregated and pairing-verified.`);
    return finalSignatureHex;
  }
}

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
    oraclePublicKey: z.string().regex(/^[0-9a-fA-F]+$/, 'Expected hex-encoded BLS public key'),
    partialSignature: z.string().regex(/^[0-9a-fA-F]+$/, 'Expected hex-encoded BLS signature'),
  });

  fastify.post('/consensus/init', async (request, reply) => {
    const parsed = initConsensusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
    }
    try {
      const { attestationId, messageHash } = parsed.data;
      const state = await blsThresholdService.initializeConsensus(attestationId, messageHash);
      return reply.status(200).send({ attestationId: state.attestationId, status: state.status });
    } catch (error) {
      fastify.log.error(error, 'Failed to initialize consensus');
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to initialize consensus' });
    }
  });

  fastify.post('/consensus/submit', async (request, reply) => {
    const parsed = submitPartialSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
    }
    try {
      const { attestationId, oraclePublicKey, partialSignature } = parsed.data;
      const state = await blsThresholdService.submitPartialSignature(attestationId, oraclePublicKey, partialSignature);
      return reply.status(200).send({
        attestationId: state.attestationId,
        status: state.status,
        signaturesCollected: state.collectedPartialSignatures.size,
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to submit partial signature');
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to submit partial signature' });
    }
  });

  fastify.post('/consensus/finalize', async (request, reply) => {
    try {
      const { attestationId } = request.body as { attestationId: string };
      const finalSignature = await blsThresholdService.finalizeConsensus(attestationId);
      return reply.status(200).send({ attestationId, status: 'finalized', finalSignature });
    } catch (error) {
      fastify.log.error(error, 'Failed to finalize signature');
      return reply.status(400).send({ error: error instanceof Error ? error.message : 'Failed to finalize signature' });
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
