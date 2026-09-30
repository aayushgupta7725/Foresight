import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, Legend,
} from 'recharts';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import { getProjects, getProjectBenchmark } from '../services/api';

const fmt = (v, d = 1) => (v == null ? 'N/A' : Number(v).toFixed(d));
const sign = (v) => (v >= 0 ? `+${fmt(v)}` : fmt(v));

export default function PeerBenchmarking() {
  const navigate = useNavigate();
  const [projects,   setProjects]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [benchmark,  setBenchmark]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadingB,   setLoadingB]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [sector,     setSector]     = useState('');

  useEffect(() => {
    getProjects({ limit: 200, sort_by: 'risk_score', sort_dir: 'desc' })
      .then(res => { setProjects(res.data.projects || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (proj) => {
    setSelected(proj);
    setLoadingB(true);
    setBenchmark(null);
    try {
      const res = await getProjectBenchmark(proj.project_id);
      setBenchmark(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingB(false);
    }
  };

  const sectors = [...new Set(projects.map(p => p.sector).filter(Boolean))].sort();
  const filtered = projects.filter(p =>
    (!sector || p.sector === sector) &&
    (!search ||
      p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.project_id?.toLowerCase().includes(search.toLowerCase()))
  );

  // Build comparison bar data
  const compData = benchmark ? [
    { name: 'Progress (%)',  project: benchmark.target.physical_progress, avg: benchmark.sector_averages.physical_progress },
    { name: 'Sched Drift',  project: benchmark.target.schedule_drift,    avg: benchmark.sector_averages.schedule_drift },
    { name: 'Cost Esc (%)', project: benchmark.target.cost_escalation,   avg: benchmark.sector_averages.cost_escalation },
    { name: 'Velocity',     project: benchmark.target.progress_velocity, avg: benchmark.sector_averages.progress_velocity },
  ] : [];

  // Radar data (0–100 normalised per metric)
  const radarData = benchmark ? [
    { metric: 'Progress',   self: Math.min(benchmark.target.physical_progress, 100),  peer: Math.min(benchmark.sector_averages.physical_progress, 100) },
    { metric: 'Low Drift',  self: Math.max(100 - benchmark.target.schedule_drift, 0), peer: Math.max(100 - benchmark.sector_averages.schedule_drift, 0) },
    { metric: 'Low Cost',   self: Math.max(100 - benchmark.target.cost_escalation, 0), peer: Math.max(100 - benchmark.sector_averages.cost_escalation, 0) },
    { metric: 'Velocity',   self: Math.min(Math.max(benchmark.target.progress_velocity * 20, 0), 100), peer: Math.min(Math.max(benchmark.sector_averages.progress_velocity * 20, 0), 100) },
    { metric: 'Low Risk',   self: Math.max(100 - benchmark.target.risk_score * 100, 0), peer: Math.max(100 - benchmark.sector_averages.risk_score * 100, 0) },
  ] : [];

  const betterThan = benchmark
    ? Math.round(benchmark.percentile_ranks?.progress_rank ?? 50)
    : 0;

  return (
    <PageShell
      title="Peer Benchmarking"
      subtitle="Compare any project against its sector counterparts"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: selector ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              Filter & Select
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search project…"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 12, outline: 'none', marginBottom: 8, boxSizing: 'border-box',
              }}
            />
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 12, color: '#374151', background: '#fff', outline: 'none',
              }}
            >
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Loading…</div>
              )}
              {filtered.map(p => {
                const isActive = selected?.project_id === p.project_id;
                const dotColor = { 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' };
                return (
                  <div
                    key={p.project_id}
                    onClick={() => handleSelect(p)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                      background: isActive ? '#f0fdf4' : 'transparent',
                      borderLeft: isActive ? '3px solid #16a34a' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor[p.risk_label], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>
                        {p.project_name?.slice(0, 30)}{p.project_name?.length > 30 ? '…' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, paddingLeft: 13 }}>
                      {p.sector} • {p.state}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Right: benchmark results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selected && (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a project to benchmark it against sector peers</div>
              </div>
            </Card>
          )}

          {selected && loadingB && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
                Loading benchmark data…
              </div>
            </Card>
          )}

          {selected && !loadingB && benchmark && (
            <>
              {/* Header */}
              <Card style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2937' }}>{selected.project_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                      {selected.project_id} • {benchmark.sector} • {benchmark.n_peers} peer projects
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Percentile badge */}
                    <div style={{
                      textAlign: 'center', background: betterThan > 50 ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${betterThan > 50 ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 10, padding: '8px 14px',
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: betterThan > 50 ? '#15803d' : '#dc2626' }}>
                        {betterThan}th
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Progress percentile</div>
                    </div>
                    <button
                      onClick={() => navigate(`/projects/${selected.project_id}`)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer',
                      }}
                    >
                      Full Detail →
                    </button>
                  </div>
                </div>
              </Card>

              {/* Insights */}
              {benchmark.insights?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {benchmark.insights.map((ins, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', background: '#f0fdf4', borderRadius: 10,
                      borderLeft: '4px solid #22c55e', fontSize: 13, color: '#374151',
                    }}>
                      📊 {ins}
                    </div>
                  ))}
                </div>
              )}

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Grouped bar chart */}
                <Card>
                  <CardHeader title="vs Sector Average" subtitle="Project vs peers" />
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={compData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="project" name="This Project" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg"     name="Sector Avg"  fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Radar chart */}
                <Card>
                  <CardHeader title="Performance Radar" subtitle="Higher = better" />
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="This Project" dataKey="self" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
                      <Radar name="Sector Avg"  dataKey="peer" stroke="#d1d5db" fill="#d1d5db" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Metric comparison table */}
              <Card>
                <CardHeader title="Detailed Comparison" badge={`${benchmark.n_peers} peer projects`} />
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Metric', 'This Project', 'Sector Average', 'Difference', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                          color: '#9ca3af', fontSize: 10, textTransform: 'uppercase',
                          borderBottom: '2px solid #f3f4f6',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { metric: 'Physical Progress',  key: 'physical_progress', unit: '%',    higherBetter: true  },
                      { metric: 'Schedule Drift',     key: 'schedule_drift',    unit: 'pp',   higherBetter: false },
                      { metric: 'Cost Escalation',    key: 'cost_escalation',   unit: '%',    higherBetter: false },
                      { metric: 'Progress Velocity',  key: 'progress_velocity', unit: '%/mo', higherBetter: true  },
                      { metric: 'Risk Score',         key: 'risk_score',        unit: '',     higherBetter: false },
                    ].map(({ metric, key, unit, higherBetter }) => {
                      const tv = benchmark.target[key] ?? 0;
                      const av = benchmark.sector_averages[key] ?? 0;
                      const diff = tv - av;
                      const better = higherBetter ? diff >= 0 : diff <= 0;
                      return (
                        <tr key={key} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#374151' }}>{metric}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1f2937' }}>
                            {Number(tv).toFixed(1)}{unit}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                            {Number(av).toFixed(1)}{unit}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: better ? '#16a34a' : '#dc2626' }}>
                            {diff >= 0 ? '+' : ''}{Number(diff).toFixed(1)}{unit}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                              background: better ? '#dcfce7' : '#fee2e2',
                              color: better ? '#15803d' : '#dc2626',
                            }}>
                              {better ? 'Better' : 'Worse'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {/* Sample peers */}
              {benchmark.sample_peers?.length > 0 && (
                <Card>
                  <CardHeader title="Sample Peer Projects" />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Project', 'Progress', 'Schedule Drift', 'Cost Esc', 'Risk'].map(h => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                              color: '#9ca3af', fontSize: 10, textTransform: 'uppercase',
                              borderBottom: '1px solid #f3f4f6',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {benchmark.sample_peers.map(p => (
                          <tr
                            key={p.project_id}
                            onClick={() => navigate(`/projects/${p.project_id}`)}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <td style={{ padding: '9px 12px' }}>
                              <div style={{ fontWeight: 600, color: '#1f2937' }}>{p.project_name}</div>
                              <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.project_id}</div>
                            </td>
                            <td style={{ padding: '9px 12px' }}>{Number(p.physical_progress).toFixed(1)}%</td>
                            <td style={{ padding: '9px 12px' }}>{sign(p.schedule_drift)}pp</td>
                            <td style={{ padding: '9px 12px' }}>{sign(p.cost_escalation)}%</td>
                            <td style={{ padding: '9px 12px' }}><RiskBadge label={p.risk_label} size="sm" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
