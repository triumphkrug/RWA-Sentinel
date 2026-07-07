import React from 'react';

interface SBTCardProps {
  assetId: string;
  assetType: string;
  issuer: string;
  trustScore: number;
  verificationDate: string;
  status: 'verified' | 'expired' | 'challenged' | 'pending';
}

/**
 * Dynamic SBT Card that renders on top of the original art-deco design.
 * Uses sbt-template.webp (cleaned background with data zones blanked)
 * and overlays real attestation data via absolute-positioned elements.
 */
const SBTCard: React.FC<SBTCardProps> = ({
  assetId,
  assetType,
  issuer,
  trustScore,
  verificationDate,
  status,
}) => {
  const scoreColor = trustScore >= 80 ? '#15803d' : trustScore >= 60 ? '#b45309' : '#dc2626';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor =
    status === 'verified' ? '#16a34a' :
    status === 'expired' ? '#9ca3af' :
    status === 'challenged' ? '#d97706' : '#6b7280';

  return (
    <div className="relative rounded-lg overflow-hidden shadow-xl" style={{ width: 380, height: 570 }}>
      {/* Original art-deco background (cleaned template) */}
      <img
        src="/images/sbt-template.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* TRUST SCORE label */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '29.8%', fontSize: 9, fontWeight: 600, letterSpacing: 3, color: '#4a8c5c', textTransform: 'uppercase' as const }}
      >
        TRUST SCORE
      </div>

      {/* Score number */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '33.5%', fontSize: 54, fontWeight: 900, color: scoreColor, lineHeight: 1 }}
      >
        {trustScore}
      </div>

      {/* /100 */}
      <div
        className="absolute"
        style={{ top: '40.5%', left: '55.5%', fontSize: 16, fontWeight: 600, color: '#6b7280' }}
      >
        /100
      </div>

      {/* Shield checkmark */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '43.5%' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill={scoreColor}>
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        </svg>
      </div>

      {/* Data values — positioned to match the original design grid */}
      <DataValue top="50.2%">{assetId}</DataValue>
      <DataValue top="56.2%">{assetType}</DataValue>
      <DataValue top="62.1%">{issuer}</DataValue>
      <DataValue top="68.0%">{verificationDate}</DataValue>

      {/* Status row with badge */}
      <div
        className="absolute flex items-center gap-1"
        style={{ top: '74.2%', right: '19%' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={statusColor}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusColor, letterSpacing: 0.5 }}>
          {statusLabel.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

const DataValue: React.FC<{ top: string; children: React.ReactNode }> = ({ top, children }) => (
  <div
    className="absolute text-right"
    style={{
      top,
      right: '19%',
      fontSize: 12.5,
      fontWeight: 600,
      color: '#1f2937',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

export default SBTCard;
