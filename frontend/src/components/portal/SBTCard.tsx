import React from 'react';

interface SBTCardProps {
  assetId: string;
  assetType: string;
  issuer: string;
  trustScore: number;
  verificationDate: string;
  status: 'verified' | 'expired' | 'challenged' | 'pending';
  holderDid?: string;
}

const SBTCard: React.FC<SBTCardProps> = ({
  assetId,
  assetType,
  issuer,
  trustScore,
  verificationDate,
  status,
}) => {
  const scoreColor = trustScore >= 80 ? '#10B981' : trustScore >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = trustScore >= 80 ? 'HIGH TRUST' : trustScore >= 60 ? 'MODERATE' : 'LOW TRUST';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  // SVG arc for trust score gauge
  const radius = 58;
  const circumference = Math.PI * radius; // half-circle
  const scorePercent = Math.min(100, Math.max(0, trustScore));
  const dashOffset = circumference - (scorePercent / 100) * circumference;

  return (
    <div
      className="relative w-[320px] h-[480px] rounded-lg overflow-hidden shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #0f1b33 50%, #1a2744 100%)',
      }}
    >
      {/* Gold border frame */}
      <div
        className="absolute inset-[3px] rounded-lg overflow-hidden"
        style={{
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, #d4a843 0%, #f5d98e 30%, #c49a3b 60%, #f5d98e 100%) 1',
        }}
      >
        {/* Inner gold accent line */}
        <div className="absolute inset-[2px] rounded-md overflow-hidden">
          {/* Sky background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, #87CEEB 0%, #B0D4F1 30%, #E8F0F8 50%, #ffffff 60%, #f8f9fb 100%)',
            }}
          >
            {/* Cloud texture overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'url(/images/bg_hero.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
              }}
            />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col items-center h-full px-5 py-4">
            {/* RWA-Sentinel Logo */}
            <img
              src="/images/rwa-sentinel-logo.png"
              alt="RWA-Sentinel"
              className="w-16 h-16 object-contain drop-shadow-md"
            />

            {/* Title */}
            <h2
              className="text-2xl font-black tracking-wider mt-1"
              style={{ color: '#0f1b33', fontFamily: 'system-ui, sans-serif' }}
            >
              RWA-SENTINEL
            </h2>
            <p className="text-[10px] tracking-[0.25em] text-gray-500 uppercase mt-0.5">
              Soulbound Attestation
            </p>

            {/* Frosted data panel */}
            <div
              className="mt-3 w-full rounded-xl px-4 py-3 flex-1 flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(200,200,200,0.4)',
              }}
            >
              {/* Trust Score Gauge */}
              <div className="flex flex-col items-center mb-2">
                <p className="text-[9px] tracking-[0.2em] text-gray-400 uppercase font-semibold">
                  Trust Score
                </p>
                <div className="relative w-[140px] h-[75px] mt-1">
                  <svg viewBox="0 0 140 75" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 10 70 A 58 58 0 0 1 130 70"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Score arc */}
                    <path
                      d="M 10 70 A 58 58 0 0 1 130 70"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
                    <span
                      className="text-3xl font-black"
                      style={{ color: scoreColor }}
                    >
                      {trustScore}
                    </span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                </div>
                <p
                  className="text-[9px] font-bold tracking-wider -mt-1"
                  style={{ color: scoreColor }}
                >
                  {scoreLabel}
                </p>
              </div>

              {/* Data fields */}
              <div className="space-y-1.5 mt-1 text-xs">
                <DataRow label="ASSET ID" value={assetId} />
                <DataRow label="ASSET TYPE" value={assetType} />
                <DataRow label="ISSUER" value={issuer} />
                <DataRow label="VERIFIED" value={verificationDate} />
                <div className="flex items-center justify-between py-1 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-semibold tracking-wider">STATUS</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          status === 'verified' ? '#10B981' :
                          status === 'expired' ? '#9CA3AF' :
                          status === 'challenged' ? '#F59E0B' : '#6B7280',
                      }}
                    />
                    <span
                      className="text-xs font-bold"
                      style={{
                        color:
                          status === 'verified' ? '#10B981' :
                          status === 'expired' ? '#9CA3AF' :
                          status === 'challenged' ? '#F59E0B' : '#6B7280',
                      }}
                    >
                      {statusLabel}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Casper Network footer */}
            <div className="flex items-center gap-2 mt-2 mb-1">
              <img
                src="/images/casper-logo-bw.png"
                alt="Casper Network"
                className="w-6 h-6 object-contain opacity-70"
              />
              <span className="text-[10px] text-gray-500 font-semibold tracking-wider">
                CASPER NETWORK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1 border-t border-gray-100">
    <span className="text-[10px] text-gray-400 font-semibold tracking-wider">{label}</span>
    <span className="text-xs text-gray-800 font-medium text-right max-w-[180px] truncate" title={value}>
      {value}
    </span>
  </div>
);

export default SBTCard;
