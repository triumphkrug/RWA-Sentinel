import React, { useState, useEffect, useCallback } from 'react';

interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  votes: { for: number; against: number; abstain: number };
  quorum: number;
  requiredQuorum: number;
  createdAt: number;
  endsAt: number;
  creator: string;
}

type ProposalType = 'parameter-change' | 'oracle-add' | 'oracle-remove' | 'slashing-rule';
type ProposalStatus = 'pending' | 'voting' | 'approved' | 'rejected' | 'expired';

interface NewProposalForm {
  title: string;
  description: string;
  type: ProposalType;
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'GOV-001', title: 'Increase Oracle Minimum Stake to 50K CSPR',
    description: 'Raise the minimum stake requirement to improve oracle reliability and reduce spam registrations.',
    type: 'parameter-change', status: 'voting',
    votes: { for: 42, against: 12, abstain: 5 }, quorum: 59, requiredQuorum: 67,
    createdAt: Date.now() - 172800000, endsAt: Date.now() + 86400000,
    creator: '0202a1b2...c3d4'
  },
  {
    id: 'GOV-002', title: 'Add ChainLink Cross-Reference Oracle',
    description: 'Integrate ChainLink price feeds as an additional cross-reference data source for asset scoring.',
    type: 'oracle-add', status: 'voting',
    votes: { for: 55, against: 3, abstain: 8 }, quorum: 66, requiredQuorum: 67,
    createdAt: Date.now() - 86400000, endsAt: Date.now() + 172800000,
    creator: '02029f26...b479'
  },
  {
    id: 'GOV-003', title: 'Remove Inactive Oracle Node #7',
    description: 'Oracle node #7 has been offline for 14 days. Remove from active validator set.',
    type: 'oracle-remove', status: 'approved',
    votes: { for: 71, against: 2, abstain: 4 }, quorum: 77, requiredQuorum: 67,
    createdAt: Date.now() - 604800000, endsAt: Date.now() - 432000000,
    creator: '0202e554...257e'
  },
  {
    id: 'GOV-004', title: 'Double Slashing Penalty for False Attestations',
    description: 'Increase slashing penalty from 10% to 20% for oracles submitting provably false attestation data.',
    type: 'slashing-rule', status: 'rejected',
    votes: { for: 18, against: 45, abstain: 12 }, quorum: 75, requiredQuorum: 67,
    createdAt: Date.now() - 1209600000, endsAt: Date.now() - 1036800000,
    creator: '020228bf...4d4c'
  },
];

const statusColors: Record<ProposalStatus, string> = {
  pending: '#eab308',
  voting: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  expired: '#6b7280',
};

const typeLabels: Record<ProposalType, string> = {
  'parameter-change': '⚙️ Parameter',
  'oracle-add': '➕ Add Oracle',
  'oracle-remove': '➖ Remove Oracle',
  'slashing-rule': '⚡ Slashing',
};

function formatTimeRemaining(endsAt: number): string {
  const diff = endsAt - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
}

