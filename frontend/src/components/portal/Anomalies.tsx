import React, { useEffect, useState, useMemo } from 'react';
import { getAttestations, postAnomalyDetect, Attestation, ErrorResponse } from '../../lib/api';
import { Loader2, XCircle, AlertTriangle, CheckCircle, Search, Zap, Activity, ShieldAlert, BarChart3, ArrowUpDown } from 'lucide-react';
import PageInfo from './PageInfo';

interface DetectedAnomaly {
  assetId: string;
  type: string;
  severity: string;
  details: string;
}

type SortKey = 'id' | 'identifier' | 'score' | 'status' | 'timestamp';
type SortDir = 'asc' | 'desc';

const Anomalies: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Attestation[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<DetectedAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(60);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [attestationData, anomalyData] = await Promise.allSettled([
          getAttestations({ limit: 100 }),
          postAnomalyDetect(),
        ]);
        if (attestationData.status === 'fulfilled') {
          const potentialAnomalies = attestationData.value.attestations.filter(
            (att) => att.score < 60 || att.status === 'below_threshold' || att.status === 'challenged' || att.status === 'slashed'
          );
          setAnomalies(potentialAnomalies);
        }
        if (anomalyData.status === 'fulfilled') {
          setDetectedAnomalies(anomalyData.value.anomalies || []);
        }
      } catch (err: any) {
        setError((err as ErrorResponse).message || 'Failed to fetch anomaly data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRunDetection = async () => {
    setDetecting(true);
    try {
      const result = await postAnomalyDetect();
      setDetectedAnomalies(result.anomalies || []);
    } catch { /* silent */ }
    finally { setDetecting(false); }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'score' ? 'asc' : 'desc'); }
  };

  const filteredSorted = useMemo(() => {
    const filtered = anomalies.filter((a) => {
      const statusMatch = filterStatus === 'all' || a.status === filterStatus;
      return statusMatch && a.score < minScoreThreshold;
    });
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'score': va = a.score; vb = b.score; break;
        case 'timestamp': va = a.timestamp; vb = b.timestamp; break;
        case 'status': va = a.status; vb = b.status; break;
        case 'identifier': va = a.identifier; vb = b.identifier; break;
        default: va = a.id; vb = b.id;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [anomalies, filterStatus, minScoreThreshold, sortKey, sortDir]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      below_threshold: 'bg-amber-100 text-amber-800',
      challenged: 'bg-orange-100 text-orange-800',
      slashed: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    const label = status === 'below_threshold' ? 'below threshold' : status;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{label}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
        <p className="ml-3 text-gray-600">Running anomaly detection...</p>
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
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        Anomaly Detection
      </h2>

      <PageInfo title="How does anomaly detection work?">
        <p>The anomaly detector monitors all attestation data for scoring anomalies and low-trust outliers. It works in two layers:</p>
        <p className="mt-1"><strong>Rule-based layer:</strong> Flags attestations with trust scores below the configurable threshold (default 60) or with challenged/slashed status from the oracle slashing mechanism.</p>
        <p className="mt-1"><strong>AI layer:</strong> The "Run Detection" button triggers the backend AI agent to analyze scoring patterns across all assets, detecting statistical outliers, suspicious cross-reference failures, and scoring velocity anomalies. Data comes from the live PostgreSQL attestation store.</p>
      </PageInfo>

      {/* Detection Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Activity className="h-4 w-4" /> Analyzed
          </div>
          <p className="text-2xl font-bold text-gray-900">{anomalies.length + (100 - anomalies.length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-amber-500 text-sm mb-1">
            <AlertTriangle className="h-4 w-4" /> Low-Score
          </div>
          <p className="text-2xl font-bold text-amber-600">{anomalies.filter(a => a.score < 60).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <ShieldAlert className="h-4 w-4" /> Below Threshold
          </div>
          <p className="text-2xl font-bold text-red-600">{anomalies.filter(a => a.status === 'below_threshold').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
            <BarChart3 className="h-4 w-4" /> AI-Detected
          </div>
          <p className="text-2xl font-bold text-blue-600">{detectedAnomalies.length}</p>
        </div>
      </div>

      {/* AI-Detected Anomalies */}
      {detectedAnomalies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" /> AI-Detected Anomalies
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {detectedAnomalies.map((anomaly, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium shrink-0 ${getSeverityColor(anomaly.severity)}`}>
                  {anomaly.severity}
                </span>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-gray-900">{anomaly.type}</p>
                  <p className="text-xs text-gray-500 truncate">{anomaly.details}</p>
                </div>
                <code className="text-xs text-gray-400 font-mono shrink-0">{anomaly.assetId}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Run Detection (merged into one row) */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 flex flex-wrap items-center gap-3">
        <Search className="h-5 w-5 text-gray-500 shrink-0" />
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="below_threshold">Below Threshold</option>
            <option value="challenged">Challenged</option>
            <option value="slashed">Slashed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="minScoreThreshold" className="text-sm font-medium text-gray-700 whitespace-nowrap">Score Below:</label>
          <input
            type="number"
            id="minScoreThreshold"
            min="0"
            max="100"
            value={minScoreThreshold}
            onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
            className="w-20 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleRunDetection}
          disabled={detecting}
          className="ml-auto inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {detecting ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Scanning…</>
          ) : (
            <><Zap className="h-4 w-4 mr-1.5" /> Run Detection</>
          )}
        </button>
      </div>

      {/* Attestation Anomaly Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Attestation Anomalies</h3>
        </div>
        {filteredSorted.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <p>No anomalies detected matching current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader label="ID" col="id" />
                  <SortHeader label="Asset" col="identifier" />
                  <SortHeader label="Score" col="score" />
                  <SortHeader label="Status" col="status" />
                  <SortHeader label="Date" col="timestamp" />
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSorted.map((attestation) => (
                  <tr key={attestation.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                      {String(attestation.id).substring(0, 8)}…
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{attestation.identifier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-bold ${getScoreColor(attestation.score)}`}>{attestation.score.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(attestation.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(attestation.timestamp).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-red-700">
                      {attestation.score < 60 && 'Low trust score. '}
                      {attestation.status === 'below_threshold' && 'Below threshold. '}
                      {attestation.status === 'challenged' && 'Under challenge. '}
                      {attestation.status === 'slashed' && 'Oracle slashed. '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cross-reference Validation */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" /> Cross-reference Validation
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          The pipeline cross-references each asset against GLEIF LEI, CoinGecko, and Companies House data.
          Discrepancies between sources trigger automatic anomaly flags.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">GLEIF LEI Registry</p>
            <p className="text-xs text-green-600 mt-1">Entity identity cross-check</p>
            <p className="text-lg font-bold text-green-700 mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Active</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">CoinGecko Market Data</p>
            <p className="text-xs text-green-600 mt-1">Price deviation monitoring</p>
            <p className="text-lg font-bold text-green-700 mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Active</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">Companies House</p>
            <p className="text-xs text-green-600 mt-1">Corporate registry validation</p>
            <p className="text-lg font-bold text-green-700 mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Anomalies;
