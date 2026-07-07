import React, { useState } from 'react';
import {
  getLEIData,
  postPipeline,
  getScores,
  getAttestationById,
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
  Download,
  Zap,
  Award,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Clipboard,
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// S2 (2026-07-07): explicit Demo/Real data-source toggle. "Real" is the
// default mode - if you paste your own invoice JSON below, the pipeline
// scores exactly that data through the same real scoring/cross-ref/Merkle/
// on-chain-attestation flow as any other run. Only if you leave it empty
// (or explicitly pick "Demo") does the backend fall back to its synthetic
// invoice generator - and the API response always reports which one
// actually happened (`dataSource`), so this page never silently mislabels
// synthetic output as real.
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
  const [lei, setLei] = useState<string>('5493001KJTIIGC8Y1R12'); // Example LEI
  const [dataMode, setDataMode] = useState<DataMode>('real');
  const [realInvoiceJson, setRealInvoiceJson] = useState<string>('');
  const [invoiceJsonError, setInvoiceJsonError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
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

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  const resetDemo = () => {
    setLogs([]);
    setLoadingStep(null);
    setStepResults({
      leiData: null,
      pipelineResponse: null,
      assetScore: null,
      attestation: null,
    });
  };

  const runStep = async (step: number, action: () => Promise<any>) => {
    setLoadingStep(step);
    addLog(`Starting Step ${step}...`, 'info');
    try {
      const result = await action();
      addLog(`Step ${step} completed successfully!`, 'success');
      return result;
    } catch (err: any) {
      const errorRes: ErrorResponse = err;
      addLog(`Step ${step} failed: ${errorRes.message || 'Unknown error'}`, 'error');
      console.error(`Step ${step} error:`, err);
      throw err; // Re-throw to stop the pipeline
    } finally {
      setLoadingStep(null);
    }
  };

  const handleRunFullPipeline = async () => {
    resetDemo();
    setInvoiceJsonError(null);
    if (!lei) {
      addLog('Please enter an LEI.', 'error');
      return;
    }

    // S2: parse+validate the real-invoice payload only when Real mode is
    // selected and the box isn't empty. An empty box in Real mode is not
    // silently treated as "real data" - we tell the user up front that the
    // backend will fall back to its demo generator, and the run log below
    // reports which one actually happened.
    let invoices: RealInvoice[] | undefined;
    if (dataMode === 'real' && realInvoiceJson.trim()) {
      try {
        const parsed = JSON.parse(realInvoiceJson);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Expected a non-empty JSON array of invoices.');
        }
        invoices = parsed as RealInvoice[];
      } catch (e: any) {
        const msg = `Invalid real invoice JSON: ${e.message || e}`;
        setInvoiceJsonError(msg);
        addLog(msg, 'error');
        return;
      }
    }

    try {
      // Step 1: Fetch GLEIF/company data
      const leiData = await runStep(1, () => getLEIData(lei));
      setStepResults((prev) => ({ ...prev, leiData }));
      addLog(`Fetched LEI Data for ${leiData.legal_name}`, 'info');

      // Step 2: Run scoring pipeline
      const pipelineRes = await runStep(2, () => postPipeline({ lei, invoices }));
      setStepResults((prev) => ({ ...prev, pipelineResponse: pipelineRes }));
      addLog(
        pipelineRes.dataSource === 'real-upload'
          ? 'Pipeline scored your real, uploaded invoice data.'
          : 'Pipeline used synthetic demo invoices (no real data was supplied).',
        'info',
      );

      // Simulate waiting for pipeline to complete (in a real app, this would be a webhook or polling)
      addLog('Simulating pipeline processing... (waiting 3 seconds)', 'info');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: View scores
      const scores = await runStep(3, async () => {
        const allScores = await getScores();
        const assetScore = allScores.find(s => s.identifier === lei);
        if (!assetScore) throw new Error('Score not found for this LEI after pipeline run.');
        return assetScore;
      });
      setStepResults((prev) => ({ ...prev, assetScore: scores }));
      addLog(`Asset scored: ${scores.score.toFixed(2)}`, 'info');

      // Step 4: View attestation (assuming an attestation is created from the score)
      const attestations = await runStep(4, async () => {
        const allAttestations = await getAttestations({ limit: 1, status: 'attested', min_score: scores.score - 1 }); // Try to find a recent attestation for this score
        const attestation = allAttestations.attestations.find((a: Attestation) => a.identifier === lei);
        if (!attestation) throw new Error('Attestation not found for this LEI.');
        return attestation;
      });
      setStepResults((prev) => ({ ...prev, attestation: attestations }));
      addLog(`Attestation found: ${attestations.id}`, 'info');

      addLog('Full pipeline demo completed successfully!', 'success');
    } catch (e) {
      addLog('Full pipeline demo failed.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog('Copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Agent Pipeline Demo</h2>
      <p className="text-gray-700">
        Experience the RWA-Sentinel AI oracle pipeline in action. Enter an LEI (Legal Entity Identifier)
        to simulate the process of data fetching, scoring, and attestation.
      </p>

      {/* Input and Controls */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
          <label htmlFor="leiInput" className="text-lg font-medium text-gray-700 flex-shrink-0">
            Enter LEI:
          </label>
          <input
            type="text"
            id="leiInput"
            value={lei}
            onChange={(e) => setLei(e.target.value)}
            placeholder="e.g., 5493001KJTIIGC8Y1R12"
            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleRunFullPipeline}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loadingStep !== null}
          >
            {loadingStep !== null ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
            Run Full Pipeline
          </button>
          <button
            onClick={resetDemo}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loadingStep !== null}
          >
            Reset
          </button>
        </div>

        {/* S2: Demo/Real invoice data-source toggle - Real is the default. */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <div className="flex items-center space-x-4 mb-2">
            <span className="text-sm font-medium text-gray-700">Invoice data source:</span>
            <label className="inline-flex items-center space-x-1 text-sm text-gray-700">
              <input
                type="radio"
                name="dataMode"
                value="real"
                checked={dataMode === 'real'}
                onChange={() => setDataMode('real')}
                disabled={loadingStep !== null}
              />
              <span>Real (paste your own invoice JSON)</span>
            </label>
            <label className="inline-flex items-center space-x-1 text-sm text-gray-700">
              <input
                type="radio"
                name="dataMode"
                value="demo"
                checked={dataMode === 'demo'}
                onChange={() => setDataMode('demo')}
                disabled={loadingStep !== null}
              />
              <span>Demo (auto-generated synthetic invoices)</span>
            </label>
          </div>

          {dataMode === 'real' && (
            <div>
              <textarea
                value={realInvoiceJson}
                onChange={(e) => setRealInvoiceJson(e.target.value)}
                placeholder={`Paste a JSON array of invoices, e.g.:\n${EXAMPLE_REAL_INVOICE_JSON}`}
                rows={5}
                disabled={loadingStep !== null}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm font-mono text-xs focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Left empty, the backend falls back to its synthetic demo generator instead — the
                run log below always states which one actually happened, never silently labels
                synthetic data as real.
              </p>
              {invoiceJsonError && <p className="text-xs text-red-600 mt-1">{invoiceJsonError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Flow Visualization */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Flow</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className={`flex flex-col items-center p-4 rounded-lg border ${loadingStep === 1 ? 'border-blue-500 bg-blue-50' : stepResults.leiData ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Download className={`h-8 w-8 ${loadingStep === 1 ? 'text-blue-600' : stepResults.leiData ? 'text-green-600' : 'text-gray-500'}`} />
            <p className="mt-2 font-medium text-center">1. Fetch Data</p>
            {stepResults.leiData && <p className="text-xs text-gray-600 mt-1">LEI: {stepResults.leiData.lei}</p>}
          </div>
          <div className="flex items-center justify-center">
            <ChevronRight className="h-6 w-6 text-gray-400" />
          </div>

          {/* Step 2 */}
          <div className={`flex flex-col items-center p-4 rounded-lg border ${loadingStep === 2 ? 'border-blue-500 bg-blue-50' : stepResults.pipelineResponse ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Zap className={`h-8 w-8 ${loadingStep === 2 ? 'text-blue-600' : stepResults.pipelineResponse ? 'text-green-600' : 'text-gray-500'}`} />
            <p className="mt-2 font-medium text-center">2. Run Scoring Pipeline</p>
            {stepResults.pipelineResponse && <p className="text-xs text-gray-600 mt-1">ID: {stepResults.pipelineResponse.pipeline_id.substring(0, 8)}...</p>}
          </div>
          <div className="flex items-center justify-center">
            <ChevronRight className="h-6 w-6 text-gray-400" />
          </div>

          {/* Step 3 */}
          <div className={`flex flex-col items-center p-4 rounded-lg border ${loadingStep === 3 ? 'border-blue-500 bg-blue-50' : stepResults.assetScore ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <CheckCircle className={`h-8 w-8 ${loadingStep === 3 ? 'text-blue-600' : stepResults.assetScore ? 'text-green-600' : 'text-gray-500'}`} />
            <p className="mt-2 font-medium text-center">3. View Scores</p>
            {stepResults.assetScore && <p className="text-xs text-gray-600 mt-1">Score: {stepResults.assetScore.score.toFixed(2)}</p>}
          </div>
          <div className="flex items-center justify-center">
            <ChevronRight className="h-6 w-6 text-gray-400" />
          </div>

          {/* Step 4 */}
          <div className={`flex flex-col items-center p-4 rounded-lg border ${loadingStep === 4 ? 'border-blue-500 bg-blue-50' : stepResults.attestation ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Award className={`h-8 w-8 ${loadingStep === 4 ? 'text-blue-600' : stepResults.attestation ? 'text-green-600' : 'text-gray-500'}`} />
            <p className="mt-2 font-medium text-center">4. View Attestation</p>
            {stepResults.attestation && <p className="text-xs text-gray-600 mt-1">ID: {stepResults.attestation.id.substring(0, 8)}...</p>}
          </div>
        </div>
      </div>

      {/* Real-time Log Display */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Logs</h3>
        <div className="bg-gray-800 text-white p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet. Run the pipeline to see output.</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-200'}>
                [{log.timestamp}] {log.message}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Results Display */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stepResults.leiData && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 relative">
              <h4 className="font-semibold text-gray-800 mb-2">LEI Data</h4>
              <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                {JSON.stringify(stepResults.leiData, null, 2)}
              </pre>
              <button
                onClick={() => copyToClipboard(JSON.stringify(stepResults.leiData, null, 2))}
                className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
          )}
          {stepResults.pipelineResponse && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 relative">
              <h4 className="font-semibold text-gray-800 mb-2">Pipeline Response</h4>
              <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                {JSON.stringify(stepResults.pipelineResponse, null, 2)}
              </pre>
              <button
                onClick={() => copyToClipboard(JSON.stringify(stepResults.pipelineResponse, null, 2))}
                className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
          )}
          {stepResults.assetScore && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 relative">
              <h4 className="font-semibold text-gray-800 mb-2">Asset Score</h4>
              <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                {JSON.stringify(stepResults.assetScore, null, 2)}
              </pre>
              <button
                onClick={() => copyToClipboard(JSON.stringify(stepResults.assetScore, null, 2))}
                className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
          )}
          {stepResults.attestation && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 relative">
              <h4 className="font-semibold text-gray-800 mb-2">Attestation</h4>
              <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                {JSON.stringify(stepResults.attestation, null, 2)}
              </pre>
              <button
                onClick={() => copyToClipboard(JSON.stringify(stepResults.attestation, null, 2))}
                className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {!stepResults.leiData && !stepResults.pipelineResponse && !stepResults.assetScore && !stepResults.attestation && (
          <p className="text-gray-600 text-center">Run the pipeline to see results here.</p>
        )}
      </div>
    </div>
  );
};

export default AgentDemo;
