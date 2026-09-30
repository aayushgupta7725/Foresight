import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Card from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import { getProjects, getFilterStates, getFilterSectors } from '../services/api';
import { useAppData } from '../context/AppDataContext';

const fmt  = (v, d = 1) => (v == null ? 'N/A' : Number(v).toFixed(d));
const sign = (v) => (v == null ? 'N/A' : (v >= 0 ? `+${fmt(v)}` : fmt(v)));

const SORT_COLS = [
  { key: 'project_name',    label: 'Project' },
  { key: 'risk_score',      label: 'Risk Score' },
  { key: 'progress',        label: 'Progress' },
  { key: 'schedule_drift',  label: 'Sched Drift' },
  { key: 'cost_escalation', label: 'Cost Esc' },
];

export default function ProjectsList() {
  const navigate = useNavigate();
  // Use context data as initial state — avoids blank flash on first load
  const { projects: ctxProjects, total: ctxTotal, loading: ctxLoading } = useAppData();

  const [projects,  setProjects]  = useState(ctxProjects);
  const [total,     setTotal]     = useState(ctxTotal);
  const [loading,   setLoading]   = useState(ctxLoading && ctxProjects.length === 0);
  const [states,    setStates]    = useState([]);
  const [sectors,   setSectors]   = useState([]);

  // Filters
  const [search,      setSearch]      = useState('');
  const [riskFilter,  setRiskFilter]  = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sectorFilter,setSectorFilter]= useState('');
  const [sortBy,      setSortBy]      = useState('risk_score');
  const [sortDir,     setSortDir]     = useState('desc');
  const [offset,      setOffset]      = useState(0);
  const LIMIT = 50;

  // Fetch filters lists once
  useEffect(() => {
    Promise.all([getFilterStates(), getFilterSectors()])
      .then(([s, sec]) => { setStates(s.data || []); setSectors(sec.data || []); });
  }, []);

  const fetchProjects = useCallback(async () => {
    // If no filters at all, just show context data (already loaded, instant)
    const hasFilter = search || riskFilter || stateFilter || sectorFilter;
    if (!hasFilter && offset === 0 && sortBy === 'risk_score' && sortDir === 'desc' && ctxProjects.length > 0) {
      setProjects(ctxProjects);
      setTotal(ctxTotal);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset, sort_by: sortBy, sort_dir: sortDir };
      if (search)       params.search      = search;
      if (riskFilter)   params.risk_level  = riskFilter;
      if (stateFilter)  params.state       = stateFilter;
      if (sectorFilter) params.sector      = sectorFilter;
      const res = await getProjects(params);
      setProjects(res.data.projects || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter, stateFilter, sectorFilter, sortBy, sortDir, offset, ctxProjects, ctxTotal]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
    setOffset(0);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ color: '#d1d5db', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: '#16a34a', marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <PageShell
      title="Projects List"
      subtitle={`${total.toLocaleString()} projects in latest snapshot`}
    >
      {/* ── Filter bar ── */}
      <Card style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '7px 12px', flex: '0 0 260px',
          }}>
            <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setOffset(0); }}
              placeholder="Search name, ID, or agency…"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', flex: 1 }}
            />
          </div>

          {/* Risk filter */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { val: '', label: 'All' },
              { val: 'High Risk',   label: 'High',   color: '#dc2626', bg: '#fef2f2' },
              { val: 'Medium Risk', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
              { val: 'Low Risk',    label: 'Low',    color: '#15803d', bg: '#f0fdf4' },
            ].map(({ val, label, color, bg }) => (
              <button
                key={val}
                onClick={() => { setRiskFilter(val); setOffset(0); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: '1px solid',
                  borderColor: riskFilter === val ? (color || '#374151') : '#e5e7eb',
                  background: riskFilter === val ? (bg || '#f9fafb') : '#fff',
                  color: riskFilter === val ? (color || '#374151') : '#6b7280',
                  cursor: 'pointer',
                }}
              >{label}</button>
            ))}
          </div>

          {/* State */}
          <select
            value={stateFilter}
            onChange={e => { setStateFilter(e.target.value); setOffset(0); }}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 12, color: '#374151', background: '#fff', outline: 'none',
            }}
          >
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Sector */}
          <select
            value={sectorFilter}
            onChange={e => { setSectorFilter(e.target.value); setOffset(0); }}
            style={{
              padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 12, color: '#374151', background: '#fff', outline: 'none',
            }}
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
            {total.toLocaleString()} results
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card style={{ padding: 0 }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 90px',
          gap: 8, padding: '12px 20px',
          borderBottom: '2px solid #f3f4f6',
          fontSize: 10, fontWeight: 700, color: '#9ca3af',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {[
            ['project_name',    'Project'],
            ['',                'Sector / State'],
            ['progress',        'Progress'],
            ['schedule_drift',  'Sched Drift'],
            ['cost_escalation', 'Cost Esc'],
            ['',                'Velocity'],
            ['',                'Recov Gap'],
            ['risk_score',      'Risk'],
            ['',                'Actions'],
          ].map(([col, label]) => (
            <div
              key={label}
              onClick={() => col && toggleSort(col)}
              style={{ cursor: col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
            >
              {label}{col && <SortIcon col={col} />}
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            Loading projects…
          </div>
        )}

        {/* Empty */}
        {!loading && projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            No projects match the current filters.
          </div>
        )}

        {/* Rows */}
        {projects.map((p, i) => {
          const driftColor = p.schedule_drift > 20 ? '#dc2626' : p.schedule_drift > 10 ? '#d97706' : '#16a34a';
          const costColor  = p.cost_escalation > 15 ? '#dc2626' : p.cost_escalation > 5 ? '#d97706' : '#16a34a';
          const velColor   = p.progress_velocity <= 0 ? '#dc2626' : p.progress_velocity < 1 ? '#d97706' : '#16a34a';
          const rgColor    = p.recovery_gap > 5 ? '#dc2626' : p.recovery_gap > 2 ? '#d97706' : '#16a34a';
          return (
            <div
              key={p.project_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 90px',
                gap: 8, padding: '13px 20px',
                borderBottom: '1px solid #f9fafb',
                alignItems: 'center',
                background: i % 2 === 0 ? '#fff' : '#fafafa',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onClick={() => navigate(`/projects/${p.project_id}`)}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
            >
              {/* Project */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
                  {p.project_name}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  {p.project_id} • {p.agency}
                </div>
              </div>

              {/* Sector / State */}
              <div>
                <div style={{ fontSize: 12, color: '#374151' }}>{p.sector}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.state}</div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(p.physical_progress)}%</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{fmt(p.time_consumed_pct)}% t</span>
                </div>
                <div style={{ height: 5, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', height: '100%',
                    width: `${Math.min(p.time_consumed_pct || 0, 100)}%`,
                    background: '#e5e7eb',
                  }} />
                  <div style={{
                    position: 'absolute', height: '100%',
                    width: `${Math.min(p.physical_progress || 0, 100)}%`,
                    background: p.physical_progress < 40 ? '#ef4444' : p.physical_progress < 65 ? '#f59e0b' : '#22c55e',
                    borderRadius: 4,
                  }} />
                </div>
              </div>

              {/* Schedule Drift */}
              <div style={{ fontSize: 13, fontWeight: 700, color: driftColor }}>
                {sign(p.schedule_drift)}pp
              </div>

              {/* Cost Escalation */}
              <div style={{ fontSize: 13, fontWeight: 700, color: costColor }}>
                {sign(p.cost_escalation)}%
              </div>

              {/* Velocity */}
              <div style={{ fontSize: 12, fontWeight: 700, color: velColor }}>
                {p.progress_velocity != null ? `${sign(p.progress_velocity)}%/mo` : 'N/A'}
              </div>

              {/* Recovery Gap */}
              <div style={{ fontSize: 12, fontWeight: 700, color: rgColor }}>
                {p.recovery_gap != null ? `${fmt(p.recovery_gap)}%/mo` : 'N/A'}
              </div>

              {/* Risk badge */}
              <div>
                <RiskBadge label={p.risk_label} size="sm" />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/projects/${p.project_id}`)}
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 5,
                  }}
                  title="Inspect"
                >
                  Inspect
                </button>
                <button
                  onClick={() => navigate(`/what-if/${p.project_id}`)}
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#6b7280', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 5,
                  }}
                  title="Simulate"
                >
                  Sim
                </button>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Showing {Math.min(offset + 1, total)}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()} projects
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: offset === 0 ? '#f9fafb' : '#fff', fontSize: 12,
                cursor: offset === 0 ? 'not-allowed' : 'pointer', color: '#374151',
              }}
            >
              ← Previous
            </button>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: offset + LIMIT >= total ? '#f9fafb' : '#fff', fontSize: 12,
                cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', color: '#374151',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
