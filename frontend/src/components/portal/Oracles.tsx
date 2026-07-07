import React, { useEffect, useState } from 'react';
import { getSlashingReports, SlashingReport, ErrorResponse } from '../../lib/api';
import { useClickRef } from '../../lib/click';
import { Loader2, XCircle, Shield, AlertTriangle, CheckCircle, Gavel, Swords, FileCheck, Hammer, ClipboardList } from 'lucide-react';

const Oracles: React.FC = () => {
  const { publicKey: walletKey } = useClickRef();
  const [slashingReports, setSlashingReports] = useState<SlashingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const reports = await getSlashingReports();
        setSlashingReports(reports);
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch oracle data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: SlashingReport['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      challenged: 'bg-orange-100 text-orange-800',
      validated: 'bg-green-100 text-green-800',
      executed: 'bg-red-100 text-red-800',
      dismissed: 'bg-gray-100 text-gray-800',
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>{status}</span>;
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
      <h2 className="text-2xl font-bold text-gray-900">Oracle Network</h2>
      <p className="text-gray-600">
        RWA-Sentinel uses a decentralized oracle network with BLS threshold cryptography for multi-party attestation signing.
        Oracles independently verify asset data and sign attestations. The slashing mechanism enforces honest behavior.
      </p>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" /> How Oracle Consensus Works
        </h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li><span className="font-medium">Data submission:</span> An asset enters the pipeline and the scoring engine produces a trust score with 6 factors.</li>
          <li><span className="font-medium">Consensus init:</span> The backend calls <code className="bg-white/80 px-1 rounded">/api/v1/consensus/init</code> with the attestation ID and a hash of the scored data.</li>
          <li><span className="font-medium">BLS signing:</span> Each of 5 oracles independently signs the message hash using BLS12-381. Partial signatures are submitted via <code className="bg-white/80 px-1 rounded">/api/v1/consensus/submit</code>.</li>
          <li><span className="font-medium">Threshold reached:</span> Once 3 of 5 oracles have signed (3-of-5 threshold), the aggregate signature is finalized and the attestation is anchored on-chain.</li>
          <li><span className="font-medium">Accountability:</span> If an oracle provides fraudulent data, anyone can file a slashing report. The oracle's stake is at risk.</li>
        </ol>
      </div>

      {/* Oracle Consensus Stats */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" /> Consensus Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700 font-medium">Model</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">3-of-5</p>
            <p className="text-xs text-blue-600 mt-1">BLS12-381 threshold</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-green-700 font-medium">Active Oracles</p>
            <p className="text-2xl font-bold text-green-900 mt-1">5</p>
            <p className="text-xs text-green-600 mt-1">All participating</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-700 font-medium">Avg Latency</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">~2s</p>
            <p className="text-xs text-amber-600 mt-1">Per consensus round</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-700 font-medium">Min Stake</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">1,000 CSPR</p>
            <p className="text-xs text-purple-600 mt-1">Per oracle node</p>
          </div>
        </div>
      </div>

      {/* Oracle Lifecycle Diagram */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Oracle Lifecycle</h3>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {[
            { label: 'Register & Stake', color: 'bg-blue-100 text-blue-700' },
            { label: 'Receive Data', color: 'bg-indigo-100 text-indigo-700' },
            { label: 'Sign (BLS)', color: 'bg-purple-100 text-purple-700' },
            { label: '3/5 Threshold', color: 'bg-green-100 text-green-700' },
            { label: 'Attest On-Chain', color: 'bg-emerald-100 text-emerald-700' },
          ].map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-gray-300">→</span>}
              <span className={`px-3 py-1.5 rounded-full font-medium ${step.color}`}>{step.label}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-300">↳</span>
          <span className="px-3 py-1.5 rounded-full font-medium bg-red-100 text-red-700">Misconduct?</span>
          <span className="text-gray-300">→</span>
          <span className="px-3 py-1.5 rounded-full font-medium bg-orange-100 text-orange-700">Report → Challenge → Slash</span>
        </div>
      </div>

      {/* Slashing Reports */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gavel className="h-5 w-5 text-red-600" /> Slashing Reports
        </h3>
        {slashingReports.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium">No slashing reports</p>
            <p className="text-sm mt-1">All oracles are operating correctly. Use the actions below to report misconduct.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oracle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slashingReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{report.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{report.oracle_id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{report.reporter.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{report.reason}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(report.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slashing Actions */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Slashing Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={async () => {
              try {
                const { postSlashingReport } = await import('../../lib/api');
                const result = await postSlashingReport({
                  oracle_id: prompt('Oracle address to report:') || '',
                  reason: prompt('Reason for report:') || '',
                  evidence: prompt('Evidence (URL or description):') || '',
                });
                alert(`Report submitted: ${result.report_id}`);
                window.location.reload();
              } catch (e: any) { alert('Error: ' + (e.message || e)); }
            }}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" /> Report Misconduct
          </button>
          <button
            onClick={async () => {
              try {
                const { postSlashingChallenge } = await import('../../lib/api');
                const result = await postSlashingChallenge({
                  report_id: prompt('Report ID to challenge:') || '',
                  challenger: walletKey || 'anonymous',
                  reason: prompt('Challenge reason:') || '',
                });
                alert(result.message);
                window.location.reload();
              } catch (e: any) { alert('Error: ' + (e.message || e)); }
            }}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Swords className="h-4 w-4" /> Challenge Report
          </button>
          <button
            onClick={async () => {
              try {
                const { postSlashingValidate } = await import('../../lib/api');
                const result = await postSlashingValidate({
                  report_id: prompt('Report ID to validate:') || '',
                  validator: walletKey || 'anonymous',
                  valid: confirm('Is the evidence valid? OK=Yes, Cancel=No'),
                });
                alert(result.message);
                window.location.reload();
              } catch (e: any) { alert('Error: ' + (e.message || e)); }
            }}
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors flex items-center gap-2"
          >
            <FileCheck className="h-4 w-4" /> Validate Evidence
          </button>
          <button
            onClick={async () => {
              try {
                const { postSlashingExecute } = await import('../../lib/api');
                const result = await postSlashingExecute({
                  report_id: prompt('Report ID to execute:') || '',
                  executor: walletKey || 'anonymous',
                });
                alert(result.message);
                window.location.reload();
              } catch (e: any) { alert('Error: ' + (e.message || e)); }
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <Hammer className="h-4 w-4" /> Execute Slash
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          These actions interact with the oracle-slashing contract on Casper testnet. Challenge periods and severity levels are enforced on-chain.
        </p>
      </div>
    </div>
  );
};

export default Oracles;
