import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import { getAlerts } from '../services/api';

const ALERT_META = {
  schedule_drift:   { icon: '⏱', label: 'Schedule Drift',  color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  cost_escalation:  { icon: '💰', label: 'Cost Escalation', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  stagnation:       { icon: '📉', label: 'Stagnation',      color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  recovery_gap:     { icon: '🏃', label: 'Recovery Gap',    color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  deadline:         { icon: '📅', label: 'Deadline',        color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
};

const SEV_COLORS = {
  high:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  medium: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
  low:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
};

export default function EarlyWarnings() {
  const navigate = useNavigate();
  const [alerts,    setAlerts]    = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [severity,  setSeverity]  = useState('');
  const [alertType, setAlertType] = useState('');
  const [search,    setSearch]    = useState('');
  const [offset,    setOffset]    = useState(0);
  const LIMIT = 50;

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset };
      if (severity)  params.severity = severity;
      const res = await getAlerts(params);
      let data = res.data.alerts || [];
      // Client-side filter by type and search
      if (alertType) data = data.filter(a => a.alert_type === alertType);
      if (search)    data = data.filter(a =>
        a.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.project_id?.toLowerCase().includes(search.toLowerCase())
      );
      setAlerts(data);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [severity, alertType, search, offset]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Count by severity
  const highCount   = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;

  return (
    <PageShell
      title="Early Warnings"
      subtitle="Projects requiring immediate attention based on latest snapshot analysis"
    >
      {/* ── Summary chips ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Alerts',  value: total,       color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
          { label: 'High Severity', value: highCount,   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: 'Medium',        value: mediumCount, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 10,
            padding: '12px 20px', minWidth: 120, textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchAlerts}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Filters row ── */}
      <Card style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Search project name or ID…"
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 13, outline: 'none', width: 240,
            }}
          />
          {/* Severity filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['', 'high', 'medium'].map(s => (
              <button
                key={s}
                onClick={() => { setSeverity(s); setOffset(0); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid',
                  borderColor: severity === s ? (s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#374151') : '#e5e7eb',
                  background: severity === s ? (s === 'high' ? '#fef2f2' : s === 'medium' ? '#fffbeb' : '#1f2937') : '#fff',
                  color: severity === s ? (s === 'high' ? '#dc2626' : s === 'medium' ? '#d97706' : '#fff') : '#6b7280',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s === '' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {/* Alert type filter */}
          <select
            value={alertType}
            onChange={e => { setAlertType(e.target.value); setOffset(0); }}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 13, color: '#374151', background: '#fff', outline: 'none',
            }}
          >
            <option value="">All Alert Types</option>
            {Object.entries(ALERT_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* ── Alert list ── */}
      <Card style={{ padding: 0 }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 1fr 160px 80px 80px',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid #f3f4f6',
          fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <div />
          <div>Project</div>
          <div>Alert Message</div>
          <div>Alert Type</div>
          <div>Severity</div>
          <div>Action</div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            Loading alerts…
          </div>
        )}
        {!loading && alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            No alerts matching current filters. That's good news!
          </div>
        )}

        {alerts.map((alert, i) => {
          const meta = ALERT_META[alert.alert_type] || ALERT_META.schedule_drift;
          const sev  = SEV_COLORS[alert.severity]  || SEV_COLORS.low;
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 1fr 160px 80px 80px',
                gap: 12, padding: '14px 20px',
                borderBottom: '1px solid #f9fafb',
                alignItems: 'center',
                background: i % 2 === 0 ? '#fff' : '#fafafa',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
            >
              {/* Severity dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: sev.dot, flexShrink: 0,
              }} />

              {/* Project info */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>
                  {alert.project_name}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {alert.project_id} • {alert.agency}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {alert.sector} • {alert.state}
                </div>
              </div>

              {/* Message */}
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                <span style={{ marginRight: 6 }}>{meta.icon}</span>
                {alert.message}
              </div>

              {/* Alert type badge */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                  whiteSpace: 'nowrap',
                }}>
                  {meta.label}
                </span>
              </div>

              {/* Severity */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: sev.bg, color: sev.text, whiteSpace: 'nowrap',
                }}>
                  {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                </span>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => navigate(`/projects/${alert.project_id}`)}
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                  }}
                >
                  Inspect
                </button>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: offset === 0 ? '#f9fafb' : '#fff', fontSize: 13, cursor: offset === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
              {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: offset + LIMIT >= total ? '#f9fafb' : '#fff',
                fontSize: 13, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
