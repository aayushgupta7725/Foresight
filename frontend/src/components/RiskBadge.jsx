import React from 'react';

const STYLES = {
  'High Risk':   { bg: '#fee2e2', text: '#dc2626' },
  'Medium Risk': { bg: '#fef3c7', text: '#d97706' },
  'Low Risk':    { bg: '#dcfce7', text: '#15803d' },
};

const RiskBadge = ({ label, size = 'md' }) => {
  const s = STYLES[label] || STYLES['Low Risk'];
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 11;
  const padding  = size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';
  return (
    <span style={{
      fontSize, fontWeight: 700, padding, borderRadius: 20,
      background: s.bg, color: s.text, whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {label}
    </span>
  );
};

export default RiskBadge;
