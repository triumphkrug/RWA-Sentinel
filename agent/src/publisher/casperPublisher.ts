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
  URef,
} = casperSdk;

interface CasperPublisherConfig {
  nodeUrl: string;
  chainName: string;
  contractHash: string; // attestation-store
  deployerKeyPath: string;
  governanceContractHash?: string;
  slashingContractHash?: string;
  /** Secondary signer used only as the on-chain "oracle owner" role for
   * register_oracle, since the contract rejects self-reports (owner === reporter). */
  oracleOwnerBotKeyPath?: string;
  /** Additional independently-funded accounts used to cast real on-chain
   * governance votes. governance-dao fixes each account's voting_power at
   * 100 and requires 30% of total_staked=1000 (the live on-chain value)
   * to reach quorum (300) — a single account can never pass a proposal,
   * so multiple independently-signed accounts demonstrate a real,
   * non-simulated full governance cycle. */
  extraGovernanceVoterKeyPaths?: string[];
  /** Optional CSPR.cloud API key, required when nodeUrl points at a
   * *.cspr.cloud RPC gateway (returns 401 without it). Some cloud hosts
   * (e.g. Render) cannot reach the public Casper Association RPC node
   * directly, so the CSPR.cloud RPC gateway is used as a fallback there. */
  csprCloudApiKey?: string;
}

/** Real on-chain governance proposal creation result. */
export interface OnChainProposalResult {
  proposalId: number;
  transactionHash: string;
}

/** Real on-chain slashing report creation result. */
export interface OnChainReportResult {
  reportId: string;
  transactionHash: string;
}

export class CasperPublisher {
  private readonly config: CasperPublisherConfig;
  private readonly pendingTxs = new Map<string, PublishResult>();
  private privateKey: InstanceType<typeof PrivateKey> | null = null;
  private oracleOwnerKey: InstanceType<typeof PrivateKey> | null = null;
  private readonly extraVoterKeys: InstanceType<typeof PrivateKey>[] = [];
  private readonly rpcClient: InstanceType<typeof RpcClient>;

  constructor(config: CasperPublisherConfig) {
    this.config = config;
    const handler = new HttpHandler(config.nodeUrl);
    if (config.csprCloudApiKey) {
      handler.setCustomHeaders({ Authorization: config.csprCloudApiKey });
    }
    this.rpcClient = new RpcClient(handler);
    this.privateKey = this.loadKey(config.deployerKeyPath, 'deployer');
    if (config.oracleOwnerBotKeyPath) {
      this.oracleOwnerKey = this.loadKey(config.oracleOwnerBotKeyPath, 'oracle-owner-bot');
    }
    for (const path of config.extraGovernanceVoterKeyPaths ?? []) {
      const key = this.loadKey(path, 'governance-voter');
      if (key) this.extraVoterKeys.push(key);
    }
  }

