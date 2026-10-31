import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const TOPO_URL = '/india-states.topo.json';

// Map backend state names → TopoJSON NAME_1 values where they differ
const STATE_ALIASES = {
  'Odisha':                              'Orissa',
  'Uttarakhand':                         'Uttaranchal',
  'Jammu & Kashmir':                     'Jammu and Kashmir',
  'Andaman & Nicobar Islands':           'Andaman and Nicobar',
  'Andaman & Nicobar':                   'Andaman and Nicobar',
  'Dadra & Nagar Haveli':                'Dadra and Nagar Haveli',
  'Daman & Diu':                         'Daman and Diu',
  'Dadra & Nagar Haveli and Daman & Diu':'Dadra and Nagar Haveli',
  'Telangana':                           'Andhra Pradesh',
  'Ladakh':                              'Jammu and Kashmir',
};

// Tooltip display names for legacy TopoJSON NAME_1 values
const DISPLAY_NAMES = {
  'Orissa':                 'Odisha',
  'Uttaranchal':            'Uttarakhand',
  'Andhra Pradesh':         'Andhra Pradesh (incl. Telangana)',
  'Jammu and Kashmir':      'Jammu & Kashmir (incl. Ladakh)',
  'Dadra and Nagar Haveli': 'Dadra & Nagar Haveli and Daman & Diu',
};

const normalise = (name) => {
  if (!name) return '';
  const trimmed = name.trim();
  return STATE_ALIASES[trimmed] || trimmed;
};

const displayName = (name) => DISPLAY_NAMES[name] || name;

// Linear RGB lerp across 4 colour stops (green → yellow → orange → red)
const riskColour = (t) => {
  const stops = [
    [34,  197, 94 ],  // green  t=0
    [234, 179, 8  ],  // yellow t=0.33
    [249, 115, 22 ],  // orange t=0.66
    [239, 68,  68 ],  // red    t=1
  ];
  const clamped = Math.max(0, Math.min(1, t));
  const seg     = 1 / (stops.length - 1);
  const idx     = Math.min(Math.floor(clamped / seg), stops.length - 2);
  const local   = (clamped - idx * seg) / seg;
  const [r1, g1, b1] = stops[idx];
  const [r2, g2, b2] = stops[idx + 1];
  const r = Math.round(r1 + (r2 - r1) * local);
  const g = Math.round(g1 + (g2 - g1) * local);
  const b = Math.round(b1 + (b2 - b1) * local);
  return `rgb(${r},${g},${b})`;
};

const GeospatialCard = ({ summary }) => {
  const [tooltip, setTooltip] = useState(null);

  const stateBreakdown = summary?.state_breakdown || [];
  const highRisk       = summary?.high_risk       ?? 0;
  const highCapexPct   = summary?.high_risk_capex_pct ?? 0;
  const totalProjects  = summary?.total_projects  ?? 0;

  // Build lookup: normalised NAME_1 → row (accumulating merged regions like Telangana into AP)
  const stateMap = useMemo(() => {
    const m = {};
    stateBreakdown.forEach(s => {
      const norm = normalise(s.state);
      if (!norm) return;
      if (m[norm]) {
        m[norm] = {
          ...m[norm],
          high:   m[norm].high + (s.high ?? 0),
          medium: m[norm].medium + (s.medium ?? 0),
          low:    m[norm].low + (s.low ?? 0),
          total:  m[norm].total + (s.total ?? 0),
        };
      } else {
        m[norm] = { ...s, state: norm };
      }
    });
    return m;
  }, [stateBreakdown]);

  // Use sqrt scale so mid-range states get visible colour spread
  const sqrtMax = useMemo(() => {
    const max = Math.max(1, ...stateBreakdown.map(s => s.high));
    return Math.sqrt(max);
  }, [stateBreakdown]);

  const getFill = (geoName) => {
    const data = stateMap[geoName];
    if (!data || data.total === 0) return '#1e3a5f'; // no data — dark slate
    if (data.high === 0)           return '#166534'; // zero high-risk — dark green
    const t = Math.sqrt(data.high) / sqrtMax;
    return riskColour(t);
  };

  const top3 = stateBreakdown.slice(0, 3);

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 16,
      padding: '16px 18px',
      width: 300,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Geospatial Risk Map
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
            High-risk projects by state
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: 'rgba(239,68,68,0.15)', color: '#f87171',
          padding: '3px 10px', borderRadius: 20,
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
          {highRisk} High
        </span>
      </div>

      {/* Choropleth map */}
      <div style={{ borderRadius: 8, overflow: 'hidden', background: '#0c1628' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [82.81, 21.18], scale: 477 }}
          width={264}
          height={300}
          style={{ width: '100%', height: 'auto', display: 'block', background: '#0c1628' }}
        >
          {/* Background fill for ocean */}
          <rect width={264} height={300} fill="#0c1628" />
          <Geographies geography={TOPO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const name = geo.properties.NAME_1;
                const data = stateMap[name];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(name)}
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', opacity: 0.8, cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={evt => setTooltip({
                      name: displayName(name),
                      high:   data?.high   ?? 0,
                      medium: data?.medium ?? 0,
                      low:    data?.low    ?? 0,
                      total:  data?.total  ?? 0,
                      x: evt.clientX,
                      y: evt.clientY,
                    })}
                    onMouseMove={evt => setTooltip(t => t ? { ...t, x: evt.clientX, y: evt.clientY } : t)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Hover tooltip — fixed to cursor */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top:  tooltip.y - 10,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
          color: '#e2e8f0',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, color: '#fff' }}>{tooltip.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: '#f87171' }}>⬤ High Risk: <b>{tooltip.high}</b></span>
            <span style={{ color: '#fbbf24' }}>⬤ Medium: {tooltip.medium}</span>
            <span style={{ color: '#4ade80' }}>⬤ Low: {tooltip.low}</span>
            <span style={{ color: '#94a3b8', marginTop: 3, paddingTop: 3, borderTop: '1px solid #334155' }}>
              Total: {tooltip.total}
            </span>
          </div>
        </div>
      )}

      {/* Colour scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, color: '#64748b', flexShrink: 0 }}>Low</span>
        <div style={{
          flex: 1, height: 5, borderRadius: 3,
          background: 'linear-gradient(to right, #166534, #22c55e, #eab308, #f97316, #ef4444)',
        }} />
        <span style={{ fontSize: 9, color: '#64748b', flexShrink: 0 }}>High</span>
      </div>

      {/* Top 3 hotspot states */}
      {top3.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Top Hotspots
          </div>
          {top3.map((s, i) => (
            <div key={s.state} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: '#0f172a',
                background: ['#ef4444', '#f97316', '#f59e0b'][i],
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{
                fontSize: 11, color: '#cbd5e1', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{s.state}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 50, height: 4, borderRadius: 2,
                  background: '#1e3a5f', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: '#ef4444',
                    width: `${Math.round(Math.sqrt(s.high) / sqrtMax * 100)}%`,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>
                  {s.high}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10,
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#475569' }}>High-Risk CAPEX</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{highCapexPct}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#475569' }}>Total Monitored</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{totalProjects.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export default GeospatialCard;
