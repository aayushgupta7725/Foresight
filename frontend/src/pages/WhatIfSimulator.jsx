import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import { getProjects, simulateProject, getProjectDetail } from '../services/api';

const fmt  = (v, d = 1) => (v == null ? 'N/A' : Number(v).toFixed(d));
const fmtC = (v) => (v == null ? 'N/A' : `₹${Number(v).toLocaleString('en-IN')} Cr`);
const sign = (v) => (v >= 0 ? `+${fmt(v)}` : fmt(v));
const RISK_COLOR = { 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' };

const SliderRow = ({ label, subLabel, value, onChange, min, max, step = 1, unit = '', color = '#3b82f6' }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
        {subLabel && <div style={{ fontSize: 11, color: '#9ca3af' }}>{subLabel}</div>}
      </div>
      <span style={{
        fontSize: 16, fontWeight: 800, color,
        background: '#f9fafb', padding: '2px 12px', borderRadius: 8, minWidth: 70, textAlign: 'center',
      }}>
        {value >= 0 ? '+' : ''}{value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: color, height: 4 }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
      <span style={{ fontSize: 10, color: '#d1d5db' }}>{min >= 0 ? '+' : ''}{min}{unit}</span>
      <span style={{ fontSize: 10, color: '#d1d5db' }}>{max >= 0 ? '+' : ''}{max}{unit}</span>
    </div>
  </div>
);

const MetricDiff = ({ label, baseline, scenario, unit = '', higherBetter = null }) => {
  const b = Number(baseline ?? 0);
  const s = Number(scenario ?? 0);
  const diff = s - b;
  const better = higherBetter === null ? null : (higherBetter ? diff >= 0 : diff <= 0);
  const color = better === null ? '#6b7280' : better ? '#16a34a' : '#dc2626';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 90px 90px 90px',
      gap: 12, alignItems: 'center', padding: '10px 0',
      borderBottom: '1px solid #f9fafb',
    }}>
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {fmt(b)}{unit}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
        {fmt(s)}{unit}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>
        {diff >= 0 ? '+' : ''}{fmt(diff)}{unit}
      </span>
    </div>
  );
};

// Named scenario presets
const PRESETS = [
  { label: 'Accelerate',         icon: '🚀', desc: 'Progress +15%, pace ×2',  params: { additional_progress_pct: 15, new_pace_per_month: 3.5 } },
  { label: '6-month Delay',      icon: '⏳', desc: 'Push deadline 6 months',  params: { additional_delay_months: 6 } },
  { label: 'Cost Overrun +20%',  icon: '💸', desc: 'Revised cost +20%',       params: { cost_increase_pct: 20 } },
  { label: 'Critical Slip',      icon: '🔴', desc: 'Delay + cost + stagnation', params: { additional_delay_months: 12, cost_increase_pct: 25, new_pace_per_month: 0.5 } },
];

