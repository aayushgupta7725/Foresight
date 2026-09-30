import React from 'react';

const GeospatialCard = ({ summary }) => {
  const highRisk = summary?.high_risk ?? 0;
  const highCapexPct = summary?.high_risk_capex_pct ?? 0;

  return (
    <div style={{
      background: '#0f172a', borderRadius: 16, padding: '20px',
      width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
      color: '#fff', minHeight: 320,
    }}>
      {/* Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80', lineHeight: 1.3, letterSpacing: '0.02em' }}>
            GEOSPATIAL<br />RISK<br />CORRIDORS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, background: '#1e3a5f', color: '#60a5fa',
            padding: '3px 6px', borderRadius: 6, border: '1px solid #1d4ed8',
          }}>LIVE GIS</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600,
            background: 'rgba(239,68,68,0.15)', color: '#f87171',
            padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            {highRisk} High Risk
          </span>
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>
        National corridor telemetry & risk distribution
      </div>

      {/* Map Visual */}
      <div style={{
        flex: 1, background: 'rgba(30,41,59,0.8)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)', position: 'relative',
        overflow: 'hidden', minHeight: 140,
      }}>
        <svg viewBox="0 0 200 180" style={{ width: '100%', height: '100%', opacity: 0.9 }}>
          {/* Grid */}
          {[20, 40, 60, 80, 100, 120, 140, 160].map(y => (
            <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#1e293b" strokeWidth="0.5" />
          ))}
          {[30, 60, 90, 120, 150, 180].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#1e293b" strokeWidth="0.5" />
          ))}
          {/* Routes */}
          <path d="M 100 30 Q 80 70 70 110 Q 60 130 55 155"
            fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" opacity="0.9" />
          <path d="M 140 35 Q 150 65 155 95 Q 158 120 145 145"
            fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" opacity="0.9" />
          <path d="M 60 40 Q 90 55 110 80 Q 125 100 120 130"
            fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.7" />
          {/* Hotspot circles */}
          <circle cx="100" cy="30" r="6" fill="#ef4444" opacity="0.9" />
          <circle cx="100" cy="30" r="11" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4" />
          <circle cx="140" cy="35" r="5" fill="#f59e0b" opacity="0.9" />
          <circle cx="140" cy="35" r="10" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
          <text x="108" y="28" fontSize="6" fill="#ef4444" fontWeight="700">High Risk Zone</text>
          <text x="148" y="34" fontSize="6" fill="#f59e0b" fontWeight="700">Medium Zone</text>
          <text x="62" y="145" fontSize="6" fill="#22c55e">Low Risk</text>
          {/* Legend */}
          <circle cx="18" cy="165" r="3" fill="#ef4444" />
          <text x="24" y="168" fontSize="5.5" fill="#94a3b8">High Risk</text>
          <circle cx="75" cy="165" r="3" fill="#f59e0b" />
          <text x="81" y="168" fontSize="5.5" fill="#94a3b8">Medium</text>
          <circle cx="125" cy="165" r="3" fill="#22c55e" />
          <text x="131" y="168" fontSize="5.5" fill="#94a3b8">Low Risk</text>
        </svg>
      </div>

      {/* Footer stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: '#64748b' }}>High Risk CAPEX</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{highCapexPct}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>{highRisk}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>High Risk Projects</div>
        </div>
        <button style={{
          background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1d4ed8',
          borderRadius: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}>
          GIS<br />View
        </button>
      </div>
    </div>
  );
};

export default GeospatialCard;
