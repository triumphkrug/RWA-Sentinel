import React, { useState, useMemo } from 'react';
import { Play, Copy, RefreshCcw, XCircle, Loader2, Search } from 'lucide-react';

interface Endpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: Record<string, any>;
  description: string;
  category: string;
}

const endpoints: Endpoint[] = [
  // Core
  { category: 'Core', name: 'Health', method: 'GET', path: '/health', description: 'API health, uptime, contracts' },
  { category: 'Core', name: 'Stats', method: 'GET', path: '/api/v1/stats', description: 'Portal statistics' },
  { category: 'Core', name: 'Factors', method: 'GET', path: '/api/v1/factors', description: '6 scoring factors with weights' },
  { category: 'Core', name: 'Cache Stats', method: 'GET', path: '/api/v1/cache/stats', description: 'Scoring cache metrics' },

  // Pipeline
  { category: 'Pipeline', name: 'Run Pipeline', method: 'POST', path: '/api/v1/pipeline', body: { lei: '5493001KJTIIGC8Y1R12' }, description: 'Execute full scoring pipeline' },
  { category: 'Pipeline', name: 'Scores', method: 'GET', path: '/api/v1/scores', description: 'All asset trust scores' },

  // Attestations
  { category: 'Attestations', name: 'List Attestations', method: 'GET', path: '/api/v1/attestations?limit=10&status=attested', description: 'Filtered attestation list' },
  { category: 'Attestations', name: 'Verify Token', method: 'GET', path: '/api/v1/attestations/example/verify', description: 'Verify attestation token' },

  // Data
  { category: 'Data', name: 'LEI Lookup', method: 'GET', path: '/api/v1/data/lei/5493001KJTIIGC8Y1R12', description: 'GLEIF entity data' },
  { category: 'Data', name: 'Price Data', method: 'GET', path: '/api/v1/data/price/bitcoin', description: 'CoinGecko market data' },
  { category: 'Data', name: 'Company Data', method: 'GET', path: '/api/v1/data/company/gb/00000006', description: 'Companies House lookup' },
  { category: 'Data', name: 'Data Cache Stats', method: 'GET', path: '/api/v1/data/cache/stats', description: 'Data adapter cache' },

  // Governance
  { category: 'Governance', name: 'Proposals', method: 'GET', path: '/api/v1/governance/proposals', description: 'List DAO proposals' },
  { category: 'Governance', name: 'Create Proposal', method: 'POST', path: '/api/v1/governance/propose', body: { type: 'parameter_change', description: 'Adjust trust score threshold to 70', proposerPublicKey: '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79', executionData: {} }, description: 'Submit new proposal' },
  { category: 'Governance', name: 'Vote', method: 'POST', path: '/api/v1/governance/vote', body: { proposalId: '<paste proposal ID>', voterPublicKey: '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79', choice: 'for' }, description: 'Vote on proposal' },
  { category: 'Governance', name: 'Execute Proposal', method: 'POST', path: '/api/v1/governance/execute', body: { proposalId: '<paste proposal ID>' }, description: 'Execute approved proposal' },

  // Slashing
  { category: 'Slashing', name: 'Reports', method: 'GET', path: '/api/v1/slashing/reports', description: 'List slashing reports' },
  { category: 'Slashing', name: 'Report Violation', method: 'POST', path: '/api/v1/slashing/report', body: { oracleId: '0197cedbd7498429c4c277fc313d8e90574b5d189552c86244deaef3b37fd4c81f', attestationId: 'att-001', reporterPublicKey: '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79', evidenceHash: 'sha256-evidence-hash' }, description: 'Report oracle misconduct' },
  { category: 'Slashing', name: 'Challenge Report', method: 'POST', path: '/api/v1/slashing/challenge', body: { reportId: '<paste report ID>', challengerPublicKey: '0197cedbd7498429c4c277fc313d8e90574b5d189552c86244deaef3b37fd4c81f', challengeStakeAmount: 500 }, description: 'Challenge a report' },

  // Chain
  { category: 'Chain', name: 'Chain All', method: 'GET', path: '/api/v1/chain/all', description: 'Full chain overview + activity + txs' },
  { category: 'Chain', name: 'Chain Overview', method: 'GET', path: '/api/v1/chain/overview', description: 'Block height, era, validators' },
  { category: 'Chain', name: 'Chain Activity', method: 'GET', path: '/api/v1/chain/activity', description: 'Daily transaction activity' },
  { category: 'Chain', name: 'Chain Transactions', method: 'GET', path: '/api/v1/chain/transactions', description: 'Recent large transactions' },

  // Consensus
  { category: 'Consensus', name: 'Init Consensus', method: 'POST', path: '/api/v1/consensus/init', body: { attestationId: 'att-001', messageHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' }, description: 'Initialize BLS 3-of-5 consensus round' },

  // Extensions
  { category: 'Extensions', name: 'Asset Categories', method: 'GET', path: '/api/v1/extensions/categories', description: '10 asset category profiles' },
  { category: 'Extensions', name: 'KYC Check', method: 'POST', path: '/api/v1/extensions/kyc/check', body: { submitterPublicKey: '0197cedbd7498429c4c277fc313d8e90574b5d189552c86244deaef3b37fd4c81f' }, description: 'Check on-chain KYC status' },
  { category: 'Extensions', name: 'Bridge Chains', method: 'GET', path: '/api/v1/extensions/bridge/chains', description: 'Supported cross-chain networks' },
  { category: 'Extensions', name: 'Bridge Verify', method: 'POST', path: '/api/v1/extensions/bridge/verify', body: { chainId: 1, contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1E', attestationHash: 'abc123' }, description: 'Verify cross-chain attestation' },

  // Anomalies
  { category: 'Anomalies', name: 'Detect Anomalies', method: 'POST', path: '/api/v1/anomalies/detect', body: {}, description: 'Run AI anomaly detection' },

  // Documents
  { category: 'Documents', name: 'Verify Document', method: 'POST', path: '/api/v1/documents/verify', body: { hash: 'sha256-example-hash' }, description: 'Verify document hash' },
  { category: 'Documents', name: 'Submit Document', method: 'POST', path: '/api/v1/documents', body: { content: 'document payload', metadata: { type: 'invoice' } }, description: 'Submit document for verification' },

  // Assets
  { category: 'Assets', name: 'Asset History', method: 'GET', path: '/api/v1/assets/asset-001/history', description: 'Scoring history for an asset' },
];

const Playground: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [editedPath, setEditedPath] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return endpoints;
    const q = searchQuery.toLowerCase();
    return endpoints.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.path.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, Endpoint[]> = {};
    filteredEndpoints.forEach(e => {
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category].push(e);
    });
    return groups;
  }, [filteredEndpoints]);

  const handleEndpointSelect = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setEditedPath(endpoint.path);
    setRequestBody(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '');
    // Always clear previous results on switch
    setResponse(null);
    setError(null);
    setLoading(false);
  };

  const executeRequest = async () => {
    if (!selectedEndpoint) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const config: RequestInit = { method: selectedEndpoint.method };
      if (selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') {
        config.headers = { 'Content-Type': 'application/json' };
        config.body = requestBody || '{}';
        // Validate JSON
        try { JSON.parse(config.body as string); } catch { throw new Error('Invalid JSON in request body'); }
      }

      const res = await fetch(editedPath, config);
      const data = await res.json();
      setResponse({ status: res.status, statusText: res.ok ? 'OK' : res.statusText, data });
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">API Playground</h2>
        <p className="text-gray-500 mt-1">
          Interact directly with all {endpoints.length} API endpoints. Select an endpoint, edit parameters, and execute.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List with search */}
        <div className="lg:col-span-1 bg-white border border-gray-200 shadow-sm rounded-lg flex flex-col max-h-[calc(100vh-180px)]">
          {/* Fixed search header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-3 z-10 rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{filteredEndpoints.length} endpoints</p>
          </div>

          {/* Scrollable endpoint list */}
          <div className="flex-1 overflow-y-auto p-2">
            {Object.entries(groupedEndpoints).map(([category, eps]) => (
              <div key={category} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">{category}</p>
                {eps.map(ep => (
                  <button
                    key={ep.name + ep.path}
                    onClick={() => handleEndpointSelect(ep)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-sm ${
                      selectedEndpoint?.name === ep.name && selectedEndpoint?.path === ep.path
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        ep.method === 'GET' ? 'bg-green-100 text-green-700' : ep.method === 'POST' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-medium truncate">{ep.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Request Panel */}
        <div className="lg:col-span-2">
          {selectedEndpoint ? (
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedEndpoint.name}</h3>
                <p className="text-sm text-gray-500">{selectedEndpoint.description}</p>
              </div>

              {/* Path */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">URL Path (editable)</label>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs px-2 py-1 rounded font-medium shrink-0 ${
                    selectedEndpoint.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>{selectedEndpoint.method}</span>
                  <input
                    value={editedPath}
                    onChange={e => setEditedPath(e.target.value)}
                    className="flex-1 font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Body */}
              {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={6}
                    className="font-mono w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    value={requestBody}
                    onChange={e => setRequestBody(e.target.value)}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={executeRequest}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run
                </button>
                <button
                  onClick={() => handleEndpointSelect(selectedEndpoint)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                >
                  <RefreshCcw className="h-4 w-4" /> Reset
                </button>
              </div>

              {/* Response */}
              {(error || response) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500">Response</label>
                    {response && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          response.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {response.status} {response.statusText}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}
                  {response && (
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-12 text-center text-gray-400">
              <Play className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Select an endpoint to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playground;
