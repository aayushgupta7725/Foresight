import React, { useState } from 'react';

const Header = ({ activeSnapshot, onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  return (
    <div style={{
      height: 64, background: '#fff', borderBottom: '1px solid #e8eaf0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', flexShrink: 0
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', background: '#f9fafb',
        border: '1px solid #e5e7eb', borderRadius: 24, padding: '8px 16px',
        width: 460, gap: 8
      }}>
        <svg width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search projects by name, ID, or corridor (e.g., NH-48, East Coas..."
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: '#374151', flex: 1
          }}
        />
        <kbd style={{
          background: '#e5e7eb', color: '#9ca3af', fontSize: 10, fontWeight: 600,
          padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit'
        }}>⌘K</kbd>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Active Snapshot Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 24, padding: '6px 16px'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Active Snapshot:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
            {activeSnapshot || 'July 2026 (Live PAIMANA)'}
          </span>
          <svg width="12" height="12" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        {/* Notification Bell */}
        <div style={{
          width: 36, height: 36, background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative'
        }}>
          <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div style={{
            position: 'absolute', top: 6, right: 6, width: 8, height: 8,
            background: '#ef4444', borderRadius: '50%', border: '2px solid #fff'
          }} />
        </div>

        {/* User Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          borderLeft: '1px solid #e5e7eb', paddingLeft: 16
        }}>
          <div style={{
            width: 36, height: 36, background: '#134e4a', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14
          }}>M</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Admin (MoSPI)</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Monitoring Team</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
