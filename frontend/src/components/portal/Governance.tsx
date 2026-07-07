import React, { useEffect, useState } from 'react';
import {
  getGovernanceProposals, postGovernancePropose, postGovernanceVote, postGovernanceExecute,
  Proposal, ErrorResponse
} from '../../lib/api';
import { useClickRef } from '../../lib/click';
import { Loader2, XCircle, Gavel, Plus, ThumbsUp, ThumbsDown, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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
    if (!formDesc.trim()) {
      setActionError('Description is required');
      return;
    }
    const pubKey = walletKey || '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79';
    setSubmitting(true);
    setActionError(null);
    try {
      await postGovernancePropose({
        type: formType,
        description: formDesc.trim(),
        proposerPublicKey: pubKey,
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
    const pubKey = walletKey || '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79';
    setActionError(null);
    try {
      await postGovernanceVote({ proposalId, voterPublicKey: pubKey, support: choice });
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to vote');
    }
  };

  const handleExecute = async (proposalId: string) => {
    const pubKey = walletKey || '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79';
    setActionError(null);
    try {
      await postGovernanceExecute({ proposalId, executorPublicKey: pubKey });
      await fetchProposals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute');
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Proposal
        </button>
      </div>

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
          <p className="text-sm text-gray-500 mb-4">Requires a connected wallet with registered oracle account (min stake: 1,000 CSPR). Known deployer accounts are pre-authorized.</p>
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
              {walletKey
                ? `Proposing as: ${walletKey.substring(0, 12)}...`
                : 'Connect your wallet to propose with your account, or the default deployer key will be used.'}
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
              <div className="flex gap-2">
                {(proposal.status === 'voting' || proposal.status === 'pending') && (
                  <>
                    <button
                      onClick={() => handleVote(proposal.id, 'for')}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Vote For
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 'against')}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Vote Against
                    </button>
                  </>
                )}
                {proposal.status === 'approved' && (
                  <button
                    onClick={() => handleExecute(proposal.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                  >
                    <Play className="h-3.5 w-3.5" /> Execute
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
