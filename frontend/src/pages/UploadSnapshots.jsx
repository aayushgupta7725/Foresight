import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';
import { uploadFile, getDashboardSummary, getDataSufficiency } from '../services/api';

const MONTHS = [
  'April 2026', 'May 2026', 'June 2026', 'July 2026',
  'August 2026', 'September 2026', 'October 2026',
  'November 2026', 'December 2026', 'January 2027', 'February 2027', 'March 2027'
];

export default function UploadSnapshots() {
  const navigate = useNavigate();
  const [snapshotDate, setSnapshotDate] = useState('August 2026');
  const [customDate,   setCustomDate]   = useState('');
  const [isCustom,     setIsCustom]     = useState(false);
  const [file,         setFile]         = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [summary,      setSummary]      = useState(null);
  const [snapshots,    setSnapshots]    = useState([]);
  const fileRef = useRef();

  const loadData = () => {
    Promise.all([
      getDashboardSummary().catch(() => null),
      getDataSufficiency().catch(() => null),
    ]).then(([s, d]) => {
      setSummary(s?.data ?? null);
      setSnapshots(d?.data?.snapshots ?? []);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      setError('Please select an Excel (.xlsx) or CSV (.csv) file.');
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

  const activeDate = isCustom ? customDate.trim() : snapshotDate;

  const handleUpload = async () => {
    if (!file || !activeDate) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadFile(file, activeDate);
      setResult(res.data);
      setFile(null);
      loadData();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Upload failed. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell
      title="Upload & Snapshots"
      subtitle="Import monthly infrastructure project datasets (PAIMANA Excel or CSV)"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start', maxWidth: 1100 }}>

        {/* ── Left Column: Clean Upload Form ── */}
        <Card style={{ padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Import New Snapshot
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Select the reporting period and drop your PAIMANA export file.
            </div>
          </div>

          {/* 1. Snapshot Month Selection */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Reporting Month
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!isCustom ? (
                <select
                  value={snapshotDate}
                  onChange={(e) => setSnapshotDate(e.target.value)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', cursor: 'pointer',
                  }}
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. October 2026 or Q3 2026"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    fontSize: 13, color: '#1e293b', outline: 'none',
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setIsCustom(v => !v)}
                style={{
                  padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#f8fafc', fontSize: 11, fontWeight: 600, color: '#64748b', cursor: 'pointer',
                }}
              >
                {isCustom ? 'Standard List' : 'Custom Month'}
              </button>
            </div>
          </div>

          {/* 2. File Drag & Drop */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Dataset File (.xlsx or .csv)
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#16a34a' : file ? '#86efac' : '#cbd5e1'}`,
                borderRadius: 12, padding: '36px 20px', textAlign: 'center',
                background: dragOver ? '#f0fdf4' : file ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>📊</div>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8, color: '#94a3b8' }}>📁</div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginBottom: 4 }}>
                    Drop your PAIMANA export here, or <span style={{ color: '#16a34a', textDecoration: 'underline' }}>browse</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    Supports standard Excel (.xlsx) and CSV files
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 12,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success Banner */}
          {result && (
            <div style={{
              marginBottom: 18, background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 10, padding: '16px',
            }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, marginBottom: 8 }}>
                ✓ Successfully Ingested {result.snapshot_date || activeDate}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#fff', borderRadius: 6, padding: '8px 14px', flex: 1, border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d' }}>
                    {(result.total_records || result.new_snapshots || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Records Ingested</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 6, padding: '8px 14px', flex: 1, border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
                    {(result.new_projects || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>New Projects Added</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '8px 16px', borderRadius: 6, background: '#16a34a', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  View Dashboard →
                </button>
                <button
                  onClick={() => setResult(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 6, background: '#fff', color: '#475569',
                    border: '1px solid #cbd5e1', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || !activeDate || uploading}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: (!file || !activeDate) ? '#e2e8f0' : '#16a34a',
                color: (!file || !activeDate) ? '#94a3b8' : '#fff',
                fontWeight: 800, fontSize: 13, cursor: (!file || !activeDate || uploading) ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {uploading ? 'Processing & Ingesting Dataset…' : `Upload ${activeDate} Snapshot`}
            </button>
          )}

          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 14, textAlign: 'center' }}>
            Foresight automatically maps MoSPI column headers and cleans state formatting upon upload.
          </div>
        </Card>

        {/* ── Right Column: Loaded Snapshots & Current Status ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Currently Loaded Snapshots Card */}
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Loaded Monthly Snapshots
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Historical periods currently stored in database
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                background: '#dcfce7', color: '#15803d',
              }}>
                {snapshots.length} MONTHS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {snapshots.map((s, idx) => {
                const isLatest = idx === snapshots.length - 1;
                return (
                  <div
                    key={s.date}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 8,
                      background: isLatest ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isLatest ? '#bbf7d0' : '#f1f5f9'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: isLatest ? '#16a34a' : '#94a3b8',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: isLatest ? 800 : 600, color: '#1e293b' }}>
                        {s.date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {s.count.toLocaleString()} projects
                      </span>
                      {isLatest && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                          background: '#16a34a', color: '#fff',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {snapshots.length === 0 && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  No snapshots loaded yet.
                </div>
              )}
            </div>

            <div style={{
              marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9',
              fontSize: 11, color: '#64748b', lineHeight: 1.4,
            }}>
              💡 <strong>Multi-month velocity:</strong> Each added month enables automatic month-over-month progress tracking and feeds the XGBoost revision forecasting engine.
            </div>
          </Card>

          {/* Quick Portfolio Stats */}
          {summary && (
            <Card style={{ padding: '20px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Portfolio Health Snapshot
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: '#fef2f2', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
                    {summary.high_risk?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', marginTop: 2 }}>High Risk</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#d97706' }}>
                    {summary.medium_risk?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginTop: 2 }}>Medium Risk</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>
                    {summary.low_risk?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginTop: 2 }}>Low Risk</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                Total Active Projects: <strong style={{ color: '#1e293b' }}>{summary.total_projects?.toLocaleString()}</strong>
              </div>
            </Card>
          )}

        </div>
      </div>
    </PageShell>
  );
}
