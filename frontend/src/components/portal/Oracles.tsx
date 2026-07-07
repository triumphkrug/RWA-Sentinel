import React, { useEffect, useState } from 'react';
import { getSlashingReports, postSlashingReport, postSlashingChallenge, postSlashingValidate, postSlashingExecute, SlashingReport, ErrorResponse } from '../../lib/api';
import { useClickRef } from '../../lib/click';
import { Loader2, XCircle, Shield, AlertTriangle, CheckCircle, Gavel, Swords, FileCheck, Hammer, ClipboardList } from 'lucide-react';
import Modal, { Toast } from './Modal';
import PageInfo from './PageInfo';

type ActionType = 'report' | 'challenge' | 'validate' | 'execute' | null;

const Oracles: React.FC = () => {
  const { publicKey: walletKey } = useClickRef();
  const [slashingReports, setSlashingReports] = useState<SlashingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const reports = await getSlashingReports();
      setSlashingReports(reports);
    } catch (err: any) {
      setError((err as ErrorResponse).message || 'Failed to fetch oracle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmitAction = async () => {
    setSubmitting(true);
    try {
      switch (activeAction) {
        case 'report': {
          const result = await postSlashingReport({
            oracle_id: formData.oracle_id || '',
            reason: formData.reason || '',
            evidence: formData.evidence || '',
          });
          showToast(`Report submitted: ${result.report_id}`, 'success');
          break;
        }
        case 'challenge': {
          const result = await postSlashingChallenge({
            report_id: formData.report_id || '',
            challenger: walletKey || 'anonymous',
            reason: formData.reason || '',
          });
          showToast(result.message || 'Challenge submitted', 'success');
          break;
        }
        case 'validate': {
          const result = await postSlashingValidate({
            report_id: formData.report_id || '',
            validator: walletKey || 'anonymous',
            valid: formData.valid === 'true',
          });
          showToast(result.message || 'Validation submitted', 'success');
          break;
        }
        case 'execute': {
          const result = await postSlashingExecute({
            report_id: formData.report_id || '',
            executor: walletKey || 'anonymous',
          });
          showToast(result.message || 'Slash executed', 'success');
          break;
        }
      }
      setActiveAction(null);
      setFormData({});
      fetchData();
    } catch (e: any) {
      showToast('Error: ' + (e.message || e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (type: ActionType) => {
    setFormData({});
    setActiveAction(type);
  };

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

      <PageInfo title="How does the Oracle Network work?">
        <p>RWA-Sentinel uses a <strong>5-node oracle network with BLS12-381 threshold cryptography</strong> for multi-party attestation signing. Each oracle independently verifies asset data and produces a partial BLS signature. When 3 of 5 oracles sign (3-of-5 threshold), the aggregate signature is finalized and the attestation is anchored on Casper testnet.</p>
        <p className="mt-1">The <strong>slashing mechanism</strong> enforces honest behavior: anyone can file a misconduct report against an oracle, triggering a challenge period. If the evidence is validated, the oracle's stake is slashed on-chain. Use the action buttons below to interact with the slashing system.</p>
      </PageInfo>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" /> Oracle Consensus Flow
        </h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li><span className="font-medium">Data submission:</span> An asset enters the pipeline and the scoring engine produces a trust score with 6 factors.</li>
          <li><span className="font-medium">Consensus init:</span> The backend calls <code className="bg-white/80 px-1 rounded">/api/v1/consensus/init</code> with the attestation ID and a hash of the scored data.</li>
          <li><span className="font-medium">BLS signing:</span> Each of 5 oracles independently signs the message hash using BLS12-381. Partial signatures are submitted via <code className="bg-white/80 px-1 rounded">/api/v1/consensus/submit</code>.</li>
          <li><span className="font-medium">Threshold reached:</span> Once 3 of 5 oracles have signed, the aggregate signature is finalized and the attestation is anchored on-chain.</li>
          <li><span className="font-medium">Accountability:</span> If an oracle provides fraudulent data, anyone can file a slashing report. The oracle's stake is at risk.</li>
        </ol>
      </div>

      {/* Oracle Stats */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" /> Consensus Status
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Oracle Lifecycle */}
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
            <p className="text-sm mt-1">All oracles are operating correctly. Use the actions below to test the slashing mechanism.</p>
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
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{report.id.substring(0, 8)}…</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{report.oracle_id.substring(0, 8)}…</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{report.reporter.substring(0, 8)}…</td>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openAction('report')}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" /> Report Misconduct
          </button>
          <button
            onClick={() => openAction('challenge')}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Swords className="h-4 w-4" /> Challenge Report
          </button>
          <button
            onClick={() => openAction('validate')}
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors flex items-center gap-2"
          >
            <FileCheck className="h-4 w-4" /> Validate Evidence
          </button>
          <button
            onClick={() => openAction('execute')}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <Hammer className="h-4 w-4" /> Execute Slash
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          These actions interact with the oracle-slashing contract on Casper testnet. Challenge periods and severity levels are enforced on-chain.
        </p>
      </div>

      {/* Action Modals */}
      <Modal open={activeAction === 'report'} onClose={() => setActiveAction(null)} title="Report Oracle Misconduct">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oracle Address</label>
            <input type="text" value={formData.oracle_id || ''} onChange={e => setFormData(p => ({ ...p, oracle_id: e.target.value }))}
              placeholder="0197cedb..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" value={formData.reason || ''} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
              placeholder="Score manipulation detected" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence (URL or description)</label>
            <input type="text" value={formData.evidence || ''} onChange={e => setFormData(p => ({ ...p, evidence: e.target.value }))}
              placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <button onClick={handleSubmitAction} disabled={submitting || !formData.oracle_id || !formData.reason}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Submit Report
          </button>
        </div>
      </Modal>

      <Modal open={activeAction === 'challenge'} onClose={() => setActiveAction(null)} title="Challenge a Report">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
            <input type="text" value={formData.report_id || ''} onChange={e => setFormData(p => ({ ...p, report_id: e.target.value }))}
              placeholder="Paste report ID" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Challenge Reason</label>
            <input type="text" value={formData.reason || ''} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
              placeholder="Scoring was legitimate" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <p className="text-xs text-gray-500">Challenging as: {walletKey ? walletKey.substring(0, 16) + '…' : 'anonymous (connect wallet)'}</p>
          <button onClick={handleSubmitAction} disabled={submitting || !formData.report_id || !formData.reason}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />} Submit Challenge
          </button>
        </div>
      </Modal>

      <Modal open={activeAction === 'validate'} onClose={() => setActiveAction(null)} title="Validate Evidence">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
            <input type="text" value={formData.report_id || ''} onChange={e => setFormData(p => ({ ...p, report_id: e.target.value }))}
              placeholder="Paste report ID" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Is the evidence valid?</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="valid" checked={formData.valid === 'true'} onChange={() => setFormData(p => ({ ...p, valid: 'true' }))} />
                <span className="text-green-700 font-medium">Yes, valid</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="valid" checked={formData.valid === 'false'} onChange={() => setFormData(p => ({ ...p, valid: 'false' }))} />
                <span className="text-red-700 font-medium">No, invalid</span>
              </label>
            </div>
          </div>
          <button onClick={handleSubmitAction} disabled={submitting || !formData.report_id || formData.valid === undefined}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />} Submit Validation
          </button>
        </div>
      </Modal>

      <Modal open={activeAction === 'execute'} onClose={() => setActiveAction(null)} title="Execute Slash">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
            <input type="text" value={formData.report_id || ''} onChange={e => setFormData(p => ({ ...p, report_id: e.target.value }))}
              placeholder="Paste report ID" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <p className="text-xs text-gray-500">Executing as: {walletKey ? walletKey.substring(0, 16) + '…' : 'anonymous (connect wallet)'}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>Warning:</strong> This will execute the slash penalty on-chain. The oracle's stake will be reduced by the slashing penalty percentage.
          </div>
          <button onClick={handleSubmitAction} disabled={submitting || !formData.report_id}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />} Execute Slash
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} visible />}
    </div>
  );
};

export default Oracles;
