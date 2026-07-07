import React, { useEffect, useState, useMemo } from 'react';
import { getScores, AssetScore, ErrorResponse } from '../../lib/api';
import { Loader2, XCircle, ChevronDown, ChevronUp, Filter, ArrowUpDown } from 'lucide-react';
import PageInfo from './PageInfo';

type SortKey = 'asset_id' | 'identifier' | 'asset_type' | 'score' | 'timestamp';
type SortDir = 'asc' | 'desc';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<AssetScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getScores();
        setAssets(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError((err as ErrorResponse).message || 'Failed to fetch assets');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredSorted = useMemo(() => {
    const filtered = assets.filter(a => a.score >= minScoreFilter);
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'score': va = a.score; vb = b.score; break;
        case 'timestamp': va = a.timestamp || ''; vb = b.timestamp || ''; break;
        case 'asset_type': va = a.asset_type || ''; vb = b.asset_type || ''; break;
        case 'identifier': va = a.identifier || ''; vb = b.identifier || ''; break;
        default: va = a.asset_id || ''; vb = b.asset_id || '';
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [assets, minScoreFilter, sortKey, sortDir]);

  const toggleExpand = (assetId: string | undefined) => {
    if (!assetId) return;
    setExpandedAssetId(expandedAssetId === assetId ? null : assetId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      scope="col"
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === col ? 'text-blue-600' : 'text-gray-300'}`} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading assets...</p>
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
      <h2 className="text-2xl font-bold text-gray-900">Asset Trust Scores</h2>

      <PageInfo title="What are Asset Trust Scores?">
        <p>Every real-world asset submitted to RWA-Sentinel is scored by the autonomous AI oracle using a <strong>6-factor scoring pipeline</strong>: document authenticity, market cross-reference (CoinGecko), entity verification (GLEIF LEI), corporate registry (Companies House), historical consistency, and KYC status.</p>
        <p className="mt-1">Scores range from 0–100. Assets scoring ≥ 70 receive on-chain attestations via the Casper smart contracts. Data is refreshed on every pipeline run and pulled live from the backend PostgreSQL database.</p>
      </PageInfo>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 flex flex-wrap items-center gap-3">
        <Filter className="h-5 w-5 text-gray-500" />
        <label htmlFor="minScore" className="text-gray-700 font-medium text-sm">
          Minimum Score:
        </label>
        <input
          type="number"
          id="minScore"
          min="0"
          max="100"
          value={minScoreFilter}
          onChange={(e) => setMinScoreFilter(Number(e.target.value))}
          className="w-20 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-xs text-gray-400 ml-auto">{filteredSorted.length} of {assets.length} assets</span>
      </div>

      {filteredSorted.length === 0 ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600">
          <p>No assets found matching the current filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader label="Asset ID" col="asset_id" />
                  <SortHeader label="Identifier" col="identifier" />
                  <SortHeader label="Type" col="asset_type" />
                  <SortHeader label="Score" col="score" />
                  <SortHeader label="Last Scored" col="timestamp" />
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSorted.map((asset) => (
                  <React.Fragment key={asset.asset_id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                        {(asset.asset_id || '').substring(0, 12)}{(asset.asset_id?.length ?? 0) > 12 ? '…' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {asset.identifier || asset.asset_id || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {asset.asset_type || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-bold ${getScoreColor(asset.score)}`}>{(asset.score ?? 0).toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {asset.timestamp ? new Date(asset.timestamp).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleExpand(asset.asset_id)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none"
                        >
                          {expandedAssetId === asset.asset_id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedAssetId === asset.asset_id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 text-sm text-gray-700">
                          <h4 className="font-semibold mb-2">Score Factors:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {(asset.factors || []).map((factor, index) => (
                              <li key={index}>
                                <span className="font-medium">{factor.name}:</span>{' '}
                                <span className={getScoreColor(factor.score ?? 0)}>{(factor.score ?? 0).toFixed(1)}</span>{' '}
                                (Weight: {factor.weight ?? 0}%)
                                {factor.details && <span className="text-gray-500 ml-2"> — {factor.details}</span>}
                              </li>
                            ))}
                          </ul>
                          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Metadata:</h4>
                              <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                                {JSON.stringify(asset.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
