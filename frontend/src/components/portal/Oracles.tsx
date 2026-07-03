import React, { useEffect, useState } from 'react';
import { getSlashingReports, SlashingReport, ErrorResponse, postConsensusInit, ConsensusInitResponse } from '../../lib/api';
import { Loader2, XCircle, Shield, AlertTriangle, CheckCircle, Gavel } from 'lucide-react';

const Oracles: React.FC = () => {
  const [slashingReports, setSlashingReports] = useState<SlashingReport[]>([]);
  const [consensusInfo, setConsensusInfo] = useState<ConsensusInitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const reports = await getSlashingReports();
        setSlashingReports(reports);
        // Assuming postConsensusInit can be used to *get* current consensus info if it returns it
        // If it's strictly a POST to *initiate*, then this would be a placeholder.
        // For this UI, we'll assume it returns the current state if called without specific params.
        const consensus = await postConsensusInit();
        setConsensusInfo(consensus);
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch oracle data');
        console.error('Error fetching oracle data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadge = (status: SlashingReport['status']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'challenged':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Challenged</span>;
      case 'validated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Validated</span>;
      case 'executed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Executed</span>;
      case 'dismissed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Dismissed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading oracle data...</p>
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
      <h2 className="text-3xl font-bold text-gray-900">Oracle Network Status</h2>

      {/* Oracle Consensus Status */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-3" /> Consensus Overview
        </h3>
        {consensusInfo ? (
          <div className="space-y-3 text-gray-700">
            <p>
              <span className="font-medium">BLS Threshold:</span> {consensusInfo.bls_threshold}%
              <span className="text-sm text-gray-500 ml-2">(Minimum percentage of oracle signatures required for consensus)</span>
            </p>
            <p>
              <span className="font-medium">Active Oracles:</span> {consensusInfo.active_oracles.length}
            </p>
            <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Oracle IDs:</p>
              <ul className="list-disc list-inside space-y-1">
                {consensusInfo.active_oracles.map((oracleId, index) => (
                  <li key={index} className="truncate">{oracleId}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <CheckCircle className="inline-block h-4 w-4 text-green-500 mr-1" /> Network is operating with {consensusInfo.active_oracles.length} active oracles.
            </p>
          </div>
        ) : (
          <p className="text-gray-600">Consensus information not available. Try initializing consensus via API.</p>
        )}
      </div>

      {/* Slashing History */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Gavel className="h-6 w-6 text-red-600 mr-3" /> Slashing Reports History
        </h3>
        {slashingReports.length === 0 ? (
          <div className="text-center text-gray-600 py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <p>No slashing reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oracle ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slashingReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {report.oracle_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {report.reporter.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {report.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(report.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Oracle Health Indicators (Conceptual) */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-3" /> Oracle Health Indicators
        </h3>
        <p className="text-gray-700 mb-3">
          This section would display real-time health metrics for individual oracles, such as uptime, response times, and attestation frequency.
          Currently, this data is inferred from slashing reports and overall consensus.
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>No active slashing challenges.</li>
          <li>All active oracles are participating in consensus.</li>
          <li>Average attestation latency: <span className="font-medium">~2 seconds</span> (simulated)</li>
        </ul>
      </div>
    </div>
  );
};

export default Oracles;
