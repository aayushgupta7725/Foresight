import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import { getProjects, getProjectPrediction, getModelMetrics, getModelStatus, trainModels } from '../services/api';

const fmtPct = (v) => `${Math.round((v ?? 0) * 100)}%`;

export default function RiskPredictor() {
  const navigate = useNavigate();
  const [projects,     setProjects]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [prediction,   setPrediction]   = useState(null);
  const [metrics,      setMetrics]      = useState(null);
  const [modelStatus,  setModelStatus]  = useState(null);
  const [loadingProj,  setLoadingProj]  = useState(true);
  const [loadingPred,  setLoadingPred]  = useState(false);
  const [training,     setTraining]     = useState(false);
  const [trainMsg,     setTrainMsg]     = useState(null);
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    Promise.all([
      getProjects({ limit: 100, sort_by: 'risk_score', sort_dir: 'desc' }),
      getModelMetrics().catch(() => null),
      getModelStatus().catch(() => null),
    ]).then(([p, m, s]) => {
      setProjects(p.data.projects || []);
      setMetrics(m?.data ?? null);
      setModelStatus(s?.data ?? null);
      setLoadingProj(false);
    });
  }, []);

  const handleSelect = async (proj) => {
    setSelected(proj);
    setLoadingPred(true);
    setPrediction(null);
    try {
      const res = await getProjectPrediction(proj.project_id);
      setPrediction(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPred(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainMsg(null);
    try {
      const res = await trainModels();
      setTrainMsg({ ok: true, text: res.data?.message || 'Training complete.' });
      const [m, s] = await Promise.all([getModelMetrics(), getModelStatus()]);
      setMetrics(m.data);
      setModelStatus(s.data);
    } catch (e) {
      setTrainMsg({ ok: false, text: e.response?.data?.detail || 'Training failed.' });
    } finally {
      setTraining(false);
    }
  };

  const filtered = projects.filter(p =>
    !search ||
    p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.project_id?.toLowerCase().includes(search.toLowerCase())
  );

  // Radar chart data from prediction features
  const radarData = prediction ? [
    { feature: 'Sched Drift',  value: Math.min(Math.abs(prediction.features?.schedule_drift ?? 0) / 50 * 100, 100) },
    { feature: 'Cost Esc',     value: Math.min(Math.abs(prediction.features?.cost_escalation ?? 0) / 50 * 100, 100) },
    { feature: 'Spend Gap',    value: Math.min(Math.abs(prediction.factors?.length ?? 0) / 5 * 100, 100) },
    { feature: 'Rev Risk',     value: Math.round((prediction.next_cycle_revision_risk ?? 0) * 100) },
    { feature: 'Cost Risk',    value: Math.round((prediction.cost_revision_risk ?? 0) * 100) },
  ] : [];

  return (
    <PageShell
      title="Risk Predictor & SHAP Explainer"
      subtitle="ML-based near-term revision risk with feature attribution"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: project selector ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Model status */}
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Model Status</span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                background: modelStatus?.models_trained ? '#dcfce7' : '#fee2e2',
                color: modelStatus?.models_trained ? '#15803d' : '#dc2626',
              }}>
                {modelStatus?.models_trained ? 'TRAINED' : 'NOT TRAINED'}
              </span>
            </div>
            {trainMsg && (
              <div style={{
                marginBottom: 8, padding: '6px 10px', borderRadius: 6, fontSize: 11,
                background: trainMsg.ok ? '#f0fdf4' : '#fef2f2',
                color: trainMsg.ok ? '#15803d' : '#dc2626',
              }}>
                {trainMsg.text}
              </div>
            )}
            <button
              onClick={handleTrain}
              disabled={training}
              style={{
                width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                background: training ? '#e5e7eb' : '#1f2937', color: training ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 12, cursor: training ? 'not-allowed' : 'pointer',
              }}
            >
              {training ? 'Training…' : 'Train Models'}
            </button>
          </Card>

          {/* Model metrics */}
          {metrics?.status === 'available' && (
            <Card style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                CV Performance (XGBoost)
              </div>
              {Object.entries(metrics.metrics?.metrics ?? {}).map(([target, models]) => (
                <div key={target} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                    {target.replace('_', ' ')}
                  </div>
                  {models?.xgboost && Object.entries(models.xgboost).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{k.toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>
                        {typeof v === 'number' ? v.toFixed(3) : v}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                {metrics.metrics?.disclaimer}
              </div>
            </Card>
          )}

          {/* Project list */}
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Select Project
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 12, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {loadingProj ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  Loading…
                </div>
              ) : filtered.map(p => {
                const isActive = selected?.project_id === p.project_id;
                const RISK_DOT = { 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' };
                return (
                  <div
                    key={p.project_id}
                    onClick={() => handleSelect(p)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                      background: isActive ? '#f0fdf4' : 'transparent',
                      borderLeft: isActive ? '3px solid #16a34a' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: RISK_DOT[p.risk_label], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
                        {p.project_name?.slice(0, 32)}{p.project_name?.length > 32 ? '…' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, paddingLeft: 13 }}>
                      {p.project_id} • {p.sector}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Right: prediction output ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selected && (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a project to view its risk prediction</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Projects are sorted by risk score (highest first)
                </div>
              </div>
            </Card>
          )}

          {selected && (
            <>
              {/* Project header */}
              <Card style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2937' }}>{selected.project_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {selected.project_id} • {selected.agency} • {selected.state} • {selected.sector}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <RiskBadge label={selected.risk_label} size="lg" />
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

              {loadingPred && (
                <Card>
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
                    Computing prediction…
                  </div>
                </Card>
              )}

              {!loadingPred && prediction && (
                <>
                  {/* Disclaimer */}
                  {prediction.disclaimer && (
                    <div style={{
                      background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                      padding: '10px 16px', fontSize: 12, color: '#92400e',
                    }}>
                      ℹ {prediction.disclaimer}
                    </div>
                  )}

                  {/* Risk gauges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      { label: 'Current Risk',             val: prediction.current_risk,             isLabel: true  },
                      { label: 'Next Cycle Revision Risk', val: prediction.next_cycle_revision_risk, isLabel: false },
                      { label: 'Cost Revision Risk',       val: prediction.cost_revision_risk,       isLabel: false },
                    ].map(({ label, val, isLabel }) => {
                      const pct = isLabel ? null : Math.round((val ?? 0) * 100);
                      const col = isLabel
                        ? ({ 'High Risk': '#ef4444', 'Medium Risk': '#f59e0b', 'Low Risk': '#22c55e' }[val] || '#6b7280')
                        : pct > 65 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e';
                      return (
                        <Card key={label} style={{ textAlign: 'center', padding: '20px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 }}>
                            {label}
                          </div>
                          {isLabel
                            ? <RiskBadge label={val} size="lg" />
                            : (
                              <>
                                <div style={{ fontSize: 34, fontWeight: 900, color: col }}>{pct}%</div>
                                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4 }} />
                                </div>
                              </>
                            )
                          }
                        </Card>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* SHAP bar chart */}
                    {prediction.shap_explanations?.length > 0 && (
                      <Card>
                        <CardHeader
                          title="SHAP Feature Attribution"
                          badge={prediction.model_available ? 'ML' : 'Rule-based'}
                        />
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={prediction.shap_explanations.slice(0, 8).map(e => ({
                              name:  e.label,
                              value: e.shap_value,
                            }))}
                            layout="vertical"
                            margin={{ top: 0, right: 20, bottom: 0, left: 100 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <Tooltip formatter={(v) => [v.toFixed(4), 'SHAP value']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {prediction.shap_explanations.slice(0, 8).map((e, i) => (
                                <Cell key={i} fill={e.shap_value > 0 ? '#ef4444' : '#22c55e'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                          Red = increases revision risk · Green = reduces risk
                        </div>
                      </Card>
                    )}

                    {/* Risk factor list */}
                    <Card>
                      <CardHeader title="Risk Factors" subtitle="Rule-based analysis" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(prediction.factors || []).map((f, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: 8, padding: '9px 12px',
                            background: '#fff5f5', borderRadius: 8, borderLeft: '3px solid #ef4444',
                          }}>
                            <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span>
                            <span style={{ fontSize: 12, color: '#374151' }}>{f}</span>
                          </div>
                        ))}
                        {(!prediction.factors || prediction.factors.length === 0) && (
                          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
                            No major risk factors detected.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
