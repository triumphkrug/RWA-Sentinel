import { GovernanceService } from '../agent/src/governance/dao';
import { OracleSlashingService } from '../agent/src/slashing/oracleSlashing';
import type { CasperPublisher } from '../agent/src/publisher/casperPublisher';
import type { PublishResult } from '../agent/src/publisher/types';

const HIGH_STAKE_KEY = '01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3'; // simulated 100,000 stake
const MID_STAKE_KEY = '02a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4'; // simulated 50,000 stake

function mockPublishResult(overrides: Partial<PublishResult> = {}): PublishResult {
  return {
    batchId: 'batch-1',
    transactionHash: '0xdeadbeef',
    publishedAt: new Date(),
    invoiceCount: 1,
    status: 'confirmed',
    ...overrides,
  };
}

type GovernancePublisherMock = Pick<
  CasperPublisher,
  'publishBatch' | 'createGovernanceProposalOnChain' | 'voteOnChainProposal' | 'executeGovernanceProposal'
>;
type SlashingPublisherMock = Pick<
  CasperPublisher,
  'publishBatch' | 'ensureOracleRegisteredOnChain' | 'reportViolationOnChain' | 'executeOracleSlash'
>;

function makeGovernancePublisher(): jest.Mocked<GovernancePublisherMock> {
  return {
    publishBatch: jest.fn().mockResolvedValue(mockPublishResult()),
    createGovernanceProposalOnChain: jest.fn().mockResolvedValue({ proposalId: 1, transactionHash: '0xonchainprop' }),
    voteOnChainProposal: jest.fn().mockResolvedValue('0xonchainvote'),
    executeGovernanceProposal: jest.fn().mockResolvedValue('0xonchainexec'),
  };
}

function makeSlashingPublisher(): jest.Mocked<SlashingPublisherMock> {
  return {
    publishBatch: jest.fn().mockResolvedValue(mockPublishResult()),
    ensureOracleRegisteredOnChain: jest.fn().mockResolvedValue('0xonchainregister'),
    reportViolationOnChain: jest.fn().mockResolvedValue({ reportId: 'report_0', transactionHash: '0xonchainreport' }),
    executeOracleSlash: jest.fn().mockResolvedValue('0xonchainslash'),
  };
}

describe('GovernanceService', () => {
  let publisher: jest.Mocked<GovernancePublisherMock>;
  let governance: GovernanceService;

  beforeEach(() => {
    publisher = makeGovernancePublisher();
    governance = new GovernanceService(
      { votingPeriodHours: 168, quorumThresholdPercent: 51, minProposalStake: 1000 },
      publisher as unknown as CasperPublisher,
    );
  });

  test('creates a proposal for a proposer meeting minimum stake', async () => {
    const proposal = await governance.createProposal(
      'parameter_change',
      'Adjust scoring weight for issuer history',
      HIGH_STAKE_KEY,
      { factor: 'issuerHistory', newWeight: 30 },
    );
    expect(proposal.id).toMatch(/^PROP-[0-9a-f]{8}$/);
    expect(proposal.status).toBe('voting');
    expect(proposal.votesFor).toBe(0);
    expect(proposal.votesAgainst).toBe(0);
  });

  test('rejects proposal creation when proposer stake is below minimum', async () => {
    await expect(
      governance.createProposal('parameter_change', 'Low-stake attempt', 'low-stake-key', {}),
    ).rejects.toThrow(/does not meet minimum stake/);
  });

  test('records votes weighted by stake and prevents double voting', async () => {
    const proposal = await governance.createProposal(
      'parameter_change',
      'Adjust scoring weight for issuer history',
      HIGH_STAKE_KEY,
      {},
    );
    const updated = await governance.voteOnProposal(proposal.id, HIGH_STAKE_KEY, 'for');
    expect(updated.votesFor).toBe(100_000);

    await expect(governance.voteOnProposal(proposal.id, HIGH_STAKE_KEY, 'for')).rejects.toThrow(
      /already voted/,
    );
  });

  test('rejects voting on an unknown proposal', async () => {
    await expect(governance.voteOnProposal('PROP-00000000', HIGH_STAKE_KEY, 'for')).rejects.toThrow(
      /not found/,
    );
  });

  test('rejects execution while voting period is still open', async () => {
    const proposal = await governance.createProposal(
      'parameter_change',
      'Adjust scoring weight for issuer history',
      HIGH_STAKE_KEY,
      {},
    );
    await expect(governance.executeProposal(proposal.id)).rejects.toThrow(/still open/);
  });

  test('rejects execution when quorum is not met after voting closes', async () => {
    const proposal = await governance.createProposal(
      'parameter_change',
      'Adjust scoring weight for issuer history',
      HIGH_STAKE_KEY,
      {},
    );
    // Force the voting window closed without enough votes to reach the 51% quorum
    // of the simulated 1,000,000 total stake.
    proposal.votingEndsAt = new Date(Date.now() - 1000);

    await expect(governance.executeProposal(proposal.id)).rejects.toThrow(/Quorum not met/);
    expect(governance.getProposal(proposal.id)?.status).toBe('rejected');
  });

  test('executes an approved proposal via the publisher and marks it executed', async () => {
    const proposal = await governance.createProposal(
      'parameter_change',
      'Adjust scoring weight for issuer history',
      HIGH_STAKE_KEY,
      { factor: 'issuerHistory', newWeight: 30 },
    );
    await governance.voteOnProposal(proposal.id, HIGH_STAKE_KEY, 'for');
    await governance.voteOnProposal(proposal.id, MID_STAKE_KEY, 'for');
    // Force voting window closed with enough stake voted 'for' to clear quorum (51% of 1,000,000).
    proposal.votingEndsAt = new Date(Date.now() - 1000);
    proposal.votesFor = 600_000;

    const executed = await governance.executeProposal(proposal.id);
    expect(executed.status).toBe('executed');
    expect(publisher.createGovernanceProposalOnChain).toHaveBeenCalledTimes(1);
    expect(publisher.executeGovernanceProposal).toHaveBeenCalledWith(1);
  });
});