  private loadKey(keyPath: string, label: string): InstanceType<typeof PrivateKey> | null {
    try {
      // Validate path to prevent directory traversal
      if (keyPath.includes('..') || !keyPath.match(/^[\w.\-/]+$/)) {
        console.warn(`[publisher] invalid ${label} key path`);
        return null;
      }
      const pem = readFileSync(keyPath, 'utf-8');
      const key = PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
      console.log(`[publisher] ${label} key loaded, account:`, key.publicKey.toHex());
      return key;
    } catch {
      console.warn(`[publisher] no ${label} key found at ${keyPath}`);
      return null;
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
   * `execute_slash` entry point (report must be past its 48h challenge
   * period and unchallenged, per contract logic).
   */
  async executeOracleSlash(reportId: string): Promise<string> {
    if (!this.config.slashingContractHash) {
      throw new Error('slashingContractHash not configured');
    }
    const args = Args.fromMap({ report_id: CLValue.newCLString(reportId) });
    return this.callContract(
      this.config.slashingContractHash,
      'execute_slash',
      args,
      { reportId }
    );
  }

  /**
   * Creates a real governance proposal on-chain via `create_proposal`, and
   * returns the numeric proposal_id the contract assigned (its internal
   * counter, read back via query_global_state after confirmation). This is
   * the single source of truth for the on-chain proposal ID - the off-chain
   * GovernanceService must store this id to later call vote/execute for
   * real instead of only simulating in memory.
   */
  async createGovernanceProposalOnChain(
    title: string,
    description: string,
    actionType: number,
    params: string,
    priceBps: number
  ): Promise<OnChainProposalResult> {
    if (!this.config.governanceContractHash) {
      throw new Error('governanceContractHash not configured');
    }
    if (!this.privateKey) {
      throw new Error('deployer key not configured, cannot create on-chain proposal');
    }

    const args = Args.fromMap({
      title: CLValue.newCLString(title),
      description: CLValue.newCLString(description),
      action_type: CLValue.newCLUint64(actionType),
      params: CLValue.newCLString(params),
      price_bps: CLValue.newCLUint64(priceBps),
    });

    const transactionHash = await this.callContract(
      this.config.governanceContractHash,
      'create_proposal',
      args,
      { title, description, actionType, params, priceBps }
    );

    if (transactionHash.startsWith('unconfirmed-')) {
      throw new Error('on-chain proposal creation failed to submit');
    }

    const baselineCount = await this.readProposalCount();
    await this.waitForConfirmation(transactionHash);
    // Global state visible to query_global_state can lag briefly behind the
    // transaction's own execution_result being reported as successful, so
    // poll until the counter actually reflects this specific proposal
    // rather than trusting a single immediate read (which raced ahead and
    // returned a stale, pre-increment value in testing).
    const proposalId = await this.pollForIncrement(() => this.readProposalCount(), baselineCount);
    return { proposalId, transactionHash };
  }

  /**
   * Casts a real on-chain vote for a proposal, signed by the deployer
   * account. The contract caps effective weight at the caller's fixed
   * on-chain voting power (100), regardless of the weight argument passed.
   */
  async voteOnChainProposal(proposalId: number, support: 'for' | 'against', weight = 100): Promise<string> {
    if (!this.config.governanceContractHash) {
      throw new Error('governanceContractHash not configured');
    }
    const args = Args.fromMap({
      proposal_id: CLValue.newCLUint64(proposalId),
      support: CLValue.newCLUint64(support === 'for' ? 1 : 0),
      weight: CLValue.newCLUint64(weight),
    });
    return this.callContract(this.config.governanceContractHash, 'vote', args, { proposalId, support, weight });
  }

  /**
   * Casts a real on-chain vote from a specific non-deployer account (each
   * account can only vote once per proposal_id per the contract).
   */
  private async voteOnChainProposalAs(
    signerKey: InstanceType<typeof PrivateKey>,
    proposalId: number,
    support: 'for' | 'against',
    weight = 100
  ): Promise<string> {
    if (!this.config.governanceContractHash) {
      throw new Error('governanceContractHash not configured');
    }
    const args = Args.fromMap({
      proposal_id: CLValue.newCLUint64(proposalId),
      support: CLValue.newCLUint64(support === 'for' ? 1 : 0),
      weight: CLValue.newCLUint64(weight),
    });
    return this.callContractAs(signerKey, this.config.governanceContractHash, 'vote', args, {
      proposalId,
      support,
      weight,
      signer: signerKey.publicKey.toHex(),
    });
  }

  /**
   * Casts real on-chain votes from every independently-funded account this
   * publisher controls (deployer + oracle-owner-bot + any configured extra
   * voter keys), in the given direction. Each account is capped at its
   * fixed on-chain voting_power (100); with 3 real distinct accounts this
   * can reach the 30%-of-1000 quorum threshold (300) for real, letting
   * execute_proposal genuinely succeed - not a simulation of a full
   * governance cycle, an actual one, just with a small fixed voter set
   * instead of a live public vote. Returns per-account results; a account
   * that already voted on this proposal will report its error but does not
   * abort the batch.
   */
  async castRealQuorumVotes(
    proposalId: number,
    support: 'for' | 'against'
  ): Promise<Array<{ voter: string; result: string | null; error?: string }>> {
    const signers = [this.privateKey, this.oracleOwnerKey, ...this.extraVoterKeys].filter(
      (k): k is InstanceType<typeof PrivateKey> => k !== null,
    );
    const results: Array<{ voter: string; result: string | null; error?: string }> = [];
    for (const signer of signers) {
      try {
        const txHash = await this.voteOnChainProposalAs(signer, proposalId, support);
        if (!txHash.startsWith('unconfirmed-')) {
          await this.waitForConfirmation(txHash);
        }
        results.push({ voter: signer.publicKey.toHex(), result: txHash });
      } catch (error) {
        results.push({
          voter: signer.publicKey.toHex(),
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    // Allow the RPC gateway's global-state view to settle before the caller
    // attempts execute_proposal (see the proposal_count race fixed earlier -
    // the same multi-node lag applies to vote tallies).
    await new Promise((resolve) => setTimeout(resolve, 8000));
    return results;
  }

  /**
   * Ensures an oracle is registered on the on-chain oracle-slashing contract.
   * Registration is signed by the dedicated oracle-owner-bot key (not the
   * deployer), since report_violation reverts with ERR_SELF_REPORT if the
   * reporter and the registered owner are the same account. No-op if the
   * oracle is already registered.
   */
  async ensureOracleRegisteredOnChain(oracleId: string, stakeMotes: string): Promise<string | null> {
    if (!this.config.slashingContractHash) {
      throw new Error('slashingContractHash not configured');
    }
    if (!this.oracleOwnerKey) {
      throw new Error('oracleOwnerBotKeyPath not configured, cannot register oracle on-chain');
    }

    const alreadyRegistered = await this.queryOracleExists(oracleId);
    if (alreadyRegistered) return null;

    const mainPurse = await this.getMainPurse(this.oracleOwnerKey.publicKey.accountHash().toPrefixedString());
    const args = Args.fromMap({
      oracle_id: CLValue.newCLString(oracleId),
      stake: CLValue.newCLUInt512(stakeMotes),
      source_purse: CLValue.newCLUref(URef.fromString(mainPurse)),
    });

    const transaction = new ContractCallBuilder()
      .byHash(this.config.slashingContractHash)
      .entryPoint('register_oracle')
      .runtimeArgs(args)
      .from(this.oracleOwnerKey.publicKey)
      .chainName(this.config.chainName)
      .payment(30_000_000_000)
      .build();
    transaction.sign(this.oracleOwnerKey);
    const result = await this.rpcClient.putTransaction(transaction);
    return result.transactionHash.toHex();
  }

  /**
   * Reports a violation on-chain (signed by the deployer as reporter) and
   * returns the real on-chain report_id, needed for a later execute_slash
   * call once the 48h challenge period elapses unchallenged.
   */
  async reportViolationOnChain(oracleId: string, severity: number, evidence: string): Promise<OnChainReportResult> {
    if (!this.config.slashingContractHash) {
      throw new Error('slashingContractHash not configured');
    }
    if (!this.privateKey) {
      throw new Error('deployer key not configured, cannot report violation on-chain');
    }

    const args = Args.fromMap({
      oracle_id: CLValue.newCLString(oracleId),
      severity: CLValue.newCLUint64(severity),
      evidence: CLValue.newCLString(evidence),
    });

    const transactionHash = await this.callContract(
      this.config.slashingContractHash,
      'report_violation',
      args,
      { oracleId, severity, evidence }
    );

    if (transactionHash.startsWith('unconfirmed-')) {
      throw new Error('on-chain violation report failed to submit');
    }

    const baselineCounter = await this.readReportCounter();
    await this.waitForConfirmation(transactionHash);
    const counter = await this.pollForIncrement(() => this.readReportCounter(), baselineCounter);
    const reportId = `report_${counter - 1}`; // report_violation uses counter pre-increment, then increments
    return { reportId, transactionHash };
  }

  /** Polls a global-state read until it reflects an increment past `baseline`
   * (handles the brief lag between a transaction's execution_result being
   * reported successful and query_global_state reflecting the new value). */
  private async pollForIncrement(read: () => Promise<number>, baseline: number, timeoutMs = 60_000): Promise<number> {
    const start = Date.now();
    // Require the counter to be exactly baseline+1 (create_proposal/
    // report_violation always increment by exactly 1 per call). The
    // previous "stabilizes above baseline" tolerance was a workaround for
    // reads that always returned 0 - which turned out to be a CLValue
    // parsing bug (see queryGlobalStateValue), not real inconsistency, so
    // the stricter exact-match is safe again and avoids ever assigning a
    // proposal/report id that belongs to a different call.
    while (Date.now() - start < timeoutMs) {
      const value = await read();
      if (value === baseline + 1) return value;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error(`timed out waiting for on-chain counter to reach exactly ${baseline + 1}`);
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
    return this.callContractAs(this.privateKey, contractHash, entryPoint, args, localHashSeed);
  }

  private async callContractAs(
    signerKey: InstanceType<typeof PrivateKey> | null,
    contractHash: string,
    entryPoint: string,
    args: InstanceType<typeof Args>,
    localHashSeed: unknown
  ): Promise<string> {
    const localHash = this.hashPayload({ contractHash, entryPoint, localHashSeed });

    if (!signerKey) {
      console.warn(`[publisher] no signer key configured; using local hash ${localHash.slice(0, 16)}… (unconfirmed)`);
      return `unconfirmed-${localHash}`;
    }

    try {
      const transaction = new ContractCallBuilder()
        .byHash(contractHash)
        .entryPoint(entryPoint)
        .runtimeArgs(args)
        .from(signerKey.publicKey)
        .chainName(this.config.chainName)
        .payment(30_000_000_000) // 30 CSPR, generous for contract-call gas
        .build();

      transaction.sign(signerKey);
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

  /** Polls a submitted transaction until the node reports a final execution result. */
  private async waitForConfirmation(transactionHash: string, timeoutMs = 60_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const info = await this.rpcClient.getTransactionByTransactionHash(transactionHash);
        const executionResult = (
          info as unknown as { executionInfo?: { executionResult?: { errorMessage?: string | null } } }
        ).executionInfo?.executionResult;
        if (executionResult) {
          if (executionResult.errorMessage) {
            throw new Error(`on-chain execution failed: ${executionResult.errorMessage}`);
          }
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('on-chain execution failed')) throw err;
        // node hasn't indexed the transaction yet, keep polling
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(`timed out waiting for confirmation of ${transactionHash}`);
  }

  private async queryGlobalStateValue(contractHash: string, path: string[]): Promise<unknown> {
    const result = await this.rpcClient.getStateItem(null, `hash-${contractHash}`, path);
    // The response shape for a CLValue differs by RPC backend: the
    // reference Casper node returns { cl_type, bytes, parsed }, while
    // CSPR.cloud's gateway (used here since Render can't reach the
    // reference node directly - see publisher rewrite notes) normalizes it
    // straight to a bare value on `clValue` with no `.parsed` wrapper.
    // Reading only `.clValue.parsed` silently returned undefined -> 0 for
    // every call once the CSPR.cloud gateway became the default, which
    // looked exactly like gateway state-consistency lag but was actually
    // this parsing bug. Handle both shapes.
    const clValue = (result as unknown as { storedValue?: { clValue?: unknown } }).storedValue?.clValue;
    if (clValue && typeof clValue === 'object' && 'parsed' in (clValue as Record<string, unknown>)) {
      return (clValue as { parsed?: unknown }).parsed;
    }
    return clValue;
  }

  private async readProposalCount(): Promise<number> {
    const value = await this.queryGlobalStateValue(this.config.governanceContractHash!, ['proposal_count']);
    return Number(value ?? 0);
  }

  private async readReportCounter(): Promise<number> {
    const value = await this.queryGlobalStateValue(this.config.slashingContractHash!, ['report_counter']);
    return Number(value ?? 0);
  }

  /**
   * Query the on-chain total_staked value from the oracle-slashing contract.
   * Returns 0 if the value cannot be read.
   */
  async queryTotalStaked(): Promise<number> {
    if (!this.config.slashingContractHash) return 0;
    const value = await this.queryGlobalStateValue(this.config.slashingContractHash, ['total_staked']);
    return Number(value ?? 0);
  }

  /**
   * Query on-chain oracle stake from the oracle-slashing dictionary.
   * Returns the stake amount for a given oracle/public key, or 0 if not found.
   */
  async queryOracleStake(oracleId: string): Promise<number> {
    if (!this.config.slashingContractHash) return 0;
    try {
      const result = await this.rpcClient.getStateItem(null, `hash-${this.config.slashingContractHash}`, [
        'oracle_dict',
        oracleId,
      ]);
      // OracleRecord is a tuple: ((id, owner, stake), (violations...), (reputation...))
      const stored = result as any;
      const clValue = stored?.storedValue?.clValue;
      if (clValue && typeof clValue === 'object') {
        const parsed = 'parsed' in clValue ? (clValue as any).parsed : clValue;
        // Extract stake from the tuple structure
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          return Number(parsed[0][2] ?? 0);
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private async queryOracleExists(oracleId: string): Promise<boolean> {
    try {
      await this.rpcClient.getStateItem(null, `hash-${this.config.slashingContractHash}`, [
        'oracle_dict',
        oracleId,
      ]);
      return true;
    } catch {
      // query_global_state errors with "value was not found" when the
      // dictionary entry doesn't exist yet - treat any failure as "not registered".
      return false;
    }
  }

  private async getMainPurse(accountHash: string): Promise<string> {
    const result = await this.rpcClient.getStateItem(null, accountHash, []);
    const purse = (result as unknown as { storedValue?: { account?: { mainPurse?: string } } }).storedValue?.account
      ?.mainPurse;
    if (!purse) throw new Error(`could not resolve main purse for ${accountHash}`);
    return purse;
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
