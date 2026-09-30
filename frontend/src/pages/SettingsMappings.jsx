import React, { useState } from 'react';
import PageShell from '../components/PageShell';
import Card, { CardHeader } from '../components/Card';

const STANDARD_FIELDS = [
  { field: 'project_id',        label: 'Project ID',        required: true,  example: 'PAIMANA_Project_ID' },
  { field: 'project_name',      label: 'Project Name',      required: true,  example: 'Project_Name' },
  { field: 'agency',            label: 'Agency',            required: true,  example: 'Agency' },
  { field: 'state',             label: 'State',             required: false, example: 'State' },
  { field: 'start_date',        label: 'Start Date',        required: false, example: 'Original_Start_Date' },
  { field: 'original_end_date', label: 'Original End Date', required: false, example: 'Original_End_Date' },
  { field: 'revised_end_date',  label: 'Revised End Date',  required: false, example: 'Revised_End_Date' },
  { field: 'original_cost',     label: 'Original Cost (Cr)',required: false, example: 'Original_Cost_Cr' },
  { field: 'revised_cost',      label: 'Revised Cost (Cr)', required: false, example: 'Revised_Cost_Cr' },
  { field: 'expenditure',       label: 'Expenditure (Cr)',  required: false, example: 'Cumulative_Expenditure_Cr' },
  { field: 'physical_progress', label: 'Physical Progress %',required: true, example: 'Physical_Progress_Pct' },
];

const PAIMANA_DEFAULTS = {
  project_id:        'PAIMANA_Project_ID',
  project_name:      'Project_Name',
  agency:            'Agency',
  state:             'State',
  start_date:        'Original_Start_Date',
  original_end_date: 'Original_End_Date',
  revised_end_date:  'Revised_End_Date',
  original_cost:     'Original_Cost_Cr',
  revised_cost:      'Revised_Cost_Cr',
  expenditure:       'Cumulative_Expenditure_Cr',
  physical_progress: 'Physical_Progress_Pct',
};

export default function SettingsMappings() {
  const [mapping, setMapping] = useState({ ...PAIMANA_DEFAULTS });
  const [saved,   setSaved]   = useState(false);

  const handleChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a full implementation this would POST to /api/mapping
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setMapping({ ...PAIMANA_DEFAULTS });
    setSaved(false);
  };

  return (
    <PageShell
      title="Settings & Mappings"
      subtitle="Configure how uploaded file columns map to standard system fields"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* ── Column mapping table ── */}
        <Card>
          <CardHeader
            title="Column Mapping Configuration"
            subtitle="Map your uploaded file's column names to the system's standard fields"
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#fff', fontSize: 12, color: '#6b7280', cursor: 'pointer',
                  }}
                >
                  Reset to PAIMANA
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {saved ? '✓ Saved' : 'Save Mapping'}
                </button>
              </div>
            }
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Standard Field', 'Required', 'Your Column Name', 'PAIMANA Default'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                      color: '#9ca3af', fontSize: 10, textTransform: 'uppercase',
                      borderBottom: '2px solid #f3f4f6',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STANDARD_FIELDS.map(({ field, label, required, example }) => (
                  <tr key={field} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{field}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {required
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>Required</span>
                        : <span style={{ fontSize: 11, color: '#9ca3af' }}>Optional</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        value={mapping[field] || ''}
                        onChange={e => handleChange(field, e.target.value)}
                        placeholder={`e.g. ${example}`}
                        style={{
                          padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                          fontSize: 12, outline: 'none', width: 220,
                          background: mapping[field] ? '#fff' : '#fafafa',
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{example}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Right panel: instructions + sector map ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="How Column Mapping Works" />
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 12px' }}>
                When you upload a file, the system looks for the column names you specify here.
              </p>
              <p style={{ margin: '0 0 12px' }}>
                <strong>PAIMANA datasets</strong> already use the default column names and require
                no changes.
              </p>
              <p style={{ margin: '0 0 12px' }}>
                <strong>Private datasets</strong> with custom column names (e.g. "Project Code"
                instead of "PAIMANA_Project_ID") should be mapped here before uploading.
              </p>
              <p style={{ margin: 0 }}>
                Example mappings:
              </p>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['Project Code', '→', 'project_id'],
                  ['% Complete',   '→', 'physical_progress'],
                  ['Revised Amt',  '→', 'revised_cost'],
                  ['Amount Spent', '→', 'expenditure'],
                ].map(([from, arrow, to]) => (
                  <div key={from} style={{
                    display: 'flex', gap: 8, padding: '5px 10px',
                    background: '#f9fafb', borderRadius: 6, fontSize: 12,
                    fontFamily: 'monospace',
                  }}>
                    <span style={{ color: '#3b82f6' }}>{from}</span>
                    <span style={{ color: '#9ca3af' }}>{arrow}</span>
                    <span style={{ color: '#15803d' }}>{to}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sector Derivation" />
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 10 }}>
              PAIMANA data does not include a Sector column. The system derives sector
              from the Agency name using a built-in lookup table. You can override the
              inferred sector for any agency below (future feature).
            </div>
            <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              ℹ Sector auto-inference is currently active. Manual agency→sector overrides
              can be configured in a future release.
            </div>
          </Card>

          <Card>
            <CardHeader title="Data Validation Rules" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Project ID must be present and non-empty',
                'Progress values must be 0–100',
                'Costs must be non-negative',
                'Start date must be before end date',
                'Placeholder values ("-") in date fields are treated as missing',
                'Duplicate Project IDs in the same snapshot are deduplicated',
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#374151' }}>
                  <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                  {rule}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
