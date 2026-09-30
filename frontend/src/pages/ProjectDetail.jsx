import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import {
  getProjectDetail, getProjectPrediction, getProjectBenchmark,
} from '../services/api';

const fmt  = (v, d = 1) => (v == null ? 'N/A' : Number(v).toFixed(d));
const fmtC = (v) => (v == null ? 'N/A' : `₹${Number(v).toLocaleString('en-IN')} Cr`);
const sign = (v) => (v >= 0 ? `+${fmt(v)}` : fmt(v));

const StatBox = ({ label, value, sub, color }) => (
  <div style={{
    background: '#f9fafb', borderRadius: 10, padding: '14px 16px',
    borderLeft: `3px solid ${color || '#e5e7eb'}`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: color || '#1f2937' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
  </div>
);

const RISK_COLOR = { 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' };
const SHAP_COLOR = (v) => (v > 0 ? '#ef4444' : '#22c55e');

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail,     setDetail]     = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [benchmark,  setBenchmark]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getProjectDetail(id),
      getProjectPrediction(id).catch(() => null),
      getProjectBenchmark(id).catch(() => null),
    ]).then(([d, p, b]) => {
      setDetail(d.data);
      setPrediction(p?.data ?? null);
      setBenchmark(b?.data ?? null);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <PageShell>
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: 14 }}>
        Loading project…
      </div>
    </PageShell>
  );

  if (!detail) return (
    <PageShell>
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#ef4444', fontSize: 14 }}>
        Project not found.
      </div>
    </PageShell>
  );

  const latest   = detail.latest || {};
  const history  = detail.snapshot_history || [];
  const riskColor = RISK_COLOR[latest.risk_label] || '#6b7280';

  // Chart data
  const chartData = history.map(h => ({
    month:     h.snapshot_date?.replace(' 2026', '') ?? '',
    progress:  h.physical_progress ?? 0,
    time:      h.time_consumed_pct ?? 0,
    drift:     h.schedule_drift ?? 0,
    expenditure: h.expenditure ?? 0,
    revised_cost: h.revised_cost ?? 0,
    velocity:  h.progress_velocity ?? 0,
    risk_score: h.risk_score ?? 0,
  }));

  const TABS = ['overview', 'history', 'prediction', 'benchmark'];

  return (
    <PageShell
      title={detail.project_name}
      subtitle={`${detail.project_id} • ${detail.agency} • ${detail.state}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/what-if/${id}`)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #16a34a',
              background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            What-If Simulator
          </button>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      }
    >
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 13, fontWeight: activeTab === t ? 700 : 400,
              color: activeTab === t ? '#16a34a' : '#6b7280',
              borderBottom: activeTab === t ? '2px solid #16a34a' : '2px solid transparent',
              textTransform: 'capitalize', transition: 'all 0.15s',
            }}
          >
            {t === 'prediction' ? 'Prediction & AI' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ OVERVIEW TAB ══════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Project info strip */}
          <Card>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Sector</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginTop: 2 }}>{detail.sector}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>State</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginTop: 2 }}>{detail.state}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Agency</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginTop: 2 }}>{detail.agency}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Snapshots</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginTop: 2 }}>{detail.total_snapshots}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <RiskBadge label={latest.risk_label} size="lg" />
              </div>
            </div>
          </Card>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatBox label="Physical Progress"  value={`${fmt(latest.physical_progress)}%`}
              sub={`${fmt(latest.time_consumed_pct)}% time consumed`} color="#3b82f6" />
            <StatBox label="Schedule Drift"     value={`${sign(latest.schedule_drift)}pp`}
              sub="Time ahead of progress"
              color={latest.schedule_drift > 15 ? '#ef4444' : latest.schedule_drift > 5 ? '#f59e0b' : '#22c55e'} />
            <StatBox label="Cost Escalation"    value={`${sign(latest.cost_escalation)}%`}
              sub={`Revised: ${fmtC(latest.revised_cost)}`}
              color={latest.cost_escalation > 15 ? '#ef4444' : latest.cost_escalation > 5 ? '#f59e0b' : '#22c55e'} />
            <StatBox label="Spend-Progress Gap" value={`${sign(latest.spend_progress_gap)}pp`}
              sub={`Expenditure: ${fmtC(latest.expenditure)}`}
              color={latest.spend_progress_gap > 15 ? '#ef4444' : latest.spend_progress_gap > 5 ? '#f59e0b' : '#22c55e'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatBox label="Progress Velocity"  value={`${fmt(latest.progress_velocity, 2)}%/mo`}
              sub="Month-over-month change"
              color={latest.progress_velocity <= 0 ? '#ef4444' : latest.progress_velocity < 1 ? '#f59e0b' : '#22c55e'} />
            <StatBox label="Recovery Gap"       value={`${fmt(latest.recovery_gap, 1)}%/mo`}
              sub="Extra pace needed to meet deadline"
              color={latest.recovery_gap > 5 ? '#ef4444' : latest.recovery_gap > 2 ? '#f59e0b' : '#22c55e'} />
            <StatBox label="Original Cost"      value={fmtC(latest.original_cost)}     color="#6b7280" />
            <StatBox label="Revised End Date"   value={latest.revised_end_date || 'N/A'}
              sub={latest.original_end_date ? `Originally: ${latest.original_end_date}` : ''} color="#8b5cf6" />
          </div>

          {/* Risk reasons */}
          {latest.risk_reasons?.length > 0 && (
            <Card>
              <CardHeader title="Risk Factors" badge={latest.risk_label} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {latest.risk_reasons.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', background: '#fef9f0', borderRadius: 8,
                    borderLeft: '3px solid #f59e0b',
                  }}>
                    <span style={{ fontSize: 14, color: '#f59e0b', flexShrink: 0 }}>⚠</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Progress vs time chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader title="Progress vs Time Consumed" subtitle="Monthly trend" />
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 110]} unit="%" />
                  <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]} />
                  <ReferenceLine y={100} stroke="#e5e7eb" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={2.5}
                    dot={{ r: 4 }} name="Physical Progress" />
                  <Line type="monotone" dataKey="time" stroke="#d1d5db" strokeWidth={1.5}
                    strokeDasharray="5 3" dot={false} name="Time Consumed" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════ HISTORY TAB ══════════════════════════ */}
      {activeTab === 'history' && (
        <>
          {/* Timeline cards */}
          <Card>
            <CardHeader title="Snapshot Timeline" badge={`${history.length} months`} />
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
              {history.map((h, i) => {
                const rc = RISK_COLOR[h.risk_label] || '#6b7280';
                const isLast = i === history.length - 1;
                return (
                  <div key={h.snapshot_date} style={{ display: 'flex', alignItems: 'stretch', minWidth: 180 }}>
                    <div style={{
                      flex: 1, border: `1px solid ${rc}33`, borderRadius: 10,
                      padding: '14px 16px', background: isLast ? `${rc}08` : '#fff',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: rc, marginBottom: 8 }}>
                        {h.snapshot_date}
                        {isLast && <span style={{ marginLeft: 6, fontSize: 9, background: rc + '20', padding: '1px 5px', borderRadius: 4 }}>LATEST</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                          ['Progress', `${fmt(h.physical_progress)}%`],
                          ['Expenditure', fmtC(h.expenditure)],
                          ['Revised Cost', fmtC(h.revised_cost)],
                          ['Revised End', h.revised_end_date || 'N/A'],
                          ['Schedule Drift', `${sign(h.schedule_drift)}pp`],
                          ['Velocity', `${fmt(h.progress_velocity, 2)}%/mo`],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{k}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#1f2937' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <RiskBadge label={h.risk_label} size="sm" />
                      </div>
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: '#d1d5db', flexShrink: 0,
                      }}>→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Drift trend */}
          {chartData.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <CardHeader title="Schedule Drift Trend" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}pp`, 'Schedule Drift']} />
                    <Bar dataKey="drift" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index}
                          fill={entry.drift > 20 ? '#ef4444' : entry.drift > 10 ? '#f59e0b' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CardHeader title="Progress Velocity" subtitle="%/month" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%/mo`, 'Velocity']} />
                    <ReferenceLine y={0} stroke="#e5e7eb" />
                    <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.velocity <= 0 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════ PREDICTION TAB ══════════════════════════ */}
      {activeTab === 'prediction' && (
        <>
          {!prediction && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                No prediction data available.
              </div>
            </Card>
          )}
          {prediction && (
            <>
              {/* Disclaimer banner */}
              {prediction.disclaimer && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                  padding: '12px 16px', fontSize: 12, color: '#92400e',
                }}>
                  ℹ {prediction.disclaimer}
                </div>
              )}

              {/* Risk gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  { label: 'Current Risk',            value: prediction.current_risk,    isLabel: true },
                  { label: 'Next-Cycle Revision Risk', value: prediction.next_cycle_revision_risk, isLabel: false },
                  { label: 'Cost Revision Risk',       value: prediction.cost_revision_risk,       isLabel: false },
                ].map(({ label, value, isLabel }) => {
                  const pct  = isLabel ? null : Math.round(value * 100);
                  const col  = isLabel
                    ? RISK_COLOR[value] || '#6b7280'
                    : pct > 65 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e';
                  return (
                    <Card key={label} style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
                        {label}
                      </div>
                      {isLabel ? (
                        <RiskBadge label={value} size="lg" />
                      ) : (
                        <>
                          <div style={{ fontSize: 36, fontWeight: 900, color: col }}>{pct}%</div>
                          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 8, marginTop: 12, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 8, transition: 'width 0.6s' }} />
                          </div>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Rule-based factors */}
              {prediction.factors?.length > 0 && (
                <Card>
                  <CardHeader title="Risk Factors" subtitle="Rule-based analysis" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prediction.factors.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, padding: '10px 14px',
                        background: '#fff5f5', borderRadius: 8, borderLeft: '3px solid #ef4444',
                      }}>
                        <span style={{ color: '#ef4444', fontSize: 14, flexShrink: 0 }}>•</span>
                        <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* SHAP explanations */}
              {prediction.shap_explanations?.length > 0 && (
                <Card>
                  <CardHeader
                    title="SHAP Feature Contributions"
                    subtitle="Positive = increases revision risk"
                    badge={prediction.model_available ? 'ML Model' : 'Rule-based'}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {prediction.shap_explanations.map((ex, i) => {
                      const absMax  = Math.max(...prediction.shap_explanations.map(e => Math.abs(e.shap_value)));
                      const barPct  = absMax > 0 ? Math.abs(ex.shap_value) / absMax * 100 : 0;
                      const barColor = SHAP_COLOR(ex.shap_value);
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px 80px', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{ex.label}</span>
                          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${barPct}%`,
                              background: barColor, borderRadius: 4, transition: 'width 0.4s',
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#6b7280', textAlign: 'right' }}>{ex.value?.toFixed(1)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>
                            {ex.shap_value > 0 ? '+' : ''}{ex.shap_value?.toFixed(4)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
                    Positive SHAP values indicate the feature increased revision risk probability.
                    Negative values indicate it reduced risk.
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════ BENCHMARK TAB ══════════════════════════ */}
      {activeTab === 'benchmark' && (
        <>
          {!benchmark && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                No benchmark data available.
              </div>
            </Card>
          )}
          {benchmark && (
            <>
              <Card>
                <CardHeader
                  title={`Sector Peers: ${benchmark.sector}`}
                  badge={`${benchmark.n_peers} comparable projects`}
                />

                {/* Comparison bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Physical Progress', key: 'physical_progress', unit: '%', higherBetter: true },
                    { label: 'Schedule Drift',    key: 'schedule_drift',    unit: 'pp', higherBetter: false },
                    { label: 'Cost Escalation',   key: 'cost_escalation',   unit: '%',  higherBetter: false },
                    { label: 'Progress Velocity', key: 'progress_velocity', unit: '%/mo', higherBetter: true },
                  ].map(({ label, key, unit, higherBetter }) => {
                    const target = benchmark.target[key] ?? 0;
                    const avg    = benchmark.sector_averages[key] ?? 0;
                    const better = higherBetter ? target >= avg : target <= avg;
                    const maxVal = Math.max(Math.abs(target), Math.abs(avg), 1);
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ fontSize: 12, color: better ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                              This project: {Number(target).toFixed(1)}{unit}
                            </span>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>
                              Sector avg: {Number(avg).toFixed(1)}{unit}
                            </span>
                          </div>
                        </div>
                        <div style={{ position: 'relative', height: 10 }}>
                          {/* Average marker */}
                          <div style={{ height: 10, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 6,
                              width: `${Math.min(Math.abs(avg) / maxVal * 100, 100)}%`,
                              background: '#d1d5db',
                            }} />
                          </div>
                          {/* Target bar overlay */}
                          <div style={{
                            position: 'absolute', top: 0, left: 0,
                            height: 10, borderRadius: 6,
                            width: `${Math.min(Math.abs(target) / maxVal * 100, 100)}%`,
                            background: better ? '#22c55e' : '#ef4444',
                            opacity: 0.85,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Insights */}
                {benchmark.insights?.length > 0 && (
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {benchmark.insights.map((ins, i) => (
                      <div key={i} style={{
                        padding: '10px 14px', background: '#f0fdf4', borderRadius: 8,
                        borderLeft: '3px solid #22c55e', fontSize: 13, color: '#374151',
                      }}>
                        📊 {ins}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Sample peers table */}
              {benchmark.sample_peers?.length > 0 && (
                <Card>
                  <CardHeader title="Similar Projects (Sample)" />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Project', 'Progress', 'Schedule Drift', 'Cost Escalation', 'Risk'].map(h => (
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
                          <tr key={p.project_id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/projects/${p.project_id}`)}
                          >
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb' }}>
                              <div style={{ fontWeight: 600, color: '#1f2937' }}>{p.project_name}</div>
                              <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.project_id}</div>
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb' }}>
                              {Number(p.physical_progress).toFixed(1)}%
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb' }}>
                              {sign(p.schedule_drift)}pp
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb' }}>
                              {sign(p.cost_escalation)}%
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb' }}>
                              <RiskBadge label={p.risk_label} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
