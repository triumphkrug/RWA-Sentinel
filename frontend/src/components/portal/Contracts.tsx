import React from 'react';
import { FileText, Shield, Scale, Eye, Key, Coins, Link, Code, Info, ExternalLink } from 'lucide-react';

interface ContractInfo {
  hash: string;
  description: string;
  icon: React.ReactNode;
  account: string;
  status: 'live' | 'superseded';
  functions: { name: string; description: string }[];
}

const CONTRACTS: Record<string, ContractInfo> = {
  'Asset Registry': {
    hash: 'eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
    description:
      'On-chain registry for real-world assets. Stores asset metadata, ownership records, and NFT status for every verified RWA.',
    icon: <FileText className="h-7 w-7 text-blue-600" />,
    account: 'Main deployer (secp256k1)',
    status: 'live',
    functions: [
      { name: 'register_asset(asset_id, metadata)', description: 'Register a new RWA with metadata' },
      { name: 'get_asset(asset_id)', description: 'Retrieve asset details' },
      { name: 'update_asset_metadata(asset_id, new_metadata)', description: 'Update metadata for an existing asset' },
    ],
  },
  'Attestation Store': {
    hash: 'cffc53be1c57d4dc04c01515114a8e8cc8237e4ab12314e9fa0eabb7bac846a5',
    description:
      'Stores oracle attestations as on-chain Soulbound Tokens (SBTs). Manages trust scores, oracle registration, and DAO-governed invalidation with caller authentication.',
    icon: <Shield className="h-7 w-7 text-emerald-600" />,
    account: '2nd deployer (ed25519)',
    status: 'live',
    functions: [
      { name: 'mint_attestation(asset_id, score, hash, expires_at)', description: 'Mint an SBT attestation for an asset' },
      { name: 'batch_attest(asset_ids, scores, hashes)', description: 'Batch-mint attestations (registered oracles only)' },
      { name: 'register_oracle(oracle_address)', description: 'Add an oracle to the allow-list (installer only)' },
      { name: 'dao_invalidate(attestation_hash, oracle_sigs)', description: 'DAO-governed attestation invalidation (caller-authenticated)' },
      { name: 'slash_oracle(oracle_id, amount)', description: 'Slash an oracle\'s stake (funds stay in stake_purse)' },
    ],
  },
  'Governance DAO': {
    hash: '847a8016434662fa70c0ff7467f0a4c4358baffd3a53e2a403c75b35c8c31138',
    description:
      'Decentralized governance for protocol parameters. Supports proposal creation, stake-weighted voting, and on-chain execution with quorum enforcement.',
    icon: <Scale className="h-7 w-7 text-violet-600" />,
    account: 'Main deployer (secp256k1)',
    status: 'live',
    functions: [
      { name: 'create_proposal(title, description, action_type, data, deposit)', description: 'Submit a new governance proposal' },
      { name: 'vote(proposal_id, support, weight)', description: 'Cast a stake-weighted vote' },
      { name: 'execute_proposal(proposal_id)', description: 'Execute an approved proposal (quorum required)' },
      { name: 'veto_proposal(proposal_id)', description: 'Emergency veto (installer only)' },
    ],
  },
  'Oracle Slashing': {
    hash: 'cf0e671c550c3cf3a320f99b0f04be161b3b6946fb1ad6d397b8f9f21f9237df',
    description:
      'Manages oracle stake deposits, violation reporting, and permissionless slashing. Uses deposit-first registration pattern with on-chain balance verification.',
    icon: <Eye className="h-7 w-7 text-amber-600" />,
    account: '3rd deployer (ed25519)',
    status: 'live',
    functions: [
      { name: 'register_oracle(oracle_id, stake)', description: 'Register oracle after depositing stake into contract purse' },
      { name: 'report_violation(oracle_id, severity, evidence)', description: 'Report a violation against an oracle' },
      { name: 'execute_slash(oracle_id, report_id)', description: 'Execute slashing after challenge period (permissionless)' },
      { name: 'withdraw_stake(oracle_id, amount)', description: 'Withdraw staked funds (owner only)' },
    ],
  },
  'KYC Gate': {
    hash: '6e0dd2dc7673cf5c7c4e99ad5c956320a3f0f19db4cdb2293eab222611aa58d5',
    description:
      'On-chain KYC verification proxy modeled on the official Casper KYC reference contract. Manages KYC provider registration and user verification status.',
    icon: <Key className="h-7 w-7 text-cyan-600" />,
    account: '2nd deployer (ed25519)',
    status: 'live',
    functions: [
      { name: 'add_kyc_provider(provider_address)', description: 'Register a KYC verification provider (installer only)' },
      { name: 'set_kyc_status(user_address, status)', description: 'Set KYC verification status (provider only)' },
      { name: 'get_kyc_status(user_address)', description: 'Check KYC status for an address' },
    ],
  },
  'Deposit Stake Session': {
    hash: 'session-wasm (not installed)',
    description:
      'Session WASM helper for oracle staking. Transfers CSPR from caller\'s purse directly into the oracle-slashing contract\'s stake_purse, avoiding URef access-rights issues.',
    icon: <Coins className="h-7 w-7 text-orange-600" />,
    account: 'Per-caller session',
    status: 'live',
    functions: [
      { name: 'call(stake_purse_uref, amount)', description: 'Transfer CSPR to contract stake purse' },
    ],
  },
};

const EXPLORER_BASE_URL = 'https://testnet.cspr.live';

const statusBadge = (status: 'live' | 'superseded') =>
  status === 'live' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      ● Live on Testnet
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Superseded
    </span>
  );

const Contracts: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Smart Contracts</h2>
      <p className="text-gray-700">
        RWA-Sentinel deploys <strong>6 smart contracts</strong> on the Casper testnet, covering asset registration,
        attestation storage, governance, oracle slashing, KYC verification, and stake deposits.
        All contracts are compiled to optimized WASM (&lt;64 KB each).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(CONTRACTS).map(([name, info]) => (
          <div
            key={name}
            className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {info.icon}
                <h3 className="text-xl font-semibold text-gray-900 ml-3">{name}</h3>
              </div>
              {statusBadge(info.status)}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4">{info.description}</p>

            {/* Hash */}
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1 font-medium">Contract Hash</p>
              <code className="text-xs text-gray-800 break-all font-mono">{info.hash}</code>
              <p className="text-xs text-gray-400 mt-1">Deployed from: {info.account}</p>
            </div>

            {/* Explorer link */}
            {!info.hash.startsWith('session') && (
              <a
                href={`${EXPLORER_BASE_URL}/contract/${info.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
              >
                View on Casper Explorer <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            )}

            {/* Entry Points */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <Code className="h-4 w-4 text-gray-500 mr-1.5" /> Entry Points
              </h4>
              <ul className="space-y-2">
                {info.functions.map((fn) => (
                  <li key={fn.name} className="text-sm">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">
                      {fn.name}
                    </code>
                    <span className="text-gray-500 ml-1.5 text-xs">— {fn.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex items-start space-x-4">
        <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract Architecture</h3>
          <p className="text-gray-700 text-sm">
            Contracts are deployed across <strong>3 separate accounts</strong> to work around the Casper testnet's
            per-account install limit (~2 installs). Each contract is independently verified and compiled with{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">wasm-opt -Oz</code> for minimal on-chain
            footprint. The oracle network backend handles most contract interactions automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contracts;
