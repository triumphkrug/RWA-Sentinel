import React, { useEffect, useState } from 'react';
import { getAttestations, Attestation, ErrorResponse } from '../../lib/api';
import { useClickRef } from '../../lib/click';
import { shortKey } from '../../lib/wallet';
import { Loader2, XCircle, Award, CheckCircle, Link, Wallet } from 'lucide-react';
import SBTCard from './SBTCard';

const EXPLORER_BASE_URL = 'https://testnet.cspr.live';

const SBT: React.FC = () => {
  const { publicKey, ready, clickRef } = useClickRef();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hashToVerify, setHashToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);

  useEffect(() => {
    const fetchAttestations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAttestations({ limit: 100 });
        setAttestations(data.attestations);
        if (data.attestations.length > 0) {
          setSelectedAttestation(data.attestations[0]);
        }
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch attestations');
      } finally {
        setLoading(false);
      }
    };
    fetchAttestations();
  }, []);

  const handleVerifyHash = () => {
    if (!hashToVerify) {
      setVerificationResult('Please enter an attestation hash.');
      return;
    }
    const found = attestations.find(att => att.attestation_hash === hashToVerify);
    if (found) {
      setVerificationResult(`Hash found! Attestation ID: ${found.id}. Status: ${found.status}. Score: ${found.score}`);
    } else {
      setVerificationResult('Hash not found in recorded attestations. Paste the attestation_hash value (e.g., bf0ce98af2b2...) from an existing attestation, or run the Agent Demo pipeline to generate new attestations.');
    }
  };

  const getStatusType = (status: string): 'verified' | 'expired' | 'challenged' | 'pending' => {
    if (status === 'valid' || status === 'active') return 'verified';
    if (status === 'expired') return 'expired';
    if (status === 'challenged' || status === 'invalidated') return 'challenged';
    return 'pending';
  };

  const formatAssetType = (type: string): string =>
    type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading Soulbound Tokens...</p>
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
      <h2 className="text-3xl font-bold text-gray-900">Soulbound Tokens (SBTs)</h2>
      <p className="text-gray-700">
        RWA-Sentinel issues Soulbound Tokens as on-chain attestations of real-world asset verification.
        These non-transferable tokens represent the trust score and verification status of an asset at a given time.
        Click any attestation below to preview its SBT card.
      </p>

      {/* What are SBTs */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Award className="h-5 w-5" /> How SBTs Work
        </h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>Each attestation becomes a non-transferable Soulbound Token bound to the verifier's DID</li>
          <li>SBTs expire when the underlying attestation expires — DeFi protocols call <code className="bg-white/80 px-1 rounded">is_valid()</code> to check</li>
          <li>Click any attestation in the list below to preview its SBT card visualization</li>
          <li>Use the hash verifier at the bottom to check any attestation hash against the on-chain record</li>
          {publicKey && <li>Connected as: <code className="bg-white/80 px-1 rounded font-mono text-xs">{shortKey(publicKey)}</code></li>}
          {!publicKey && <li>Connect your wallet in the sidebar to associate SBTs with your account</li>}
        </ul>
      </div>

      {/* SBT Card Preview + Attestation List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic SBT Card */}
        <div className="lg:col-span-1 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">SBT Preview</h3>
          {selectedAttestation ? (
            <SBTCard
              assetId={selectedAttestation.asset_id}
              assetType={formatAssetType(selectedAttestation.asset_type)}
              issuer={selectedAttestation.identifier || 'On-chain Oracle'}
              trustScore={Math.round(selectedAttestation.score)}
              verificationDate={new Date(selectedAttestation.timestamp).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
              status={getStatusType(selectedAttestation.status)}
            />
          ) : (
            <div className="w-[320px] h-[480px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              No attestation selected
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Click an attestation to preview its SBT
          </p>
        </div>

        {/* Attestation List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent Attestations</h3>
          {attestations.length === 0 ? (
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600">
              <p>No attestations found yet. Run the Agent Demo to generate attestations.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {attestations.map((attestation) => (
                <button
                  key={attestation.id}
                  onClick={() => setSelectedAttestation(attestation)}
                  className={`w-full text-left bg-white p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedAttestation?.id === attestation.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className={`h-5 w-5 ${
                        attestation.score >= 80 ? 'text-green-500' :
                        attestation.score >= 60 ? 'text-amber-500' : 'text-red-500'
                      }`} />
                      <span className="font-medium text-gray-900 text-sm">
                        {attestation.identifier || attestation.asset_id.slice(0, 16) + '…'}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${
                      attestation.score >= 80 ? 'text-green-600' :
                      attestation.score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {Math.round(attestation.score)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {formatAssetType(attestation.asset_type)} · {new Date(attestation.timestamp).toLocaleDateString()}
                    </span>
                    <a
                      href={`${EXPLORER_BASE_URL}/deploy/${attestation.casper_block_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hash Verification */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Verify Attestation Hash</h3>
        <p className="text-gray-700 mb-4">
          Enter an attestation hash to verify its existence and details within the RWA-Sentinel records.
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <input
            type="text"
            value={hashToVerify}
            onChange={(e) => setHashToVerify(e.target.value)}
            placeholder="Enter attestation hash (e.g., bf0ce98af2b2...)"
            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleVerifyHash}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Verify Hash
          </button>
        </div>
        {verificationResult && (
          <div className="mt-4 p-3 rounded-md bg-gray-50 border border-gray-200 text-gray-700">
            <p className="font-medium">Verification Result:</p>
            <p>{verificationResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SBT;
