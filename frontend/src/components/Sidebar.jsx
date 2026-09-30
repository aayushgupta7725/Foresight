import React from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard',           path: '/',                section: 'main' },
  { label: 'Projects List',       path: '/projects',        section: 'main' },
  { label: 'Early Warnings',      path: '/early-warnings',  section: 'main', badge: '!' },
  { label: 'Risk Predictor & SHAP', path: '/risk-predictor',  section: 'analytics' },
  { label: 'Peer Benchmarking',   path: '/peer-benchmarking', section: 'analytics' },
  { label: 'What-If Simulator',   path: '/what-if',         section: 'analytics' },
  { label: 'Upload & Snapshots',  path: '/upload',          section: 'data' },
  { label: 'Settings & Mappings', path: '/settings',        section: 'data' },
];

const SECTIONS = {
  main:      'Main Navigation',
  analytics: 'Analytics & Tools',
  data:      'Data Engine',
};

const Sidebar = ({ activePage, activeSnapshot, onNavigate }) => {
  const grouped = {};
  NAV_ITEMS.forEach(item => {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  });

  return (
    <div style={{
      width: 224, background: '#fff', borderRight: '1px solid #e8eaf0',
      height: '100vh', display: 'flex', flexDirection: 'column',
      padding: '20px 12px', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/Logo with name.png" alt="Foresight" style={{ height: 28 }} />
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '0 10px', marginBottom: 4,
            }}>
              {SECTIONS[section]}
            </div>
            {items.map(item => {
              const isActive = activePage === item.label;
              return (
                <div
                  key={item.label}
                  onClick={() => onNavigate && onNavigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: 20, cursor: 'pointer', marginBottom: 2,
                    background: isActive ? '#dcfce7' : 'transparent',
                    color: isActive ? '#166534' : '#4b5563',
                    fontWeight: isActive ? 600 : 400, fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isActive && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                    )}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 10,
                    }}>{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Active Snapshot Footer */}
      <div style={{
        border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
              {activeSnapshot || 'July 2026'}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Active Snapshot</div>
          </div>
        </div>
        <span style={{
          background: '#bbf7d0', color: '#166534', fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 6, letterSpacing: '0.05em',
        }}>LIVE</span>
      </div>
    </div>
  );
};

export default Sidebar;
