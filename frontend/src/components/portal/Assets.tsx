import React, { useEffect, useState } from 'react';
import { getScores, AssetScore, ErrorResponse } from '../../lib/api';
import { Loader2, XCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<AssetScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [filteredAssets, setFilteredAssets] = useState<AssetScore[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getScores();
        setAssets(data);
        setFilteredAssets(data); // Initialize filtered assets
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch assets');
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  useEffect(() => {
    // Apply filter whenever assets or minScoreFilter changes
    const filtered = assets.filter(asset => asset.score >= minScoreFilter);
    setFilteredAssets(filtered);
  }, [assets, minScoreFilter]);

  const toggleExpand = (assetId: string) => {
    setExpandedAssetId(expandedAssetId === assetId ? null : assetId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

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
      <h2 className="text-3xl font-bold text-gray-900">Asset Trust Scores</h2>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 flex items-center space-x-3">
        <Filter className="h-5 w-5 text-gray-500" />
        <label htmlFor="minScore" className="text-gray-700 font-medium">
          Minimum Score:
        </label>
        <input
          type="number"
          id="minScore"
          min="0"
          max="100"
          value={minScoreFilter}
          onChange={(e) => setMinScoreFilter(Number(e.target.value))}
          className="w-24 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600">
          <p>No assets found matching the current filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identifier
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Scored
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <React.Fragment key={asset.asset_id}>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.asset_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.identifier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.asset_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-bold ${getScoreColor(asset.score)}`}>{asset.score.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(asset.timestamp).toLocaleDateString()}
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
                          {asset.factors.map((factor, index) => (
                            <li key={index}>
                              <span className="font-medium">{factor.name}:</span>{' '}
                              <span className={getScoreColor(factor.score)}>{factor.score.toFixed(2)}</span>{' '}
                              (Weight: {factor.weight.toFixed(2)})
                              {factor.details && <span className="text-gray-500 ml-2"> - {factor.details}</span>}
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
      )}
    </div>
  );
};

export default Assets;
