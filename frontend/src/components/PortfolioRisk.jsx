import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  'High Risk':   '#ef4444',
  'Medium Risk': '#f59e0b',
  'Low Risk':    '#22c55e',
};

const TEXT_COLORS = {
  'High Risk':   '#dc2626',
  'Medium Risk': '#d97706',
  'Low Risk':    '#16a34a',
};

const PortfolioRisk = ({ summary }) => {
  if (!summary) return null;

  const pieData = [
    { name: 'High Risk',   value: summary.high_risk   || 0 },
    { name: 'Medium Risk', value: summary.medium_risk || 0 },
    { name: 'Low Risk',    value: summary.low_risk    || 0 },
  ];
  const total = summary.total_projects || 0;

  const sectorRows = (summary.sector_breakdown || []).slice(0, 5);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px',
      flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
            Portfolio Risk Distribution
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {total.toLocaleString()} projects monitored
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Total CAPEX</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2937' }}>
            ₹{summary.total_capex} Lakh Cr
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>

        {/* Donut */}
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={pieData}
                cx={55} cy={55}
                innerRadius={36} outerRadius={56}
                paddingAngle={2} dataKey="value"
                startAngle={90} endAngle={-270}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', marginTop: 2 }}>
              Projects
            </div>
          </div>
        </div>

        {/* Risk breakdown bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pieData.map(({ name, value }) => {
            const pct   = total > 0 ? Math.round(value / total * 100) : 0;
            const color = COLORS[name];
            const tcolor = TEXT_COLORS[name];
            return (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: tcolor }}>{name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tcolor }}>
                    {value.toLocaleString()} <span style={{ fontWeight: 400, color: '#9ca3af' }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: color, borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #f3f4f6' }} />

      {/* High-risk CAPEX callout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>At-Risk CAPEX</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1.2 }}>
            ₹{summary.high_risk_capex} Lakh Cr
            <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', marginLeft: 6 }}>
              ({summary.high_risk_capex_pct}% of total)
            </span>
          </div>
        </div>
      </div>

      {/* Sector breakdown mini-table */}
      {sectorRows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Top Sectors by High Risk
          </div>
          {sectorRows.map(s => {
            const ratio = s.total > 0 ? s.high / s.total : 0;
            return (
              <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, color: '#374151', width: 130,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {s.sector}
                </span>
                <div style={{ flex: 1, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#ef4444', borderRadius: 3,
                    width: `${Math.round(ratio * 100)}%`,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', width: 30, textAlign: 'right', flexShrink: 0 }}>
                  {s.high}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortfolioRisk;
