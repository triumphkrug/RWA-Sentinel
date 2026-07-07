import React, { useEffect, useState } from 'react';
import { getHealth, getStats, HealthResponse, StatsResponse, ErrorResponse } from '../../lib/api';
import { Loader2, CheckCircle, XCircle, TrendingUp, Scale, ShieldCheck } from 'lucide-react';

const Overview: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, statsRes] = await Promise.all([getHealth(), getStats()]);
        setHealth(healthRes);
        setStats(statsRes);
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch data');
        console.error('Error fetching overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading overview data...</p>
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
      <h2 className="text-3xl font-bold text-gray-900">Portal Overview</h2>

      {/* Health Status */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">System Health</h3>
        {health ? (
          <div className="flex items-center text-lg">
            {health.status === 'ok' ? (
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
            )}
            <span className={`font-medium ${health.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              Status: {health.status.toUpperCase()}
            </span>
            <span className="ml-4 text-gray-600">Version: {health.version}</span>
            <span className="ml-4 text-gray-600">Last Checked: {new Date(health.timestamp).toLocaleString()}</span>
          </div>
        ) : (
          <p className="text-gray-600">Health status not available.</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col items-start">
          <div className="flex items-center mb-3">
            <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Total Scored Assets</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats?.total_scored_assets?.toLocaleString() || 'N/A'}</p>
          <p className="text-sm text-gray-500 mt-1">Assets evaluated by RWA-Sentinel</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col items-start">
          <div className="flex items-center mb-3">
            <ShieldCheck className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Active Attestations</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats?.active_attestations?.toLocaleString() || 'N/A'}</p>
          <p className="text-sm text-gray-500 mt-1">Currently valid on-chain attestations</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col items-start">
          <div className="flex items-center mb-3">
            <Scale className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Average Trust Score</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">
            {stats?.average_trust_score ? stats.average_trust_score.toFixed(2) : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Overall average score across all assets</p>
        </div>
      </div>

      {/* Recent Pipeline Runs */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {stats?.last_pipeline_run ? (
          <div className="text-gray-700">
            <p className="mb-2">
              Last data pipeline run: <span className="font-medium">{new Date(stats.last_pipeline_run).toLocaleString()}</span>
            </p>
            <p>
              Pipeline runs in last 24h: <span className="font-medium">{stats.pipeline_runs_24h || 0}</span>
            </p>
          </div>
        ) : (
          <p className="text-gray-600">No recent pipeline run data available.</p>
        )}
      </div>
    </div>
  );
};

export default Overview;
