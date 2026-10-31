import React, { useState, useEffect } from 'react';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';

const DEFAULT_MAPPING = [
  { field: 'project_id',        label: 'Project ID',        column: 'PAIMANA_Project_ID',      required: true,  desc: 'Unique identifier for the project' },
  { field: 'project_name',      label: 'Project Name',      column: 'Project_Name',            required: true,  desc: 'Official sanctioned project title' },
  { field: 'agency',            label: 'Executing Agency',  column: 'Agency',                  required: true,  desc: 'Implementing PSU or department (e.g. NHAI, RVNL)' },
  { field: 'state',             label: 'State / Location',  column: 'State',                   required: false, desc: 'State or UT (auto-sanitized on import)' },
  { field: 'physical_progress', label: 'Physical Progress', column: 'Physical_Progress_Pct',   required: true,  desc: 'Completion percentage (0–100%)' },
  { field: 'original_cost',     label: 'Original Cost',     column: 'Original_Cost_Cr',        required: false, desc: 'Original approved budget in ₹ Crores' },
  { field: 'revised_cost',      label: 'Revised Cost',      column: 'Revised_Cost_Cr',         required: false, desc: 'Current sanctioned cost in ₹ Crores' },
  { field: 'expenditure',       label: 'Expenditure',       column: 'Cumulative_Expenditure_Cr',required: false, desc: 'Actual expenditure to date in ₹ Crores' },
  { field: 'start_date',        label: 'Sanction Date',     column: 'Original_Start_Date',     required: false, desc: 'Project commencement date (MM/YYYY)' },
  { field: 'original_end_date', label: 'Original Deadline', column: 'Original_End_Date',      required: false, desc: 'Sanctioned target completion date' },
  { field: 'revised_end_date',  label: 'Revised Deadline',  column: 'Revised_End_Date',       required: false, desc: 'Extended or anticipated completion date' },
];

export default function SettingsMappings() {
  const [isCustom, setIsCustom] = useState(() => {
    return localStorage.getItem('foresight_custom_mapping_enabled') === 'true';
  });

  const [mapping, setMapping] = useState(() => {
    try {
      const saved = localStorage.getItem('foresight_column_mapping');
      return saved ? JSON.parse(saved) : DEFAULT_MAPPING.reduce((acc, f) => ({ ...acc, [f.field]: f.column }), {});
    } catch {
      return DEFAULT_MAPPING.reduce((acc, f) => ({ ...acc, [f.field]: f.column }), {});
    }
  });

  const [savedMsg, setSavedMsg] = useState(false);

  const handleFieldChange = (field, val) => {
    setMapping(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    localStorage.setItem('foresight_column_mapping', JSON.stringify(mapping));
    localStorage.setItem('foresight_custom_mapping_enabled', isCustom ? 'true' : 'false');
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleReset = () => {
    const defaults = DEFAULT_MAPPING.reduce((acc, f) => ({ ...acc, [f.field]: f.column }), {});
    setMapping(defaults);
    setIsCustom(false);
    localStorage.removeItem('foresight_column_mapping');
    localStorage.setItem('foresight_custom_mapping_enabled', 'false');
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <PageShell
      title="Settings & Column Mappings"
      subtitle="Standard column definitions for Excel/CSV dataset uploads and system preferences"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', maxWidth: 1100 }}>

        {/* ── Left Column: Clean Mapping Table ── */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Excel / CSV Column Mapping
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Columns recognized by the automated ingestion pipeline
              </div>
            </div>

            {/* Mode switch */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setIsCustom(false)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: !isCustom ? '1px solid #16a34a' : '1px solid #e2e8f0',
                  background: !isCustom ? '#f0fdf4' : '#fff',
                  color: !isCustom ? '#15803d' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Standard PAIMANA
              </button>
              <button
                onClick={() => setIsCustom(true)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: isCustom ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: isCustom ? '#0f172a' : '#fff',
                  color: isCustom ? '#fff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Custom Names
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Field</th>
                  <th style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Expected Header</th>
                  <th style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_MAPPING.map(f => (
                  <tr key={f.field} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{f.desc}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {isCustom ? (
                        <input
                          value={mapping[f.field] || ''}
                          onChange={(e) => handleFieldChange(f.field, e.target.value)}
                          placeholder={f.column}
                          style={{
                            padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                            fontSize: 12, outline: 'none', width: '90%', fontFamily: 'monospace',
                            background: '#fff',
                          }}
                        />
                      ) : (
                        <code style={{
                          background: '#f1f5f9', padding: '3px 8px', borderRadius: 4,
                          fontSize: 12, color: '#0f172a', fontWeight: 600,
                        }}>
                          {f.column}
                        </code>
                      )}
                    </td>
                    <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: f.required ? '#fee2e2' : '#f1f5f9',
                        color: f.required ? '#dc2626' : '#64748b',
                      }}>
                        {f.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Row */}
          {isCustom && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1',
                  background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer',
                }}
              >
                Reset to Standard Defaults
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {savedMsg && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                    ✓ Settings saved!
                  </span>
                )}
                <button
                  onClick={handleSave}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: 'none',
                    background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  Save Mapping
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Right Column: Essential System Defaults ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Card style={{ padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              System Preferences
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
              Standard operational defaults active across Foresight
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Currency Unit</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>All cost values</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', background: '#f8fafc', padding: '3px 8px', borderRadius: 6 }}>
                  ₹ Crores (INR)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Risk Framework</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Evaluation methodology</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 6 }}>
                  MoSPI PAIMANA
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>State Sanitizer</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Automatic OCR / wrapping fix</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                  ✓ Enabled
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Machine Learning</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Predictive revision engine</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                  XGBoost (83.8%)
                </span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '18px 20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              💡 Ingestion Tip
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              Standard MoSPI exports from the PAIMANA portal match the default column names automatically. You do not need to customize any names unless uploading private or external contractor sheets.
            </div>
          </Card>

        </div>
      </div>
    </PageShell>
  );
}
