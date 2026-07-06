import React, { useEffect, useState } from 'react';
import { getAttestations, Attestation, ErrorResponse } from '../../lib/api';
import { Loader2, XCircle, Award, CheckCircle, Link, Wallet } from 'lucide-react';

const EXPLORER_BASE_URL = 'https://testnet.cspr.live';

const SBT: React.FC = () => {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hashToVerify, setHashToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttestations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAttestations({ limit: 100 }); // Fetch a reasonable number
        setAttestations(data.attestations);
      } catch (err: any) {
        const errorRes: ErrorResponse = err;
        setError(errorRes.message || 'Failed to fetch attestations');
        console.error('Error fetching attestations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttestations();
  }, []);

  const getScoreGradientBorder = (score: number) => {
    if (score >= 80) return 'border-gradient-green'; // Custom class for green gradient
    if (score >= 60) return 'border-gradient-amber'; // Custom class for amber gradient
    return 'border-gradient-red'; // Custom class for red gradient
  };

  const handleVerifyHash = () => {
    if (!hashToVerify) {
      setVerificationResult('Please enter an attestation hash.');
      return;
    }
    const found = attestations.find(att => att.attestation_hash === hashToVerify);
    if (found) {
      setVerificationResult(`Hash found! Attestation ID: ${found.id}. Status: ${found.status}. Score: ${found.score}`);
    } else {
      setVerificationResult('Hash not found in recorded attestations.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Loading Soulbound Tokens (Attestations)...</p>
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
        RWA-Sentinel issues Soulbound Tokens (SBTs) as on-chain attestations of real-world asset verification.
        These non-transferable tokens represent the trust score and verification status of an asset at a given time.
      </p>

      {/* Mint SBT Button */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Mint a New SBT</h3>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Wallet className="h-5 w-5 mr-2" />
          Connect Wallet to Mint
        </button>
      </div>

      {/* Attestation List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Recent Attestations (SBTs)</h3>
        {attestations.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-600">
            <p>No attestations found yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attestations.map((attestation) => (
              <div
                key={attestation.id}
                className={`relative bg-white p-6 rounded-lg shadow-sm border-2 ${getScoreGradientBorder(attestation.score)}`}
                style={{
                  '--gradient-green-start': '#10B981', // green-500
                  '--gradient-green-end': '#059669',   // green-600
                  '--gradient-amber-start': '#F59E0B', // amber-500
                  '--gradient-amber-end': '#D97706',   // amber-600
                  '--gradient-red-start': '#EF4444',   // red-500
                  '--gradient-red-end': '#DC2626',     // red-600
                } as React.CSSProperties} // Type assertion for custom CSS properties
              >
                <div className="flex items-center mb-3">
                  <Award className="h-6 w-6 text-blue-600 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">SBT for {attestation.identifier}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Asset ID: <span className="font-medium">{attestation.asset_id.substring(0, 10)}...</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Type: <span className="font-medium">{attestation.asset_type}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Score: <span className={`font-bold text-lg ${getScoreGradientBorder(attestation.score).replace('border-gradient-', 'text-')}`}>
                    {attestation.score.toFixed(2)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Status: <span className="font-medium capitalize">{attestation.status}</span>
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Issued: {new Date(attestation.timestamp).toLocaleDateString()} | Expires: {new Date(attestation.expires_at).toLocaleDateString()}
                </p>
                {attestation.holder_did && (
                  <p className="text-xs text-gray-500 mb-3 font-mono truncate" title={attestation.holder_did}>
                    Soulbound to: {attestation.holder_did}
                  </p>
                )}
                <a
                  href={`${EXPLORER_BASE_URL}/deploy/${attestation.casper_block_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View on Casper Explorer <Link className="ml-1 h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hash Verification Section */}
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
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

      {/* Custom CSS for gradient borders */}
      <style>{`
        .border-gradient-green {
          border-image: linear-gradient(to right, var(--gradient-green-start), var(--gradient-green-end)) 1;
        }
        .border-gradient-amber {
          border-image: linear-gradient(to right, var(--gradient-amber-start), var(--gradient-amber-end)) 1;
        }
        .border-gradient-red {
          border-image: linear-gradient(to right, var(--gradient-red-start), var(--gradient-red-end)) 1;
        }
        .text-border-gradient-green {
          color: var(--gradient-green-end);
        }
        .text-border-gradient-amber {
          color: var(--gradient-amber-end);
        }
        .text-border-gradient-red {
          color: var(--gradient-red-end);
        }
      `}</style>
    </div>
  );
};

export default SBT;
