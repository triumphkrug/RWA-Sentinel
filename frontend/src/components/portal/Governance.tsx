import React, { useEffect, useState } from 'react';
import {
  getGovernanceProposals, postGovernancePropose, postGovernanceVote, postGovernanceExecute,
  deleteGovernanceProposal,
  Proposal, ErrorResponse
} from '../../lib/api';
import { useClickRef } from '../../lib/click';
import { Loader2, XCircle, Gavel, Plus, ThumbsUp, ThumbsDown, Play, CheckCircle, Clock, AlertCircle, Trash2, Wallet } from 'lucide-react';
import PageInfo from './PageInfo';

const Governance: React.FC = () => {
  const { publicKey: walletKey } = useClickRef();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'parameter_change' | 'contract_upgrade' | 'treasury_spend'>('parameter_change');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGovernanceProposals();
      setProposals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProposals(); }, []);

  const handlePropose = async () => {
    if (!walletKey) {
      setActionError('Connect your wallet to create a proposal');
      return;
    }
    if (!formDesc.trim()) {
      setActionError('Description is required');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await postGovernancePropose({
        type: formType,
        description: formDesc.trim(),
        proposerPublicKey: walletKey,
        executionData: {},
      });
      setFormDesc('');
      setShowForm(false);
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: string, choice: 'for' | 'against') => {
    if (!walletKey) {
      setActionError('Connect your wallet to vote');
      return;
    }
    setActionError(null);
    try {
      await postGovernanceVote({ proposalId, voterPublicKey: walletKey, choice });
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to vote');
    }
  };

  const handleExecute = async (proposalId: string) => {
    if (!walletKey) {
      setActionError('Connect your wallet to execute proposals');
      return;
    }
    setActionError(null);
    try {
      await postGovernanceExecute({ proposalId, executorPublicKey: walletKey });
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute');
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!walletKey) {
      setActionError('Connect your wallet to delete a proposal');
      return;
    }
    setActionError(null);
    try {
      await deleteGovernanceProposal(proposalId, walletKey);
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete proposal');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
      voting: { bg: 'bg-blue-100 text-blue-700', icon: <Gavel className="h-3 w-3" /> },
      approved: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
      executed: { bg: 'bg-purple-100 text-purple-700', icon: <Play className="h-3 w-3" /> },
      expired: { bg: 'bg-gray-100 text-gray-500', icon: <Clock className="h-3 w-3" /> },
    };
    const s = styles[status] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
        {s.icon} {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading governance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-blue-600" /> Governance DAO
          </h2>
          <p className="text-gray-500 mt-1">Create proposals, vote, and execute on-chain governance actions. Proposers must be registered oracle accounts with sufficient stake.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!walletKey}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!walletKey ? 'Connect wallet first' : 'Create a new proposal'}
        >
          <Plus className="h-4 w-4" /> New Proposal
        </button>
      </div>

      {!walletKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Wallet not connected</p>
            <p className="text-xs text-amber-600 mt-0.5">Connect your Casper wallet in the sidebar to create proposals, vote, and execute governance actions.</p>
          </div>
        </div>
      )}

      <PageInfo title="How does Governance DAO work?">
        <p>The Governance DAO allows registered oracle accounts to propose, vote on, and execute parameter changes to the RWA-Sentinel system. Proposals go through a <strong>48-hour voting period</strong> with a 51% quorum threshold. Supported proposal types: parameter changes (e.g., scoring weights), contract upgrades, and treasury spends.</p>
        <p className="mt-1">Each proposal is created both off-chain (for the demo UI) and on-chain via the <code>governance-dao</code> Casper smart contract. Votes are weighted by stake — registered oracle accounts have higher voting power.</p>
        <p className="mt-2 text-xs text-gray-500"><strong>🔑 Why connect a wallet?</strong> Your wallet's public key identifies you as the proposer, voter, or executor. It determines your on-chain stake weight, prevents double-voting, and ensures only you can delete your own proposals. On-chain transactions are relayed by the backend's deployer key on your behalf.</p>
      </PageInfo>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Create Proposal Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Proposal</h3>
          <p className="text-sm text-gray-500 mb-4">Your connected wallet public key will be used as the proposer identity. Known oracle accounts have higher voting power.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="parameter_change">Parameter Change</option>
                <option value="contract_upgrade">Contract Upgrade</option>
                <option value="treasury_spend">Treasury Spend</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Describe what this proposal does..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePropose}
                disabled={submitting || !formDesc.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Submit Proposal
              </button>
              <button
                onClick={() => { setShowForm(false); setFormDesc(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Proposing as: <code className="bg-gray-100 px-1 rounded font-mono">{walletKey?.substring(0, 16)}…</code>
            </p>
          </div>
        </div>
      )}

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Gavel className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No proposals yet</p>
          <p className="text-sm text-gray-500 mt-1">Create the first governance proposal to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map(proposal => (
            <div key={proposal.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(proposal.status)}
                    <span className="text-xs text-gray-400 capitalize">{(proposal.type || '').replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-gray-900 font-medium">{proposal.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {proposal.id.substring(0, 8)}... · Proposer: {(proposal.proposerPublicKey || '').substring(0, 12)}...
                  </p>
                </div>
              </div>

              {/* Voting bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>For: {proposal.votesFor}</span>
                  <span>Against: {proposal.votesAgainst}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                  {(proposal.votesFor + proposal.votesAgainst) > 0 ? (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }} />
                      <div className="bg-red-400 h-full" style={{ width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }} />
                    </>
                  ) : (
                    <div className="bg-gray-200 h-full w-full" />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {(proposal.status === 'voting' || proposal.status === 'pending') && (
                  <>
                    <button
                      onClick={() => handleVote(proposal.id, 'for')}
                      disabled={!walletKey}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!walletKey ? 'Connect wallet to vote' : 'Vote For'}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Vote For
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 'against')}
                      disabled={!walletKey}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!walletKey ? 'Connect wallet to vote' : 'Vote Against'}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Vote Against
                    </button>
                  </>
                )}
                {proposal.status === 'approved' && (
                  <button
                    onClick={() => handleExecute(proposal.id)}
                    disabled={!walletKey}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!walletKey ? 'Connect wallet to execute' : 'Execute proposal'}
                  >
                    <Play className="h-3.5 w-3.5" /> Execute
                  </button>
                )}
                {walletKey && walletKey === proposal.proposerPublicKey && (
                  <button
                    onClick={() => handleDelete(proposal.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 ml-auto"
                    title="Delete your proposal"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>

              {/* Dates */}
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                <span>Created: {new Date(proposal.createdAt).toLocaleString()}</span>
                <span>Voting ends: {new Date(proposal.votingEndsAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Governance;
