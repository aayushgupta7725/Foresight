import React from 'react';

const Card = ({ children, style = {}, padding = '20px 24px' }) => (
  <div style={{
    background: '#fff',
    borderRadius: 16,
    padding,
    ...style,
  }}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, badge, right }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #f3f4f6',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', letterSpacing: '0.02em' }}>
        {title}
      </span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#6b7280',
          padding: '2px 8px', borderRadius: 8,
        }}>{badge}</span>
      )}
    </div>
    {subtitle && !right && (
      <span style={{ fontSize: 12, color: '#9ca3af' }}>{subtitle}</span>
    )}
    {right && right}
  </div>
);

export default Card;
