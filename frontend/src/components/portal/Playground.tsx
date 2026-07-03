import React, { useState } from 'react';
import * as api from '../../lib/api';
import { Play, Copy, RefreshCcw, XCircle } from 'lucide-react';

interface Endpoint {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  params?: Record<string, any>;
  body?: Record<string, any>;
  description: string;
}

const endpoints: Endpoint[] = [
  { name: 'Get Health', method: 'GET', path: '/health', description: 'Check API health status.' },
  { name: 'Get Stats', method: 'GET', path: '/api/v1/stats', description: 'Retrieve overall portal statistics.' },
  { name: 'Get Scores', method: 'GET', path: '/api/v1/scores', description: 'List all asset trust scores.' },
  { name: 'Get Attestations', method: 'GET', path: '/api/v1/attestations', params: { page: 1, limit: 10, status: 'attested' }, description: 'List attestations with optional filters.' },
  { name: 'Get Attestation by ID', method: 'GET', path: '/api/v1/attestations/:id', params: { id: 'example_attestation_id' }, description: 'Retrieve a single attestation by ID.' },
  { name: 'Post Pipeline Run', method: 'POST', path: '/api/v1/pipeline', body: { lei: '5493001KJTIIGC8Y1R12' }, description: 'Initiate a new RWA scoring pipeline.' },
  { name: 'Get LEI Data', method: 'GET', path: '/api/v1/data/lei/:lei', params: { lei: '5493001KJTIIGC8Y1R12' }, description: 'Fetch Legal Entity Identifier (LEI) data.' },
  { name: 'Get Company Data', method: 'GET', path: '/api/v1/data/company/:jurisdiction/:id', params: { jurisdiction: 'US', id: 'DELAWARE' }, description: 'Fetch company registration data.' },
  { name: 'Get Governance Proposals', method: 'GET', path: '/api/v1/governance/proposals', description: 'List all DAO governance proposals.' },
  { name: 'Post Governance Propose', method: 'POST', path: '/api/v1/governance/propose', body: { title: 'Test Proposal', description: 'This is a test proposal.', duration_days: 3 }, description: 'Create a new governance proposal.' },
  { name: 'Get Slashing Reports', method: 'GET', path: '/api/v1/slashing/reports', description: 'List all oracle slashing reports.' },
  { name: 'Get Chain Overview', method: 'GET', path: '/api/v1/chain/overview', description: 'Get a high-level overview of the Casper chain activity.' },
  // Add more endpoints as needed, following the pattern
];