export default function WhatIfSimulator() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  const [projects,  setProjects]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [detail,    setDetail]    = useState(null);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');

  // Slider state
  const [progressAdd,   setProgressAdd]   = useState(0);
  const [pace,          setPace]          = useState(0);
  const [delayMonths,   setDelayMonths]   = useState(0);
  const [costIncrease,  setCostIncrease]  = useState(0);
  const [extraSpend,    setExtraSpend]    = useState(0);

  // Saved scenarios
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');

  useEffect(() => {
    getProjects({ limit: 200, sort_by: 'risk_score', sort_dir: 'desc' })
      .then(res => setProjects(res.data.projects || []));
  }, []);

  // Auto-select if navigated with an ID
  useEffect(() => {
    if (urlId && projects.length > 0) {
      const p = projects.find(x => x.project_id === urlId);
      if (p) handleSelect(p);
    }
  }, [urlId, projects]);

  const handleSelect = async (proj) => {
    setSelected(proj);
    setResult(null);
    resetSliders();
    try {
      const res = await getProjectDetail(proj.project_id);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const resetSliders = () => {
    setProgressAdd(0); setPace(0); setDelayMonths(0);
    setCostIncrease(0); setExtraSpend(0);
  };

  const applyPreset = (params) => {
    setProgressAdd(params.additional_progress_pct ?? 0);
    setPace(params.new_pace_per_month ?? 0);
    setDelayMonths(params.additional_delay_months ?? 0);
    setCostIncrease(params.cost_increase_pct ?? 0);
    setExtraSpend(params.additional_expenditure_pct ?? 0);
  };

  const handleSimulate = async () => {
    if (!selected) return;
    setLoading(true);
    const body = {};
    if (progressAdd  !== 0) body.additional_progress_pct      = progressAdd;
    if (pace         !== 0) body.new_pace_per_month            = pace;
    if (delayMonths  !== 0) body.additional_delay_months       = delayMonths;
    if (costIncrease !== 0) body.cost_increase_pct             = costIncrease;
    if (extraSpend   !== 0) body.additional_expenditure_pct    = extraSpend;
    try {
      const res = await simulateProject(selected.project_id, body);
      setResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = () => {
    if (!result) return;
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    setScenarios(prev => [...prev, { name, result }]);
    setScenarioName('');
  };

  const filtered = projects.filter(p =>
    !search ||
    p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.project_id?.toLowerCase().includes(search.toLowerCase())
  );

  // Comparison chart data
  const compChart = result ? [
    { metric: 'Progress',    baseline: result.baseline.physical_progress, scenario: result.scenario.physical_progress },
    { metric: 'Sched Drift', baseline: result.baseline.schedule_drift,    scenario: result.scenario.schedule_drift    },
    { metric: 'Recovery Gap',baseline: result.baseline.recovery_gap,      scenario: result.scenario.recovery_gap      },
    { metric: 'Cost Esc (%)',baseline: result.baseline.cost_escalation,   scenario: result.scenario.cost_escalation   },
  ] : [];

  return (
    <PageShell
      title="What-If Simulator"
      subtitle="Explore how changes to project conditions affect risk outcomes"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: project list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Select Project</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Card>
          <Card style={{ padding: 0 }}>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filtered.map(p => {
                const isActive = selected?.project_id === p.project_id;
                const dotColor = RISK_COLOR[p.risk_label] || '#6b7280';
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
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>
                        {p.project_name?.slice(0, 28)}{p.project_name?.length > 28 ? '…' : ''}
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

        {/* ── Right: simulator ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selected && (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a project to run intervention scenarios</div>
              </div>
            </Card>
          )}

          {selected && (
            <>
              {/* Project info strip */}
              <Card style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1f2937' }}>{selected.project_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {selected.project_id} • {selected.agency}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <RiskBadge label={selected.risk_label} />
                    <button
                      onClick={() => navigate(`/projects/${selected.project_id}`)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: '#fff', fontSize: 12, color: '#6b7280', cursor: 'pointer',
                      }}
                    >
                      Detail →
                    </button>
                  </div>
                </div>
                {detail?.latest && (
                  <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
                    {[
                      ['Progress',     `${fmt(detail.latest.physical_progress)}%`],
                      ['Sched Drift',  `${sign(detail.latest.schedule_drift)}pp`],
                      ['Cost Esc',     `${sign(detail.latest.cost_escalation)}%`],
                      ['Revised Cost', fmtC(detail.latest.revised_cost)],
                      ['Revised End',  detail.latest.revised_end_date || 'N/A'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* ── Scenario controls ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Presets */}
                  <Card>
                    <CardHeader title="Quick Presets" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => applyPreset(p.params)}
                          style={{
                            padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb',
                            background: '#fafafa', cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
                        >
                          <div style={{ fontSize: 14, marginBottom: 3 }}>{p.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{p.label}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.desc}</div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={resetSliders}
                      style={{
                        marginTop: 10, width: '100%', padding: '7px', borderRadius: 8,
                        border: '1px solid #e5e7eb', background: '#fff', fontSize: 12,
                        color: '#6b7280', cursor: 'pointer',
                      }}
                    >
                      Reset All
                    </button>
                  </Card>

                  {/* Sliders */}
                  <Card>
                    <CardHeader title="Custom Scenario" />
                    <SliderRow
                      label="Additional Progress"
                      subLabel="Immediate progress boost (pp)"
                      value={progressAdd} onChange={setProgressAdd}
                      min={0} max={40} unit="pp" color="#3b82f6"
                    />
                    <SliderRow
                      label="New Pace"
                      subLabel="Override progress velocity (%/month)"
                      value={pace} onChange={setPace}
                      min={0} max={10} step={0.5} unit="%/mo" color="#8b5cf6"
                    />
                    <SliderRow
                      label="Deadline Extension"
                      subLabel="Push revised end date forward"
                      value={delayMonths} onChange={setDelayMonths}
                      min={0} max={24} unit=" mo" color="#f59e0b"
                    />
                    <SliderRow
                      label="Cost Increase"
                      subLabel="Raise revised cost by %"
                      value={costIncrease} onChange={setCostIncrease}
                      min={0} max={50} unit="%" color="#ef4444"
                    />
                    <SliderRow
                      label="Extra Expenditure"
                      subLabel="Additional spend as % of revised cost"
                      value={extraSpend} onChange={setExtraSpend}
                      min={0} max={30} unit="%" color="#f97316"
                    />
                    <button
                      onClick={handleSimulate}
                      disabled={loading}
                      style={{
                        width: '100%', padding: '13px', background: loading ? '#e5e7eb' : '#16a34a',
                        color: loading ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 14,
                        border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                        marginTop: 8,
                      }}
                    >
                      {loading ? 'Simulating…' : '▶  Run Simulation'}
                    </button>
                  </Card>
                </div>

                {/* ── Results panel ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!result && (
                    <Card>
                      <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          Adjust parameters and run the simulation
                        </div>
                      </div>
                    </Card>
                  )}

                  {result && (
                    <>
                      {/* Risk comparison badges */}
                      <Card style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>
                              Current Situation
                            </div>
                            <RiskBadge label={result.baseline.risk_label} size="lg" />
                            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8,
                              color: RISK_COLOR[result.baseline.risk_label] }}>
                              {Math.round(result.baseline.risk_score * 100)}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>Risk Score</div>
                          </div>
                          <div style={{ fontSize: 24, textAlign: 'center', color: '#9ca3af' }}>→</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>
                              After Scenario
                            </div>
                            <RiskBadge label={result.scenario.risk_label} size="lg" />
                            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8,
                              color: RISK_COLOR[result.scenario.risk_label] }}>
                              {Math.round(result.scenario.risk_score * 100)}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>Risk Score</div>
                          </div>
                        </div>
                      </Card>

                      {/* Comparison chart */}
                      <Card>
                        <CardHeader title="Key Metrics Comparison" />
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={compChart} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="baseline" name="Current"  fill="#d1d5db" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="scenario" name="Scenario" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>

                      {/* Metric diff table */}
                      <Card>
                        <CardHeader title="Detailed Changes" />
                        <div style={{
                          display: 'grid', gridTemplateColumns: '120px 90px 90px 90px',
                          gap: 12, padding: '0 0 8px',
                          fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase',
                        }}>
                          <div>Metric</div><div>Current</div><div>Scenario</div><div>Change</div>
                        </div>
                        <MetricDiff label="Progress (%)"  baseline={result.baseline.physical_progress} scenario={result.scenario.physical_progress} unit="%" higherBetter={true} />
                        <MetricDiff label="Sched Drift"   baseline={result.baseline.schedule_drift}    scenario={result.scenario.schedule_drift}    unit="pp" higherBetter={false} />
                        <MetricDiff label="Recovery Gap"  baseline={result.baseline.recovery_gap}      scenario={result.scenario.recovery_gap}      unit="%" higherBetter={false} />
                        <MetricDiff label="Cost Esc (%)"  baseline={result.baseline.cost_escalation}   scenario={result.scenario.cost_escalation}   unit="%" higherBetter={false} />
                        <MetricDiff label="Revised Cost"  baseline={result.baseline.revised_cost}      scenario={result.scenario.revised_cost}      unit=" Cr" />

                        {/* Revised end date change */}
                        {result.baseline.revised_end_date !== result.scenario.revised_end_date && (
                          <div style={{ padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Revised End Date</span>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{result.baseline.revised_end_date || 'N/A'}</span>
                              <span style={{ color: '#9ca3af' }}>→</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{result.scenario.revised_end_date || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Scenario risk reasons */}
                      {result.scenario.risk_reasons?.length > 0 && (
                        <Card>
                          <CardHeader title="Scenario Risk Factors" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {result.scenario.risk_reasons.map((r, i) => (
                              <div key={i} style={{
                                padding: '9px 12px', background: '#f9fafb', borderRadius: 8,
                                borderLeft: '3px solid #9ca3af', fontSize: 12, color: '#374151',
                              }}>
                                {r}
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Save scenario */}
                      <Card style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                          Save Scenario for Comparison
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={scenarioName}
                            onChange={e => setScenarioName(e.target.value)}
                            placeholder="Scenario name…"
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                              fontSize: 12, outline: 'none',
                            }}
                          />
                          <button
                            onClick={saveScenario}
                            style={{
                              padding: '8px 14px', borderRadius: 8, border: 'none',
                              background: '#1f2937', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </Card>
                    </>
                  )}
                </div>
              </div>

              {/* ── Saved scenarios comparison table ── */}
              {scenarios.length > 1 && (
                <Card>
                  <CardHeader title="Scenario Comparison" badge={`${scenarios.length} scenarios`} />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Scenario', 'Progress', 'Sched Drift', 'Cost Esc', 'Risk Score', 'Risk Level'].map(h => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                              color: '#9ca3af', fontSize: 10, textTransform: 'uppercase',
                              borderBottom: '2px solid #f3f4f6',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Baseline row */}
                        <tr style={{ background: '#f9fafb' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#374151' }}>📍 Current</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(scenarios[0].result.baseline.physical_progress)}%</td>
                          <td style={{ padding: '10px 12px' }}>{sign(scenarios[0].result.baseline.schedule_drift)}pp</td>
                          <td style={{ padding: '10px 12px' }}>{sign(scenarios[0].result.baseline.cost_escalation)}%</td>
                          <td style={{ padding: '10px 12px' }}>{Math.round(scenarios[0].result.baseline.risk_score * 100)}</td>
                          <td style={{ padding: '10px 12px' }}><RiskBadge label={scenarios[0].result.baseline.risk_label} size="sm" /></td>
                        </tr>
                        {scenarios.map((sc, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1f2937' }}>{sc.name}</td>
                            <td style={{ padding: '10px 12px' }}>{fmt(sc.result.scenario.physical_progress)}%</td>
                            <td style={{ padding: '10px 12px' }}>{sign(sc.result.scenario.schedule_drift)}pp</td>
                            <td style={{ padding: '10px 12px' }}>{sign(sc.result.scenario.cost_escalation)}%</td>
                            <td style={{ padding: '10px 12px' }}>{Math.round(sc.result.scenario.risk_score * 100)}</td>
                            <td style={{ padding: '10px 12px' }}><RiskBadge label={sc.result.scenario.risk_label} size="sm" /></td>
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