describe('OracleSlashingService', () => {
  let publisher: jest.Mocked<SlashingPublisherMock>;
  let slashing: OracleSlashingService;

  beforeEach(() => {
    publisher = makeSlashingPublisher();
    slashing = new OracleSlashingService(
      {
        challengePeriodHours: 48,
        slashingPenaltyPercent: 10,
        reporterRewardPercent: 60,
        challengerRewardPercent: 20,
        minChallengeStake: 100,
      },
      publisher as unknown as CasperPublisher,
    );
  });

  test('creates a pending misbehavior report with a 48h challenge window', async () => {
    const before = Date.now();
    const report = await slashing.reportMisbehavior(
      'oracle_alpha',
      'attestation-1',
      HIGH_STAKE_KEY,
      'evidence-hash-1',
    );
    expect(report.id).toMatch(/^SLASH-[0-9a-f]{8}$/);
    expect(report.status).toBe('pending');
    const windowHours = (report.challengePeriodEndsAt.getTime() - before) / (1000 * 60 * 60);
    expect(windowHours).toBeGreaterThan(47.9);
    expect(windowHours).toBeLessThan(48.1);
  });

  test('rejects a challenge below the minimum challenge stake', async () => {
    const report = await slashing.reportMisbehavior('oracle_alpha', 'attestation-1', HIGH_STAKE_KEY, 'evidence-hash-1');
    await expect(slashing.challengeReport(report.id, MID_STAKE_KEY, 10)).rejects.toThrow(
      /must be at least/,
    );
  });

  test('accepts a valid challenge and moves the report to challenged status', async () => {
    const report = await slashing.reportMisbehavior('oracle_alpha', 'attestation-1', HIGH_STAKE_KEY, 'evidence-hash-1');
    const challenged = await slashing.challengeReport(report.id, MID_STAKE_KEY, 500);
    expect(challenged.status).toBe('challenged');
    expect(challenged.challengerPublicKey).toBe(MID_STAKE_KEY);
  });

  test('rejects executing a slash before evidence is validated', async () => {
    const report = await slashing.reportMisbehavior('oracle_alpha', 'attestation-1', HIGH_STAKE_KEY, 'evidence-hash-1');
    await expect(slashing.executeSlash(report.id)).rejects.toThrow(/not validated/);
  });

  test('executes a slash via the publisher once evidence is validated as valid', async () => {
    const report = await slashing.reportMisbehavior('oracle_alpha', 'attestation-1', HIGH_STAKE_KEY, 'evidence-hash-1');
    await slashing.validateEvidence(report.id, true);
    const executed = await slashing.executeSlash(report.id);
    expect(executed.status).toBe('slashed');
    expect(publisher.reportViolationOnChain).toHaveBeenCalledTimes(1);
    expect(publisher.executeOracleSlash).toHaveBeenCalledWith('report_0');
  });

  test('does not execute a slash when evidence is validated as invalid', async () => {
    const report = await slashing.reportMisbehavior('oracle_alpha', 'attestation-1', HIGH_STAKE_KEY, 'evidence-hash-1');
    await slashing.validateEvidence(report.id, false);
    await expect(slashing.executeSlash(report.id)).rejects.toThrow(/not validated/);
    expect(slashing.getReport(report.id)?.status).toBe('invalidated');
  });
});