const Playground: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requestBody, setRequestBody] = useState<string>('');
  const [requestParams, setRequestParams] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndpointSelect = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '');
    setRequestParams(endpoint.params ? JSON.stringify(endpoint.params, null, 2) : '');
    setResponse(null);
    setError(null);
  };

  const executeRequest = async () => {
    if (!selectedEndpoint) {
      setError('Please select an endpoint first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let parsedBody: any = {};
      if (selectedEndpoint.method === 'POST' && requestBody) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          throw new Error('Invalid JSON in request body.');
        }
      }

      let parsedParams: Record<string, any> = {};
      if (requestParams) {
        try {
          parsedParams = JSON.parse(requestParams);
        } catch (e) {
          throw new Error('Invalid JSON in request parameters.');
        }
      }

      let path = selectedEndpoint.path;
      // Replace path parameters like :id, :lei, :jurisdiction
      for (const key in parsedParams) {
        if (path.includes(`:${key}`)) {
          path = path.replace(`:${key}`, parsedParams[key]);
          delete parsedParams[key]; // Remove from params if used in path
        }
      }

      // Find the corresponding API function
      const apiFunctionName = `get${selectedEndpoint.name.replace(/ /g, '').replace('Post', '').replace('Get', '')}`;
      const postApiFunctionName = `post${selectedEndpoint.name.replace(/ /g, '').replace('Post', '').replace('Get', '')}`;

      let result;
      if (selectedEndpoint.method === 'GET') {
        // Special handling for functions that take params object vs direct path params
        if (selectedEndpoint.path.includes(':')) {
          // If path contains params, assume the function takes them directly
          const func = (api as any)[apiFunctionName];
          if (typeof func === 'function') {
            const args = Object.values(parsedParams); // Pass remaining params as arguments
            result = await func(...args);
          } else {
            // Fallback for generic GET with query params
            result = await api.getAttestations(parsedParams); // Example, needs more robust mapping
          }
        } else {
          const func = (api as any)[apiFunctionName];
          if (typeof func === 'function') {
            result = await func(parsedParams); // Pass params as a single object for query strings
          } else {
            // Generic GET for paths without specific functions or params
            result = await (api as any).fetcher(path, 'GET', { params: parsedParams });
          }
        }
      } else if (selectedEndpoint.method === 'POST') {
        const func = (api as any)[postApiFunctionName];
        if (typeof func === 'function') {
          result = await func(parsedBody);
        } else {
          // Fallback for generic POST
          result = await (api as any).fetcher(path, 'POST', parsedBody);
        }
      } else {
        throw new Error('Unsupported HTTP method.');
      }

      setResponse(result);
    } catch (err: any) {
      const errorRes: api.ErrorResponse = err;
      setError(errorRes.message || 'An unknown API error occurred.');
      console.error('API Playground Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyResponseToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      alert('Response copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">API Playground</h2>
      <p className="text-gray-700">
        Interact directly with the RWA-Sentinel API. Select an endpoint, modify parameters/body, and execute requests to see real-time responses.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List */}
        <div className="lg:col-span-1 bg-white border border-gray-200 shadow-sm rounded-lg p-4 h-full overflow-y-auto max-h-[calc(100vh-200px)]">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Endpoints</h3>
          <ul className="space-y-2">
            {endpoints.map((endpoint) => (
              <li key={endpoint.name}>
                <button
                  onClick={() => handleEndpointSelect(endpoint)}
                  className={`w-full text-left p-3 rounded-md transition-colors duration-150 ${
                    selectedEndpoint?.name === endpoint.name
                      ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600 -ml-1 pl-2'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`font-mono text-xs px-2 py-1 rounded ${endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                    {endpoint.method}
                  </span>
                  <span className="ml-2 font-medium">{endpoint.name}</span>
                  <p className="text-xs text-gray-500 mt-1">{endpoint.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Request and Response */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEndpoint ? (
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Request: {selectedEndpoint.name}</h3>
              <p className="text-gray-700 mb-4">
                <span className={`font-mono text-sm px-2 py-1 rounded ${selectedEndpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                  {selectedEndpoint.method}
                </span>
                <span className="ml-2 font-mono text-gray-800">{selectedEndpoint.path}</span>
              </p>

              {/* Parameters */}
              <div className="mb-4">
                <label htmlFor="requestParams" className="block text-sm font-medium text-gray-700 mb-2">
                  Parameters (JSON for path/query params):
                </label>
                <textarea
                  id="requestParams"
                  rows={4}
                  className="font-mono w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  value={requestParams}
                  onChange={(e) => setRequestParams(e.target.value)}
                  placeholder='{"id": "...", "lei": "...", "page": 1}'
                ></textarea>
              </div>

              {/* Request Body */}
              {selectedEndpoint.method === 'POST' && (
                <div className="mb-4">
                  <label htmlFor="requestBody" className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body (JSON):
                  </label>
                  <textarea
                    id="requestBody"
                    rows={8}
                    className="font-mono w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value", "another_key": 123}'
                  ></textarea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={executeRequest}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                  Run Request
                </button>
                <button
                  onClick={() => handleEndpointSelect(selectedEndpoint)} // Reset to default body/params
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <RefreshCcw className="h-5 w-5 mr-2" />
                  Reset
                </button>
              </div>

              {/* Response */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Response:</h4>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center mb-4">
                    <XCircle className="h-5 w-5 mr-3" />
                    <p>Error: {error}</p>
                  </div>
                )}
                {response && (
                  <div className="relative bg-gray-800 text-white p-4 rounded-md font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(response, null, 2)}</pre>
                    <button
                      onClick={copyResponseToClipboard}
                      className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:bg-gray-700"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!loading && !error && !response && (
                  <p className="text-gray-600">Run a request to see the response here.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600 h-full flex items-center justify-center">
              <p>Select an endpoint from the left sidebar to start interacting with the API.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playground;
