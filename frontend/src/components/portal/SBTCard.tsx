import React from 'react';

interface SBTCardProps {
  assetId: string;
  assetType: string;
  issuer: string;
  trustScore: number;
  verificationDate: string;
  status: 'verified' | 'expired' | 'challenged' | 'pending';
}

/* ── SVG icon paths (Material-style) ── */
const ICONS = {
  doc: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z',
  shapes: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7a2.5 2.5 0 010-5 2.5 2.5 0 010 5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z',
  bank: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z',
  calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
};

/** Max visible characters for value fields before ellipsis */
const MAX_VAL_LEN = 25;
const ellipsis = (s: string) => s.length > MAX_VAL_LEN ? s.slice(0, MAX_VAL_LEN - 1) + '…' : s;

const SBTCard: React.FC<SBTCardProps> = ({
  assetId,
  assetType,
  issuer,
  trustScore,
  verificationDate,
  status,
}) => {
  const scoreColor = trustScore >= 80 ? '#15803d' : trustScore >= 60 ? '#b45309' : '#dc2626';
  const arcColor = trustScore >= 80 ? '#16a34a' : trustScore >= 60 ? '#d97706' : '#ef4444';
  const statusLabel = status.toUpperCase();
  const statusColor =
    status === 'verified' ? '#16a34a' :
    status === 'expired' ? '#9ca3af' :
    status === 'challenged' ? '#d97706' : '#6b7280';

  const arcLen = 198;
  const dashOffset = arcLen * (1 - Math.min(trustScore, 100) / 100);

  const rows: { icon: string; label: string; value: React.ReactNode }[] = [
    { icon: ICONS.doc, label: 'Asset ID', value: ellipsis(assetId) },
    { icon: ICONS.shapes, label: 'Asset Type', value: ellipsis(assetType) },
    { icon: ICONS.bank, label: 'Issuer', value: ellipsis(issuer) },
    { icon: ICONS.calendar, label: 'Verification\nDate', value: ellipsis(verificationDate) },
    {
      icon: ICONS.shield,
      label: 'Status',
      value: (
        <span className="flex items-center gap-1 ml-auto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill={statusColor}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, letterSpacing: 0.5 }}>
            {statusLabel}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 400,
        height: 600,
        borderRadius: 6,
        boxShadow: '0 0 0 3px #b8942e, 0 0 0 6px #0d1b3e, 0 0 0 8px #c9a84c, 0 20px 50px rgba(0,0,0,0.45)',
      }}
    >
      {/* Sky background */}
      <div
        className="absolute inset-0"
        style={{ background: 'url(/images/bg_hero.webp) center 30%/cover' }}
      />

      {/* Navy frame overlay on edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: [
            'linear-gradient(to right, rgba(13,27,62,0.92) 0%, rgba(13,27,62,0.92) 3%, transparent 8%, transparent 92%, rgba(13,27,62,0.92) 97%, rgba(13,27,62,0.92) 100%)',
            'linear-gradient(to bottom, rgba(13,27,62,0.92) 0%, rgba(13,27,62,0.92) 2.5%, transparent 6%, transparent 94%, rgba(13,27,62,0.92) 97.5%, rgba(13,27,62,0.92) 100%)',
          ].join(', '),
        }}
      />

      {/* Gold inset border */}
      <div
        className="absolute pointer-events-none"
        style={{ inset: 12, border: '1.5px solid rgba(201,168,76,0.6)', borderRadius: 4, zIndex: 2 }}
      />

      {/* Art-deco corner ornaments */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => {
        const transforms: Record<string, string> = {
          tl: '', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1,-1)',
        };
        const positions: Record<string, React.CSSProperties> = {
          tl: { top: 6, left: 6 }, tr: { top: 6, right: 6 },
          bl: { bottom: 6, left: 6 }, br: { bottom: 6, right: 6 },
        };
        return (
          <div
            key={pos}
            className="absolute pointer-events-none"
            style={{ ...positions[pos], zIndex: 3, transform: transforms[pos] || undefined }}
          >
            <svg width="50" height="50" viewBox="0 0 50 50">
              <path d="M0 0L50 0L50 4L4 4L4 50L0 50Z" fill="rgba(201,168,76,0.7)" />
              <path d="M8 8L40 8L40 10L10 10L10 40L8 40Z" fill="rgba(201,168,76,0.35)" />
              <path d="M0 0L20 0L20 2L2 2L2 20L0 20Z" fill="rgba(201,168,76,0.9)" />
              <circle cx="6" cy="6" r="2" fill="rgba(201,168,76,0.5)" />
            </svg>
          </div>
        );
      })}

      {/* Frosted panel */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          top: 24, left: 28, right: 28, bottom: 24,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '14px 18px 12px',
          zIndex: 4,
          boxShadow: '0 4px 30px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {/* RWA-Sentinel logo */}
        <img
          src="/images/rwa-sentinel-logo.png"
          alt="RWA-Sentinel"
          className="object-contain"
          style={{ width: 56, height: 56, marginBottom: 4, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
        />

        {/* Title */}
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 24, fontWeight: 900, color: '#0d1b3e', letterSpacing: 3, textAlign: 'center' }}>
          RWA-SENTINEL
        </div>

        <DiamondDivider />

        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, fontWeight: 500, color: '#7c8594', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
          Soulbound Attestation
        </div>

        {/* Trust Score Gauge — number only, no label text */}
        <div className="relative" style={{ width: 150, height: 82 }}>
          <svg width="150" height="82" viewBox="0 0 150 82">
            <path d="M 12 78 A 63 63 0 0 1 138 78" fill="none" stroke="#e5e7eb" strokeWidth="11" strokeLinecap="round" />
            <path
              d="M 12 78 A 63 63 0 0 1 138 78"
              fill="none"
              stroke={arcColor}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={arcLen}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute text-center" style={{ top: 28, left: '50%', transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: scoreColor }}>{trustScore}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>/100</span>
          </div>
        </div>

        {/* Shield checkmark */}
        <div style={{ margin: '-2px 0 4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={arcColor}>
            <path d={ICONS.shield} />
          </svg>
        </div>

        {/* Data rows */}
        <div className="w-full flex-1 flex flex-col justify-center">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center"
              style={{
                padding: '6px 6px',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(180,185,200,0.25)' : 'none',
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(13,27,62,0.07)', marginRight: 8 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#2c4a7c">
                  <path d={row.icon} />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 8.5, fontWeight: 700, color: '#4a5568',
                  letterSpacing: 1.5, textTransform: 'uppercase', minWidth: 80,
                  whiteSpace: 'pre-line',
                }}
              >
                {row.label}
              </span>
              {typeof row.value === 'string' ? (
                <span
                  className="ml-auto text-right"
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#1a202c',
                    maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {row.value}
                </span>
              ) : (
                row.value
              )}
            </div>
          ))}
        </div>

        {/* Footer: Casper Network */}
        <div className="mt-auto flex flex-col items-center gap-1 pt-1">
          <DiamondDivider />
          <div className="flex items-center gap-2">
            <img src="/images/casper-logo-bw.png" alt="Casper" style={{ width: 24, height: 24, opacity: 0.55 }} />
            <div style={{ width: 1, height: 18, background: 'rgba(201,168,76,0.5)' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 600, color: '#5a6170', letterSpacing: 3 }}>
              CASPER NETWORK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DiamondDivider: React.FC = () => (
  <div className="flex items-center gap-2" style={{ margin: '5px 0 2px' }}>
    <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
    <div style={{ width: 5, height: 5, background: '#c9a84c', transform: 'rotate(45deg)' }} />
    <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
  </div>
);

export default SBTCard;
