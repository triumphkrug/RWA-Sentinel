import React, { useState } from 'react';
import {
  getLEIData,
  postPipeline,
  getScores,
  getAttestations,
  LEIData,
  PipelineRunResponse,
  AssetScore,
  Attestation,
  ErrorResponse,
  RealInvoice,
} from '../../lib/api';
import {
  Play,
  Clipboard,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileSearch,
  Cpu,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import PageInfo from './PageInfo';
import { Toast } from './Modal';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

type DataMode = 'real' | 'demo';

const EXAMPLE_REAL_INVOICE_JSON = JSON.stringify(
  [
    {
      invoiceId: 'inv-real-0001',
      issuer: '5493001KJTIIGC8Y1R12',
      debtor: 'ACME Debtor Corp',
      amountCents: 1_250_000,
      currencyCode: 'USD',
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      lineItems: [{ description: 'Consulting services, Q3', quantity: 1, unitPriceCents: 1_250_000 }],
      metadata: {},
    },
  ],
  null,
  2,
);

const AgentDemo: React.FC = () => {
  const [lei, setLei] = useState<string>('5493001KJTIIGC8Y1R12');
  const [dataMode, setDataMode] = useState<DataMode>('real');
  const [realInvoiceJson, setRealInvoiceJson] = useState<string>('');
  const [invoiceJsonError, setInvoiceJsonError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stepResults, setStepResults] = useState<{
    leiData: LEIData | null;
    pipelineResponse: PipelineRunResponse | null;
    assetScore: AssetScore | null;
    attestation: Attestation | null;
  }>({
    leiData: null,
    pipelineResponse: null,
    assetScore: null,
    attestation: null,
  });

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  const resetDemo = () => {
    setLogs([]);
    setLoadingStep(null);
    setStepResults({ leiData: null, pipelineResponse: null, assetScore: null, attestation: null });
  };

  const runStep = async (step: number, action: () => Promise<any>) => {
    setLoadingStep(step);
    addLog(`Starting Step ${step}...`, 'info');
    try {
      const result = await action();
      addLog(`Step ${step} completed successfully!`, 'success');
      return result;
    } catch (err: any) {
      addLog(`Step ${step} failed: ${(err as ErrorResponse).message || 'Unknown error'}`, 'error');
      throw err;
    } finally {
      setLoadingStep(null);
    }
  };

  const handleRunFullPipeline = async () => {
    resetDemo();
    setInvoiceJsonError(null);
    if (!lei) { addLog('Please enter an LEI.', 'error'); return; }

    let invoices: RealInvoice[] | undefined;
    if (dataMode === 'real' && realInvoiceJson.trim()) {
      try {
        const parsed = JSON.parse(realInvoiceJson);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Expected a non-empty JSON array of invoices.');
        invoices = parsed as RealInvoice[];
      } catch (e: any) {
        const msg = `Invalid invoice JSON: ${e.message || e}`;
        setInvoiceJsonError(msg);
        addLog(msg, 'error');
        return;
      }
    }

    try {
      const leiData = await runStep(1, () => getLEIData(lei));
      setStepResults((prev) => ({ ...prev, leiData }));
      addLog(`Fetched LEI Data for ${leiData.legal_name}`, 'info');

      const pipelineRes = await runStep(2, () => postPipeline({ lei, invoices }));
      setStepResults((prev) => ({ ...prev, pipelineResponse: pipelineRes }));
      addLog(
        pipelineRes.dataSource === 'real-upload'
          ? 'Pipeline scored your real uploaded invoice data.'
          : 'Pipeline used synthetic demo invoices (no real data supplied).',
        'info',
      );

      addLog('Processing pipeline batch...', 'info');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const scores = await runStep(3, async () => {
        const allScores = await getScores();
        const assetScore = allScores.find(s => s.identifier === lei) || allScores[allScores.length - 1];
        if (!assetScore) throw new Error('No scores available after pipeline run.');
        return assetScore;
      });
      setStepResults((prev) => ({ ...prev, assetScore: scores }));
      addLog(`Asset scored: ${(scores?.score ?? 0).toFixed(2)}`, 'info');

      const attestations = await runStep(4, async () => {
        let allAttestations = await getAttestations({ limit: 20, status: 'attested' });
        if (!allAttestations.attestations?.length) allAttestations = await getAttestations({ limit: 20 });
        const attestation = allAttestations.attestations?.find((a: Attestation) => a.identifier === lei) || allAttestations.attestations?.[0];
        if (!attestation) throw new Error('No attestations found yet.');
        return attestation;
      });
      setStepResults((prev) => ({ ...prev, attestation: attestations }));
      addLog(`Attestation found: ${(attestations?.id || '').substring(0, 12)}…`, 'info');

      addLog('Full pipeline completed successfully!', 'success');
      showToast('Pipeline completed — attestation anchored on-chain', 'success');
    } catch {
      addLog('Pipeline failed.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'info');
  };

  const stepIcon = (step: number, active: boolean, done: boolean) => {
    if (loadingStep === step) return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
    if (done) return <CheckCircle className="h-6 w-6 text-green-600" />;
    if (active) return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
    return null;
  };

  const icons = [FileSearch, Cpu, BarChart3, ShieldCheck];
  const stepLabels = ['Fetch Entity Data', 'Run Scoring Engine', 'Retrieve Trust Score', 'View Attestation'];
  const stepDescs = ['GLEIF LEI + company registry lookup', '6-factor scoring with cross-reference validation', 'Weighted score aggregation (0–100)', 'On-chain attestation via Casper smart contracts'];
  const stepDone = [!!stepResults.leiData, !!stepResults.pipelineResponse, !!stepResults.assetScore, !!stepResults.attestation];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Scoring Pipeline</h2>

      <PageInfo title="What is the Scoring Pipeline?">
        <p>This is the <strong>end-to-end RWA verification pipeline</strong> that RWA-Sentinel runs autonomously. It takes a Legal Entity Identifier (LEI), fetches entity data from GLEIF and corporate registries, ingests invoice documents, runs the 6-factor scoring engine (document authenticity, market cross-reference, entity verification, corporate registry, historical consistency, KYC status), and anchors the resulting attestation on Casper testnet via the BLS oracle consensus.</p>
        <p className="mt-1">You can run it in <strong>Real mode</strong> (paste your own invoice JSON) or <strong>Demo mode</strong> (auto-generated synthetic data). The pipeline response always reports which data source was used — it never silently labels synthetic data as real.</p>
      </PageInfo>

      {/* Input Controls */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <label htmlFor="leiInput" className="text-sm font-medium text-gray-700 shrink-0">LEI Code:</label>
          <input
            type="text" id="leiInput" value={lei} onChange={(e) => setLei(e.target.value)}
            placeholder="e.g., 5493001KJTIIGC8Y1R12"
            className="flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleRunFullPipeline}
              disabled={loadingStep !== null}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loadingStep !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Pipeline
            </button>
            <button
              onClick={resetDemo}
              disabled={loadingStep !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {/* Data source toggle */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <span className="text-sm font-medium text-gray-700">Data source:</span>
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="dataMode" value="real" checked={dataMode === 'real'} onChange={() => setDataMode('real')} disabled={loadingStep !== null}
                className="text-blue-600 focus:ring-blue-500" />
              <span>Real invoice data</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="dataMode" value="demo" checked={dataMode === 'demo'} onChange={() => setDataMode('demo')} disabled={loadingStep !== null}
                className="text-blue-600 focus:ring-blue-500" />
              <span>Synthetic demo data</span>
            </label>
          </div>

          {dataMode === 'real' && (
            <div>
              <textarea
                value={realInvoiceJson} onChange={(e) => setRealInvoiceJson(e.target.value)}
                placeholder={`Paste a JSON array of invoices, e.g.:\n${EXAMPLE_REAL_INVOICE_JSON.slice(0, 200)}…`}
                rows={4} disabled={loadingStep !== null}
                className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Left empty → the backend falls back to synthetic demo invoices. The run log always states which source was used.
              </p>
              {invoiceJsonError && <p className="text-xs text-red-600 mt-1">{invoiceJsonError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Steps — horizontal progress */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Pipeline Steps</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stepLabels.map((label, i) => {
            const Icon = icons[i];
            const done = stepDone[i];
            const active = loadingStep === i + 1;
            return (
              <div
                key={i}
                className={`relative rounded-xl border-2 p-4 transition-all duration-300 ${
                  done ? 'border-green-200 bg-green-50/50' :
                  active ? 'border-blue-300 bg-blue-50/50 shadow-md' :
                  'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${done ? 'bg-green-100' : active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-5 w-5 ${done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  {stepIcon(i + 1, active, done)}
                </div>
                <p className={`font-semibold text-sm ${done ? 'text-green-900' : active ? 'text-blue-900' : 'text-gray-700'}`}>
                  {i + 1}. {label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{stepDescs[i]}</p>
                {/* Step-specific result snippet */}
                {i === 0 && stepResults.leiData && (
                  <p className="text-xs text-green-700 mt-2 font-mono truncate">{stepResults.leiData.legal_name}</p>
                )}
                {i === 1 && stepResults.pipelineResponse && (
                  <p className="text-xs text-green-700 mt-2 font-mono truncate">ID: {(stepResults.pipelineResponse.pipeline_id || '').slice(0, 12)}…</p>
                )}
                {i === 2 && stepResults.assetScore && (
                  <p className="text-xs text-green-700 mt-2 font-bold">Score: {(stepResults.assetScore.score ?? 0).toFixed(1)}</p>
                )}
                {i === 3 && stepResults.attestation && (
                  <p className="text-xs text-green-700 mt-2 font-mono truncate">#{stepResults.attestation.id.slice(0, 8)}…</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Log */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Execution Log</h3>
          <span className="text-xs text-gray-400">{logs.length} entries</span>
        </div>
        <div className="bg-slate-900 text-slate-200 p-4 font-mono text-xs h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500">Run the pipeline to see execution output.</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}>
                <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Results */}
      {(stepResults.leiData || stepResults.pipelineResponse || stepResults.assetScore || stepResults.attestation) && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {([
              ['LEI Data', stepResults.leiData],
              ['Pipeline Response', stepResults.pipelineResponse],
              ['Asset Score', stepResults.assetScore],
              ['Attestation', stepResults.attestation],
            ] as [string, any][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-lg border border-slate-200 p-4 relative">
                <h4 className="font-semibold text-gray-800 text-sm mb-2">{label}</h4>
                <pre className="text-xs overflow-x-auto bg-white rounded-lg p-3 border border-slate-100 max-h-40 overflow-y-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(value, null, 2))}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} visible />}
    </div>
  );
};

export default AgentDemo;
