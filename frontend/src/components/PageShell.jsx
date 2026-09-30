/**
 * PageShell — consistent inner-page wrapper with optional header/breadcrumb.
 */
import React from 'react';

const PageShell = ({ title, subtitle, actions, children }) => (
  <div style={{
    flex: 1, overflowY: 'auto', padding: '24px 28px',
    background: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: 20,
  }}>
    {(title || actions) && (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          {title && (
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2937' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

export default PageShell;
