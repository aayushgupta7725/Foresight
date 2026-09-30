import React, { useState, useEffect } from 'react';
import { getFilterStates, getFilterSectors } from '../services/api';

const Toggle = ({ on, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
      background: on ? '#16a34a' : '#d1d5db', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <div style={{
      width: 14, height: 14, background: '#fff', borderRadius: '50%',
      position: 'absolute', top: 3,
      left: on ? 19 : 3, transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </div>
);

const FilterMatrix = ({ summary, onApply }) => {
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [toggles, setToggles] = useState({ schedule: true, cost: true, velocity: true });
  const [state,   setState]   = useState('');
  const [sector,  setSector]  = useState('');
  const [states,  setStates]  = useState([]);
  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    getFilterStates().then(r  => setStates(r.data  || [])).catch(() => {});
    getFilterSectors().then(r => setSectors(r.data || [])).catch(() => {});
  }, []);

  const riskOptions = [
    { label: 'High Risk',   val: 'High Risk',   count: summary?.high_risk   ?? 0, color: '#dc2626', bg: '#fff5f5', border: '#fca5a5' },
    { label: 'Medium Risk', val: 'Medium Risk', count: summary?.medium_risk ?? 0, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Low Risk',    val: 'Low Risk',    count: summary?.low_risk    ?? 0, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  ];

  const driftTriggers = [
    { key: 'schedule', label: 'Schedule Drift  >20pp',  count: summary?.high_schedule_drift  ?? 0 },
    { key: 'cost',     label: 'Cost Escalation  >15%',  count: summary?.high_cost_escalation ?? 0 },
    { key: 'velocity', label: 'Velocity Stagnation',    count: summary?.stagnating           ?? 0 },
  ];

  const toggle = key => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleApply = () => onApply && onApply({ risk: selectedRisk, state, sector });

  const handleReset = () => {
    setSelectedRisk(null);
    setState('');
    setSector('');
    onApply && onApply({ risk: null, state: '', sector: '' });
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '16px 24px',
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    }}>

      {/* Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1f2937', letterSpacing: '0.04em' }}>
          FILTER MATRIX
        </div>
        <button
          onClick={handleReset}
          style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
        >
          Reset all
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 48, background: '#f3f4f6', flexShrink: 0 }} />

      {/* Risk Level buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
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

      {/* Divider */}
      <div style={{ width: 1, height: 48, background: '#f3f4f6', flexShrink: 0 }} />

      {/* Drift triggers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Drift Triggers
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {driftTriggers.map(({ key, label, count }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Toggle on={toggles[key]} onClick={() => toggle(key)} />
              <span style={{ fontSize: 11, color: '#374151' }}>{label}</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>({count.toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 48, background: '#f3f4f6', flexShrink: 0 }} />

      {/* State dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 160 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          State / UT
        </div>
        <select
          value={state} onChange={e => setState(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
            fontSize: 12, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All States & UTs</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Sector dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 160 }}>
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

      {/* Apply button */}
      <button
        onClick={handleApply}
        style={{
          marginLeft: 'auto', padding: '10px 24px', background: '#16a34a', color: '#fff',
          fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 10, cursor: 'pointer',
          letterSpacing: '0.04em', flexShrink: 0, transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
        onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
      >
        APPLY FILTERS
      </button>
    </div>
  );
};

export default FilterMatrix;
