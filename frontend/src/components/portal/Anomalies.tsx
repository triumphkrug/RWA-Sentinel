import React, { useEffect, useState } from 'react';
import { getAttestations, Attestation, ErrorResponse, AttestationStatus } from '../../lib/api';
import { Loader2, XCircle, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const Anomalies: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AttestationStatus | 'all'>('all');
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(0);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoading(true);
      setError(null);
      try {
        // For anomaly detection, we'll fetch attestations and filter them client-side.
        // A low score or 'challenged' status could indicate an anomaly.
        const allAttestations = await getAttestations({ limit: 100 });
        const potentialAnomalies = allAttestations.attestations.filter(
          (att) => att.score < 60 || att.status === 'challenged' || att.status === 'slashed'
        );
        setAnomalies(potentialAnomalies);
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch anomaly data');
        console.error('Error fetching anomaly data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
  }, []);

  const filteredAnomalies = anomalies.filter((attestation) => {
    const statusMatch = filterStatus === 'all' || attestation.status === filterStatus;
    const scoreMatch = attestation.score < minScoreThreshold; // Anomalies are typically *below* a threshold
    return statusMatch && scoreMatch;
  });

  const getStatusBadge = (status: AttestationStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
      case 'attested':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Attested</span>;
      case 'challenged':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Challenged</span>;
      case 'slashed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Slashed</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Expired</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
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
        <p className="ml-3 text-gray-600">Detecting anomalies...</p>
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
      <h2 className="text-3xl font-bold text-gray-900">Anomaly Detection</h2>
      <p className="text-gray-700">
        This section highlights potential anomalies detected within RWA attestations,
        such as unusually low trust scores, challenged attestations, or suspicious patterns.
      </p>

      {/* Filters */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <Search className="h-5 w-5 text-gray-500" />
        <div className="flex items-center space-x-2">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Status:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AttestationStatus | 'all')}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="attested">Attested</option>
            <option value="challenged">Challenged</option>
            <option value="slashed">Slashed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="minScoreThreshold" className="text-sm font-medium text-gray-700">Score Below:</label>
          <input
            type="number"
            id="minScoreThreshold"
            min="0"
            max="100"
            value={minScoreThreshold}
            onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
            className="w-24 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Anomaly List */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        {filteredAnomalies.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <p>No anomalies detected matching current filters. All systems appear normal.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attestation ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Identifier
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnomalies.map((attestation) => (
                <tr key={attestation.id} className="hover:bg-red-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attestation.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {attestation.identifier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-bold ${getScoreColor(attestation.score)}`}>{attestation.score.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(attestation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(attestation.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-700">
                    {attestation.score < minScoreThreshold && `Score below ${minScoreThreshold}. `}
                    {attestation.status === 'challenged' && 'Attestation challenged. '}
                    {attestation.status === 'slashed' && 'Attestation slashed. '}
                    {/* Add more specific reasons if metadata allows */}
                    Potential data inconsistency.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cross-reference Validation Status (Conceptual) */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" /> Cross-reference Validation
        </h3>
        <p className="text-gray-700 mb-3">
          The RWA-Sentinel system continuously cross-references data points from multiple sources to identify discrepancies.
          This section would show the status of these validations.
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>External data source consistency: <span className="font-medium text-green-600">High</span></li>
          <li>Historical data deviation analysis: <span className="font-medium text-yellow-600">Moderate (some minor fluctuations)</span></li>
          <li>Oracle consensus divergence: <span className="font-medium text-green-600">Low</span></li>
        </ul>
      </div>
    </div>
  );
};

export default Anomalies;
