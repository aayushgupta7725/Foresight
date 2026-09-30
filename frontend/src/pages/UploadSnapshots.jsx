import React, { useState, useRef, useEffect } from 'react';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import { uploadFile, getDashboardSummary, getDataSufficiency, trainModels, getModelStatus } from '../services/api';

const SNAPSHOT_OPTIONS = [
  'April 2026', 'May 2026', 'June 2026', 'July 2026',
  'August 2026', 'September 2026', 'October 2026',
  'November 2026', 'December 2026',
];

const Step = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
      background: done ? '#16a34a' : active ? '#1f2937' : '#e5e7eb',
      color: done || active ? '#fff' : '#9ca3af', flexShrink: 0,
    }}>
      {done ? '✓' : n}
    </div>
    <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#1f2937' : '#9ca3af' }}>
      {label}
    </span>
  </div>
);

export default function UploadSnapshots() {
  const [snapshotDate, setSnapshotDate]   = useState('July 2026');
  const [file,         setFile]           = useState(null);
  const [dragOver,     setDragOver]       = useState(false);
  const [uploading,    setUploading]      = useState(false);
  const [result,       setResult]         = useState(null);
  const [error,        setError]          = useState(null);
  const [summary,      setSummary]        = useState(null);
  const [sufficiency,  setSufficiency]    = useState(null);
  const [modelStatus,  setModelStatus]    = useState(null);
  const [training,     setTraining]       = useState(false);
  const [trainMsg,     setTrainMsg]       = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      getDashboardSummary().catch(() => null),
      getDataSufficiency().catch(() => null),
      getModelStatus().catch(() => null),
    ]).then(([s, d, m]) => {
      setSummary(s?.data ?? null);
      setSufficiency(d?.data ?? null);
      setModelStatus(m?.data ?? null);
    });
  }, [result]);   // re-fetch after each upload

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      setError('Only .xlsx and .csv files are supported.');
      return;
    }
    setError(null);
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !snapshotDate) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadFile(file, snapshotDate);
      setResult(res.data);
      setFile(null);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainMsg(null);
    try {
      const res = await trainModels();
      setTrainMsg({ ok: true, text: res.data?.message || 'Training complete.' });
      const m = await getModelStatus();
      setModelStatus(m.data);
    } catch (e) {
      setTrainMsg({ ok: false, text: e.response?.data?.detail || 'Training failed.' });
    } finally {
      setTraining(false);
    }
  };

  const step = file ? 2 : 1;
  const uploaded = !!result;

  return (
    <PageShell
      title="Upload & Snapshots"
      subtitle="Ingest a new PAIMANA export or private-sector dataset"
    >
      {/* ── Step progress ── */}
      <Card style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <Step n={1} label="Select file"      active={step === 1} done={step > 1 || uploaded} />
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <Step n={2} label="Choose snapshot"  active={step === 2 && !uploaded} done={uploaded} />
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <Step n={3} label="Upload & validate" active={false} done={uploaded} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* ── Left: drop zone + controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Drop zone */}
          <Card>
            <CardHeader title="Upload Data File" subtitle=".xlsx or .csv — PAIMANA or custom format" />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#16a34a' : file ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: 12, padding: '40px 24px', textAlign: 'center',
                background: dragOver ? '#f0fdf4' : file ? '#f0fdf4' : '#fafafa',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{file.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB • Click to replace
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⬆</div>
                  <div style={{ fontWeight: 700, color: '#374151', fontSize: 14, marginBottom: 4 }}>
                    Drop your file here or click to browse
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>
                    Supports PAIMANA Excel exports (.xlsx) and CSV files
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Snapshot date picker */}
          <Card>
            <CardHeader title="Snapshot Period" subtitle="When was this data exported?" />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {SNAPSHOT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSnapshotDate(opt)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid',
                    borderColor: snapshotDate === opt ? '#16a34a' : '#e5e7eb',
                    background: snapshotDate === opt ? '#f0fdf4' : '#fff',
                    color: snapshotDate === opt ? '#166534' : '#374151',
                    fontWeight: snapshotDate === opt ? 700 : 400,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                OR ENTER CUSTOM DATE
              </label>
              <input
                type="text"
                placeholder="e.g. Q1 2027 or March 2027"
                value={SNAPSHOT_OPTIONS.includes(snapshotDate) ? '' : snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                  fontSize: 13, color: '#374151', outline: 'none', width: 220,
                }}
              />
            </div>
          </Card>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '12px 16px', color: '#dc2626', fontSize: 13,
            }}>
              ✗ {error}
            </div>
          )}

          {/* Success result */}
          {result && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '16px 20px',
            }}>
              <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14, marginBottom: 10 }}>
                ✓ Upload successful — {snapshotDate}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['Total Records',   result.total_records],
                  ['New Projects',    result.new_projects],
                  ['New Snapshots',   result.new_snapshots],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{val?.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280' }}>
                Next step: train the ML models to generate predictions for the new snapshot.
              </div>
            </div>
          )}

          {/* Upload button */}
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || !snapshotDate || uploading}
              style={{
                padding: '14px', background: (!file || !snapshotDate) ? '#e5e7eb' : '#16a34a',
                color: (!file || !snapshotDate) ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 10,
                cursor: (!file || !snapshotDate) ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {uploading ? 'Uploading & validating…' : `Upload ${snapshotDate}`}
            </button>
          )}

          {/* Column mapping note */}
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
            padding: '12px 16px', fontSize: 12, color: '#1d4ed8',
          }}>
            <strong>Column Mapping:</strong> The system auto-detects PAIMANA column names
            (PAIMANA_Project_ID, Project_Name, etc.). For custom datasets with different
            column names, go to <strong>Settings & Mappings</strong> to configure your field mapping
            before uploading.
          </div>
        </div>

        {/* ── Right: status panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Current snapshot status */}
          {summary && (
            <Card>
              <CardHeader title="Current Data Status" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Active Snapshot', summary.active_snapshot],
                  ['Total Projects',  summary.total_projects?.toLocaleString()],
                  ['High Risk',       summary.high_risk],
                  ['Medium Risk',     summary.medium_risk],
                  ['Low Risk',        summary.low_risk],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Data sufficiency */}
          {sufficiency && (
            <Card>
              <CardHeader title="Data Sufficiency" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Snapshots loaded</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{sufficiency.n_snapshots}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Near-term prediction</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sufficiency.near_term_prediction_supported ? '#16a34a' : '#ef4444' }}>
                    {sufficiency.near_term_prediction_supported ? '✓ Available' : '✗ Need 2+ snapshots'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Long-horizon prediction</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sufficiency.long_horizon_supported ? '#16a34a' : '#f59e0b' }}>
                    {sufficiency.long_horizon_supported ? '✓ Available' : '⚠ Need 12+ snapshots'}
                  </span>
                </div>
                {sufficiency.issues?.map((iss, i) => (
                  <div key={i} style={{
                    marginTop: 4, padding: '8px 10px', borderRadius: 8,
                    background: iss.severity === 'error' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${iss.severity === 'error' ? '#fecaca' : '#fde68a'}`,
                    fontSize: 11, color: iss.severity === 'error' ? '#dc2626' : '#92400e',
                  }}>
                    {iss.issue}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ML model status + train button */}
          <Card>
            <CardHeader title="ML Models" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {modelStatus && Object.entries(modelStatus.files || {}).map(([fname, exists]) => (
                <div key={fname} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{fname}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: exists ? '#16a34a' : '#9ca3af' }}>
                    {exists ? '✓' : '–'}
                  </span>
                </div>
              ))}
            </div>
            {trainMsg && (
              <div style={{
                marginBottom: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                background: trainMsg.ok ? '#f0fdf4' : '#fef2f2',
                color: trainMsg.ok ? '#15803d' : '#dc2626',
                border: `1px solid ${trainMsg.ok ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {trainMsg.text}
              </div>
            )}
            <button
              onClick={handleTrain}
              disabled={training}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: training ? '#e5e7eb' : '#1f2937',
                color: training ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: training ? 'not-allowed' : 'pointer',
              }}
            >
              {training ? 'Training models…' : 'Train / Retrain Models'}
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              Runs synchronously (~30s). Required after each new snapshot upload.
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
