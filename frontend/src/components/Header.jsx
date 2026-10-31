import React, { useState } from 'react';

const Header = ({ activeSnapshot, onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  return (
    <div style={{
      height: 60, background: '#fff', borderBottom: '1px solid #e8eaf0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0, gap: 16,
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', background: '#f9fafb',
        border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px',
        width: 420, gap: 8,
      }}>
        <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search projects by name, ID, or agency…"
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: '#374151', flex: 1,
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Active Snapshot Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 20, padding: '5px 14px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Snapshot:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
            {activeSnapshot || 'July 2026'}
          </span>
        </div>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          borderLeft: '1px solid #e5e7eb', paddingLeft: 14,
        }}>
          <div style={{
            width: 34, height: 34, background: '#134e4a', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>M</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.2 }}>Admin</div>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.2 }}>MoSPI</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
