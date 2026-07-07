import React, { useEffect, useState } from 'react';
import { useClickRef } from '../../lib/click';
import {
  getGovernanceProposals,
  postGovernancePropose,
  postGovernanceVote,
  postGovernanceExecute,
  Proposal,
  ProposeRequest,
  VoteRequest,
  ExecuteRequest,
  ErrorResponse,
  ProposalStatus,
} from '../../lib/api';
import { Loader2, XCircle, PlusCircle, CheckCircle, ThumbsUp, ThumbsDown, Play } from 'lucide-react';

const Governance: React.FC = () => {
  const { publicKey } = useClickRef();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [newProposal, setNewProposal] = useState<ProposeRequest>({
    title: '',
    description: '',
    target_contract: '',
    target_method: '',
    parameters: {},
    duration_days: 7,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGovernanceProposals();
      setProposals(data.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()));
    } catch (err: any) {
      const errorRes: ErrorResponse = err;
      setError(errorRes.message || 'Failed to fetch proposals');
      console.error('Error fetching proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleProposeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProposal((prev) => ({ ...prev, [name]: value }));
  };

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      // Basic validation
      if (!newProposal.title || !newProposal.description) {
        throw new Error('Title and Description are required.');
      }
      // Assuming parameters might be JSON string
      const payload = {
        ...newProposal,
        parameters: typeof newProposal.parameters === 'string' ? JSON.parse(newProposal.parameters) : (newProposal.parameters || {}),
        duration_days: Number(newProposal.duration_days) || 7,
      };
      await postGovernancePropose(payload);
      setFormSuccess('Proposal submitted successfully!');
      setNewProposal({ title: '', description: '', target_contract: '', target_method: '', parameters: {}, duration_days: 7 });
      setShowProposeForm(false);
      fetchProposals(); // Refresh list
    } catch (err: any) {
      const errorMsg = err.message || (err as ErrorResponse).message || 'Failed to submit proposal';
      setFormError(errorMsg);
      console.error('Error submitting proposal:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleVote = async (proposalId: string, support: boolean) => {
    const voterAddress = publicKey;
    if (!voterAddress) {
      alert('Please connect your wallet via CSPR.click to vote.');
      return;
    }

    if (!confirm(`Are you sure you want to vote ${support ? 'FOR' : 'AGAINST'} this proposal?`)) {
      return;
    }

    try {
      const voteRequest: VoteRequest = {
        proposal_id: proposalId,
        voter: voterAddress,
        support: support,
        weight: 100, // Example weight, could be based on token balance
      };
      await postGovernanceVote(voteRequest);
      alert('Vote cast successfully!');
      fetchProposals(); // Refresh list
    } catch (err: any) {
      const errorMsg = (err as ErrorResponse).message || 'Failed to cast vote';
      alert(`Error: ${errorMsg}`);
      console.error('Error casting vote:', err);
    }
  };

  const handleExecute = async (proposalId: string) => {
    const executorAddress = publicKey;
    if (!executorAddress) {
      alert('Please connect your wallet via CSPR.click to execute proposals.');
      return;
    }

    if (!confirm('Are you sure you want to execute this proposal? This action is irreversible.')) {
      return;
    }

    try {
      const executeRequest: ExecuteRequest = {
        proposal_id: proposalId,
        executor: executorAddress,
      };
      await postGovernanceExecute(executeRequest);
      alert('Proposal executed successfully!');
      fetchProposals(); // Refresh list
    } catch (err: any) {
      const errorMsg = (err as ErrorResponse).message || 'Failed to execute proposal';
      alert(`Error: ${errorMsg}`);
      console.error('Error executing proposal:', err);
    }
  };

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Active</span>;
      case 'passed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>;
      case 'executed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Executed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading governance proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
        <XCircle className="h-5 w-5 mr-3" />
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">DAO Governance</h2>

      {/* Create Proposal */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Create New Proposal</h3>
          <button
            onClick={() => setShowProposeForm(!showProposeForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            {showProposeForm ? 'Hide Form' : 'New Proposal'}
          </button>
        </div>

        {showProposeForm && (
          <form onSubmit={handleProposeSubmit} className="space-y-4 mt-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                name="title"
                id="title"
                value={newProposal.title}
                onChange={handleProposeChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                id="description"
                rows={4}
                value={newProposal.description}
                onChange={handleProposeChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              ></textarea>
            </div>
            <div>
              <label htmlFor="target_contract" className="block text-sm font-medium text-gray-700">Target Contract (Optional)</label>
              <input
                type="text"
                name="target_contract"
                id="target_contract"
                value={newProposal.target_contract || ''}
                onChange={handleProposeChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="target_method" className="block text-sm font-medium text-gray-700">Target Method (Optional)</label>
              <input
                type="text"
                name="target_method"
                id="target_method"
                value={newProposal.target_method || ''}
                onChange={handleProposeChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="parameters" className="block text-sm font-medium text-gray-700">Parameters (JSON, Optional)</label>
              <textarea
                name="parameters"
                id="parameters"
                rows={3}
                value={typeof newProposal.parameters === 'string' ? newProposal.parameters : JSON.stringify(newProposal.parameters, null, 2)}
                onChange={(e) => setNewProposal(prev => ({ ...prev, parameters: e.target.value as any }))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder='{"key": "value"}'
              ></textarea>
            </div>
            <div>
              <label htmlFor="duration_days" className="block text-sm font-medium text-gray-700">Voting Duration (Days)</label>
              <input
                type="number"
                name="duration_days"
                id="duration_days"
                value={newProposal.duration_days}
                onChange={handleProposeChange}
                min="1"
                max="30"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center">
                <XCircle className="h-5 w-5 mr-3" />
                <p>{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center">
                <CheckCircle className="h-5 w-5 mr-3" />
                <p>{formSuccess}</p>
              </div>
            )}
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={formLoading}
            >
              {formLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <PlusCircle className="h-5 w-5 mr-2" />}
              Submit Proposal
            </button>
          </form>
        )}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">All Proposals</h3>
        {proposals.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600">
            <p>No governance proposals found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">{proposal.title}</h4>
                  {getStatusBadge(proposal.status)}
                </div>
                <p className="text-sm text-gray-600 mb-3 flex-grow">{proposal.description}</p>
                <div className="text-xs text-gray-500 mb-2">
                  <p>Proposer: <span className="font-medium">{proposal.proposer.substring(0, 10)}...</span></p>
                  <p>Votes For: <span className="font-medium text-green-600">{proposal.votes_for}</span></p>
                  <p>Votes Against: <span className="font-medium text-red-600">{proposal.votes_against}</span></p>
                  <p>Ends: {new Date(proposal.end_time).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2 mt-auto pt-3 border-t border-gray-100">
                  {proposal.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleVote(proposal.id, true)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" /> For
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, false)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" /> Against
                      </button>
                    </>
                  )}
                  {proposal.status === 'passed' && !proposal.execution_hash && (
                    <button
                      onClick={() => handleExecute(proposal.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <Play className="h-4 w-4 mr-1" /> Execute
                    </button>
                  )}
                  {proposal.execution_hash && (
                    <span className="text-sm text-gray-500">Executed: {proposal.execution_hash.substring(0, 10)}...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Governance;
