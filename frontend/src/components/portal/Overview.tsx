import React, { useEffect, useState } from 'react';
import {
  getHealth, getStats, getFactors, getExtensionCategories, getBridgeChains, getAttestations,
  HealthResponse, StatsResponse, FactorDefinition, AssetCategory, BridgeChain, ErrorResponse
} from '../../lib/api';
import {
  Loader2, CheckCircle, XCircle, TrendingUp, Scale, ShieldCheck,
  Layers, Globe, Shield, BarChart3, Activity, Database
} from 'lucide-react';

const Overview: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [factors, setFactors] = useState<FactorDefinition[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [bridgeChains, setBridgeChains] = useState<BridgeChain[]>([]);
  const [recentAttestations, setRecentAttestations] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, statsRes, factorsRes, categoriesRes, bridgeRes, attestRes] = await Promise.allSettled([
          getHealth(),
          getStats(),
          getFactors(),
          getExtensionCategories(),
          getBridgeChains(),
          getAttestations({ limit: 5 }),
        ]);

        if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (factorsRes.status === 'fulfilled') setFactors((factorsRes.value as any).factors || []);
        if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value.categories || []);
        if (bridgeRes.status === 'fulfilled') setBridgeChains(bridgeRes.value.chains || []);
        if (attestRes.status === 'fulfilled') setRecentAttestations(attestRes.value.total || 0);

        if (healthRes.status === 'rejected' && statsRes.status === 'rejected') {
          setError('Failed to fetch overview data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
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
      <h2 className="text-2xl font-bold text-gray-900">Portal Overview</h2>

      {/* Health Status */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" /> System Health
        </h3>
        {health ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle className="h-5 w-5" /> {health.status.toUpperCase()}
            </span>
            <span className="text-gray-500">Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
            <span className="text-gray-500">Chain: {health.chain}</span>
            <span className="text-gray-500">DB: {health.db}</span>
            <span className="text-gray-500">{Object.keys(health.contracts || {}).length} contracts linked</span>
          </div>
        ) : (
          <p className="text-gray-600">Health status not available.</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium text-gray-900">Total Scored Assets</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalScored?.toLocaleString() || '0'}</p>
          <p className="text-xs text-gray-500 mt-1">Assets evaluated by RWA-Sentinel</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium text-gray-900">Active Attestations</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.activeAttestations?.toLocaleString() || '0'}</p>
          <p className="text-xs text-gray-500 mt-1">Currently valid on-chain attestations</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
            <Scale className="h-5 w-5" />
            <span className="font-medium text-gray-900">Average Trust Score</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.avgTrustScore ? stats.avgTrustScore.toFixed(1) : '0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Overall average across all assets</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
            <Database className="h-5 w-5" />
            <span className="font-medium text-gray-900">Expired Attestations</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.expiredAttestations?.toLocaleString() || '0'}</p>
          <p className="text-xs text-gray-500 mt-1">Requiring re-verification</p>
        </div>
      </div>

      {/* Asset Types Breakdown */}
      {stats?.assetTypes && Object.keys(stats.assetTypes).length > 0 && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Asset Types Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats.assetTypes).map(([type, count]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-gray-900 capitalize">{type.replace(/-/g, ' ')}</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring Factors */}
      {factors.length > 0 && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Scoring Factors
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {factors.map(f => (
              <div key={f.name} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-gray-900 capitalize">{f.name.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{f.weight}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extensions Status */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" /> Extensions & Integrations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Asset Categories</p>
              <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Integrated</span>
            </div>
            <p className="text-xs text-blue-700 mb-2">
              {categories.length} categories with tailored scoring weight profiles
            </p>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 6).map(c => (
                  <span key={c.id} className="text-xs bg-white/80 text-blue-700 px-2 py-0.5 rounded">{c.name}</span>
                ))}
                {categories.length > 6 && (
                  <span className="text-xs bg-white/80 text-blue-700 px-2 py-0.5 rounded">+{categories.length - 6} more</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-900">KYC Gate</p>
              <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Integrated</span>
            </div>
            <p className="text-xs text-green-700 mb-2">
              On-chain KYC registry check wired into pipeline scoring
            </p>
            <div className="flex gap-2 text-xs">
              <span className="bg-white/80 text-green-700 px-2 py-0.5 rounded">Verified: +15</span>
              <span className="bg-white/80 text-red-600 px-2 py-0.5 rounded">Unverified: -10</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-semibold text-purple-900">Cross-chain Bridge</p>
              <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Code Ready</span>
            </div>
            <p className="text-xs text-purple-700 mb-2">
              Off-chain EVM attestation verification
            </p>
            {bridgeChains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bridgeChains.map(c => (
                  <span key={c.chainId} className="text-xs bg-white/80 text-purple-700 px-2 py-0.5 rounded capitalize">{c.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
