import React, { useState, useEffect } from 'react';
import { getFilterStates, getFilterSectors } from '../services/api';

const FilterMatrix = ({ summary, onApply }) => {
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [state,        setState]        = useState('');
  const [sector,       setSector]       = useState('');
  const [states,       setStates]       = useState([]);
  const [sectors,      setSectors]      = useState([]);

  useEffect(() => {
    getFilterStates().then(r  => setStates(r.data  || [])).catch(() => {});
    getFilterSectors().then(r => setSectors(r.data || [])).catch(() => {});
  }, []);

  const riskOptions = [
    { label: 'High Risk',   val: 'High Risk',   count: summary?.high_risk   ?? 0, color: '#dc2626', bg: '#fff5f5', border: '#fca5a5' },
    { label: 'Medium Risk', val: 'Medium Risk', count: summary?.medium_risk ?? 0, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Low Risk',    val: 'Low Risk',    count: summary?.low_risk    ?? 0, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  ];

  const handleApply = () => onApply && onApply({ risk: selectedRisk, state, sector });

  const handleReset = () => {
    setSelectedRisk(null);
    setState('');
    setSector('');
    onApply && onApply({ risk: null, state: '', sector: '' });
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>

      {/* Risk level buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Risk Level
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {riskOptions.map(({ label, val, count, color, bg, border }) => {
            const isSel = selectedRisk === val;
            return (
              <div
                key={val}
                onClick={() => setSelectedRisk(isSel ? null : val)}
                style={{
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                  border: `${isSel ? '2px' : '1px'} solid ${isSel ? color : border}`,
                  background: isSel ? bg : '#fff', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: isSel ? color : '#374151' }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: isSel ? color : '#d1d5db',
                  borderRadius: 10, padding: '1px 7px', lineHeight: 1.6,
                }}>
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: 1, height: 40, background: '#f3f4f6', flexShrink: 0 }} />

      {/* State dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 150 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          State / UT
        </div>
        <select
          value={state} onChange={e => setState(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
            fontSize: 12, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
            maxWidth: 220, textOverflow: 'ellipsis',
          }}
        >
          <option value="">All States & UTs</option>
          {states.map(s => (
            <option key={s} value={s} title={s}>
              {s.length > 36 ? s.substring(0, 34) + '...' : s}
            </option>
          ))}
        </select>
      </div>

      {/* Sector dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 150 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Sector
        </div>
        <select
          value={sector} onChange={e => setSector(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
            fontSize: 12, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', fontSize: 12, fontWeight: 600, color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          style={{
            padding: '8px 20px', background: '#16a34a', color: '#fff',
            fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
          onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default FilterMatrix;
