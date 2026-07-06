/**
 * Publishes attestations and executes governance/slashing actions on the
 * Casper Network via the official casper-js-sdk.
 *
 * Uses `ContractCallBuilder` + `RpcClient.putTransaction` to build and sign
 * real, verifiable Casper transactions against the deployed attestation-store,
 * governance-dao, and oracle-slashing contracts. Falls back to a locally
 * computed, clearly-labeled `unconfirmed-*` hash only when no deployer key
 * is configured (e.g. local dev without secrets) or the RPC call itself
 * fails — callers must treat that prefix as "not confirmed on-chain".
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import casperSdk from 'casper-js-sdk';
import type { PublishRequest, PublishResult } from './types.js';

const {
  PrivateKey,
  KeyAlgorithm,
  HttpHandler,
  RpcClient,
  ContractCallBuilder,
  Args,
  CLValue,
  CLTypeString,
  CLTypeUInt64,
} = casperSdk;

interface CasperPublisherConfig {
  nodeUrl: string;
  chainName: string;
  contractHash: string; // attestation-store
  deployerKeyPath: string;
  governanceContractHash?: string;
  slashingContractHash?: string;
}

export class CasperPublisher {
  private readonly config: CasperPublisherConfig;
  private readonly pendingTxs = new Map<string, PublishResult>();
  private privateKey: InstanceType<typeof PrivateKey> | null = null;
  private readonly rpcClient: InstanceType<typeof RpcClient>;

  constructor(config: CasperPublisherConfig) {
    this.config = config;
    this.rpcClient = new RpcClient(new HttpHandler(config.nodeUrl));
    this.loadKey();
  }

  private loadKey(): void {
    try {
      const keyPath = this.config.deployerKeyPath;
      // Validate path to prevent directory traversal
      if (keyPath.includes('..') || !keyPath.match(/^[\w.\-/]+$/)) {
        console.warn('[publisher] invalid deployer key path');
        return;
      }
      const pem = readFileSync(keyPath, 'utf-8');
      this.privateKey = PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
      console.log('[publisher] deployer key loaded, account:', this.privateKey.publicKey.toHex());
    } catch {
      console.warn('[publisher] no deployer key found, submits will generate deterministic unconfirmed hashes');
    }
  }

  /**
   * Publish a batch of attestations to the on-chain attestation-store contract
   * (`batch_attest` entry point).
   */
  async publishBatch(request: PublishRequest): Promise<PublishResult> {
    if (request.assetIds.length === 0) {
      throw new Error('Empty batch');
    }
    if (request.assetIds.length > 10) {
      throw new Error('Batch size exceeds maximum of 10');
    }

    const args = Args.fromMap({
      asset_ids: CLValue.newCLList(
        CLTypeString,
        request.assetIds.map((id) => CLValue.newCLString(id))
      ),
      trust_scores: CLValue.newCLList(
        CLTypeUInt64,
        request.trustScores.map((s) => CLValue.newCLUint64(s))
      ),
      factors_hashes: CLValue.newCLList(
        CLTypeString,
        request.factorsHashes.map((h) => CLValue.newCLString(h))
      ),
      evidence_hashes: CLValue.newCLList(
        CLTypeString,
        request.evidenceHashes.map((h) => CLValue.newCLString(h))
      ),
    });

    const transactionHash = await this.callContract(
      this.config.contractHash,
      'batch_attest',
      args,
      this.buildLocalHashPayload(request)
    );

    const result: PublishResult = {
      batchId: `BATCH-${randomUUID().slice(0, 8)}`,
      transactionHash,
      publishedAt: new Date(),
      invoiceCount: request.assetIds.length,
      status: transactionHash.startsWith('unconfirmed-') ? 'failed' : 'submitted',
    };

    this.pendingTxs.set(result.batchId, result);
    return result;
  }

  /**
   * Execute an approved governance proposal on-chain via the governance-dao
   * contract's `execute_proposal` entry point.
   */
  async executeGovernanceProposal(proposalId: number): Promise<string> {
    if (!this.config.governanceContractHash) {
      throw new Error('governanceContractHash not configured');
    }
    const args = Args.fromMap({ proposal_id: CLValue.newCLUint64(proposalId) });
    return this.callContract(
      this.config.governanceContractHash,
      'execute_proposal',
      args,
      { proposalId }
    );
  }

  /**
   * Execute an oracle slash on-chain via the oracle-slashing contract's
   * `execute_slash` entry point.
   */
  async executeOracleSlash(oracleId: string): Promise<string> {
    if (!this.config.slashingContractHash) {
      throw new Error('slashingContractHash not configured');
    }
    const args = Args.fromMap({ oracle_id: CLValue.newCLString(oracleId) });
    return this.callContract(
      this.config.slashingContractHash,
      'execute_slash',
      args,
      { oracleId }
    );
  }

  /**
   * Check the status of a previously submitted publish transaction by
   * querying its confirmed on-chain execution result.
   */
  async checkStatus(batchId: string): Promise<PublishResult | null> {
    const result = this.pendingTxs.get(batchId);
    if (!result) return null;
    if (result.transactionHash.startsWith('unconfirmed-')) return result;

    try {
      const info = await this.rpcClient.getTransactionByTransactionHash(result.transactionHash);
      const errorMessage = (
        info as unknown as { executionInfo?: { executionResult?: { errorMessage?: string } } }
      ).executionInfo?.executionResult?.errorMessage;
      result.status = errorMessage ? 'failed' : 'confirmed';
    } catch {
      /* node unreachable, keep current status */
    }
    return result;
  }

  /**
   * Builds, signs, and submits a real Casper transaction calling the given
   * contract entry point. Returns the confirmed transaction hash, or a
   * clearly-labeled `unconfirmed-<sha256>` fallback if no key is configured
   * or submission fails.
   */
  private async callContract(
    contractHash: string,
    entryPoint: string,
    args: InstanceType<typeof Args>,
    localHashSeed: unknown
  ): Promise<string> {
    const localHash = this.hashPayload({ contractHash, entryPoint, localHashSeed });

    if (!this.privateKey) {
      console.warn(`[publisher] no deployer key configured; using local hash ${localHash.slice(0, 16)}… (unconfirmed)`);
      return `unconfirmed-${localHash}`;
    }

    try {
      const transaction = new ContractCallBuilder()
        .byHash(contractHash)
        .entryPoint(entryPoint)
        .runtimeArgs(args)
        .from(this.privateKey.publicKey)
        .chainName(this.config.chainName)
        .payment(30_000_000_000) // 30 CSPR, generous for contract-call gas
        .build();

      transaction.sign(this.privateKey);
      const result = await this.rpcClient.putTransaction(transaction);
      return result.transactionHash.toHex();
    } catch (err) {
      console.warn(`[publisher] rpc submit failed for ${entryPoint}, using computed hash:`, err);
      return `unconfirmed-${localHash}`;
    }
  }

  private hashPayload(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private buildLocalHashPayload(request: PublishRequest): unknown {
    return {
      assetIds: request.assetIds,
      trustScores: request.trustScores,
      factorsHashes: request.factorsHashes,
      evidenceHashes: request.evidenceHashes,
    };
  }
}