export default function GovernancePanel(): React.ReactElement {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [votedOn, setVotedOn] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProposalForm>({
    title: '', description: '', type: 'parameter-change',
  });
  const [filter, setFilter] = useState<ProposalStatus | 'all'>('all');

  const handleVote = useCallback((proposalId: string, vote: 'for' | 'against' | 'abstain') => {
    if (votedOn.has(proposalId)) return;
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      const updated = { ...p, votes: { ...p.votes, [vote]: p.votes[vote] + 1 } };
      updated.quorum = updated.votes.for + updated.votes.against + updated.votes.abstain;
      return updated;
    }));
    setVotedOn(prev => new Set(prev).add(proposalId));
  }, [votedOn]);

  const handleCreateProposal = useCallback(() => {
    if (!form.title.trim() || !form.description.trim()) return;
    const newProposal: Proposal = {
      id: `GOV-${String(proposals.length + 1).padStart(3, '0')}`,
      title: form.title, description: form.description, type: form.type,
      status: 'pending', votes: { for: 0, against: 0, abstain: 0 },
      quorum: 0, requiredQuorum: 67,
      createdAt: Date.now(), endsAt: Date.now() + 259200000,
      creator: '02029f26...b479',
    };
    setProposals(prev => [newProposal, ...prev]);
    setForm({ title: '', description: '', type: 'parameter-change' });
    setShowForm(false);
  }, [form, proposals.length]);

  const filteredProposals = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status === filter);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px' }}>
          🏛️ Governance DAO
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 18px', backgroundColor: '#0d9488', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
          }}
        >
          {showForm ? 'Cancel' : '+ New Proposal'}
        </button>
      </div>

      {showForm && (
        <div style={{
          backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px',
          padding: '20px', marginBottom: '20px',
        }}>
          <h3 style={{ margin: '0 0 14px', color: '#0f172a', fontSize: '16px' }}>Create Proposal</h3>
          <input
            type="text" placeholder="Proposal title"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: '10px', border: '1px solid #cbd5e1',
              borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Detailed description of the proposal..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: '10px', border: '1px solid #cbd5e1',
              borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProposalType })}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="parameter-change">⚙️ Parameter Change</option>
              <option value="oracle-add">➕ Add Oracle</option>
              <option value="oracle-remove">➖ Remove Oracle</option>
              <option value="slashing-rule">⚡ Slashing Rule</option>
            </select>
            <button onClick={handleCreateProposal} style={{
              padding: '8px 20px', backgroundColor: '#0d9488', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}>
              Submit Proposal
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {(['all', 'voting', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s} onClick={() => setFilter(s)}
            style={{
              padding: '5px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
              border: filter === s ? '2px solid #0d9488' : '1px solid #e2e8f0',
              backgroundColor: filter === s ? '#f0fdfa' : '#fff',
              color: filter === s ? '#0d9488' : '#64748b', fontWeight: filter === s ? 600 : 400,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredProposals.map(p => {
          const totalVotes = p.votes.for + p.votes.against + p.votes.abstain;
          const forPct = totalVotes > 0 ? (p.votes.for / totalVotes) * 100 : 0;
          const againstPct = totalVotes > 0 ? (p.votes.against / totalVotes) * 100 : 0;
          const abstainPct = totalVotes > 0 ? (p.votes.abstain / totalVotes) * 100 : 0;
          const quorumPct = Math.min((p.quorum / p.requiredQuorum) * 100, 100);
          const hasVoted = votedOn.has(p.id);
          const isActive = p.status === 'voting' || p.status === 'pending';

          return (
            <div key={p.id} style={{
              border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px',
              backgroundColor: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '8px' }}>{p.id}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    backgroundColor: `${statusColors[p.status]}20`, color: statusColors[p.status],
                    fontWeight: 600,
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {typeLabels[p.type]}
                </span>
              </div>

              <h3 style={{ margin: '4px 0 6px', fontSize: '15px', color: '#0f172a' }}>{p.title}</h3>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                {p.description}
              </p>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                  <div style={{ width: `${forPct}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} />
                  <div style={{ width: `${againstPct}%`, backgroundColor: '#ef4444', transition: 'width 0.3s' }} />
                  <div style={{ width: `${abstainPct}%`, backgroundColor: '#94a3b8', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>✅ For: {p.votes.for} ({forPct.toFixed(0)}%)</span>
                  <span>❌ Against: {p.votes.against} ({againstPct.toFixed(0)}%)</span>
                  <span>⬜ Abstain: {p.votes.abstain} ({abstainPct.toFixed(0)}%)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                    <span>Quorum: {p.quorum}/{p.requiredQuorum}</span>
                    <span>{quorumPct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#f1f5f9' }}>
                    <div style={{
                      width: `${quorumPct}%`, height: '100%', borderRadius: '2px',
                      backgroundColor: quorumPct >= 100 ? '#10b981' : '#0d9488',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                {isActive && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={hasVoted} onClick={() => handleVote(p.id, 'for')} style={{
                      padding: '5px 12px', fontSize: '12px', borderRadius: '5px', cursor: hasVoted ? 'default' : 'pointer',
                      border: 'none', backgroundColor: hasVoted ? '#e2e8f0' : '#10b981', color: '#fff',
                      opacity: hasVoted ? 0.5 : 1,
                    }}>Yes</button>
                    <button disabled={hasVoted} onClick={() => handleVote(p.id, 'against')} style={{
                      padding: '5px 12px', fontSize: '12px', borderRadius: '5px', cursor: hasVoted ? 'default' : 'pointer',
                      border: 'none', backgroundColor: hasVoted ? '#e2e8f0' : '#ef4444', color: '#fff',
                      opacity: hasVoted ? 0.5 : 1,
                    }}>No</button>
                    <button disabled={hasVoted} onClick={() => handleVote(p.id, 'abstain')} style={{
                      padding: '5px 12px', fontSize: '12px', borderRadius: '5px', cursor: hasVoted ? 'default' : 'pointer',
                      border: 'none', backgroundColor: hasVoted ? '#e2e8f0' : '#94a3b8', color: '#fff',
                      opacity: hasVoted ? 0.5 : 1,
                    }}>Abstain</button>
                  </div>
                )}

                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  ⏳ {formatTimeRemaining(p.endsAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
