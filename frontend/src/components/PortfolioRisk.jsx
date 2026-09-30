import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = { 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' };

const PortfolioRisk = ({ summary }) => {
  if (!summary) return null;

  const pieData = [
    { name: 'High Risk', value: summary.high_risk || 0 },
    { name: 'Medium Risk', value: summary.medium_risk || 0 },
    { name: 'Low Risk', value: summary.low_risk || 0 },
  ];
  const total = summary.total_projects || 0;

  const sectorRows = (summary.sector_breakdown || []).slice(0, 4).map(s => ({
    name: s.sector,
    high: s.high,
    medium: s.medium,
    low: s.low,
    total: s.total,
  }));

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px',
      flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', letterSpacing: '0.02em' }}>
          PORTFOLIO RISK DISTRIBUTION
        </div>
        <span style={{
          background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 600,
          padding: '2px 8px', borderRadius: 8
        }}>{total.toLocaleString()} Monitored</span>
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
        Multi-sector risk exposure & capital allocation
      </div>

      {/* CAPEX Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{
          flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: 10, padding: '12px 16px'
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
            Total Capex
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
            ₹{summary.total_capex} Lakh Cr
          </div>
        </div>
        <div style={{
          flex: 1, background: '#fff5f5', border: '1px solid #fecaca',
          borderRadius: 10, padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
              High Risk Capex
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
            ₹{summary.high_risk_capex} Lakh Cr ({summary.high_risk_capex_pct}%)
          </div>
        </div>
      </div>

      {/* Pie + Legend Row */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Donut Chart */}
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={pieData}
                cx={60} cy={60}
                innerRadius={38} outerRadius={60}
                paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginTop: 2 }}>
              Projects
            </div>
          </div>
        </div>

        {/* Risk Breakdown + Sector Breakdown */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pieData.map(({ name, value }) => {
            const color = COLORS[name];
            const pct = total > 0 ? Math.round(value / total * 100) : 0;
            const bgMap = { 'High Risk': '#fff5f5', 'Medium Risk': '#fffbeb', 'Low Risk': '#f0fdf4' };
            const borderMap = { 'High Risk': '#fecaca', 'Medium Risk': '#fde68a', 'Low Risk': '#bbf7d0' };
            const textMap = { 'High Risk': '#dc2626', 'Medium Risk': '#d97706', 'Low Risk': '#16a34a' };

            // Sector sub-info
            const sectorList = sectorRows.map(s => ({ name: s.name, high: s.high }))
              .filter(s => s.high > 0)
              .slice(0, 2);

            return (
              <div key={name} style={{
                background: bgMap[name], border: `1px solid ${borderMap[name]}`,
                borderRadius: 8, padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: textMap[name], width: 85 }}>{name}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: textMap[name], width: 48 }}>
                  {value.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', width: 42 }}>({pct}%)</div>
                {name === 'High Risk' && sectorList.length > 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 8 }}>
                    {sectorRows.slice(0, 3).map(s => (
                      <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{s.high} High</span>
                        <div style={{ flex: 1, height: 3, background: '#fee2e2', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', background: '#ef4444', borderRadius: 2,
                            width: `${s.total > 0 ? s.high / s.total * 100 : 0}%`
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PortfolioRisk;
