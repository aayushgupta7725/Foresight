import React from 'react';
import { useNavigate } from 'react-router-dom';
import RiskBadge from '../RiskBadge';

const formatDrift = val => {
  if (val == null) return 'N/A';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${Number(val).toFixed(1)}`;
};

const WatchlistRow = ({ project }) => {
  const navigate  = useNavigate();
  const progress  = project.physical_progress || 0;
  const timeConsumed = project.time_consumed_pct || 0;

  const driftColor = project.schedule_drift > 20 ? '#dc2626'
    : project.schedule_drift > 10 ? '#d97706' : '#16a34a';
  const costColor  = project.cost_escalation > 15 ? '#dc2626'
    : project.cost_escalation > 5 ? '#d97706' : '#16a34a';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.3fr 2fr 1fr 1fr 1fr 1.2fr',
        alignItems: 'center', padding: '14px 8px',
        borderBottom: '1px solid #f3f4f6', gap: 8,
        transition: 'background 0.1s', cursor: 'pointer',
      }}
      onClick={() => navigate(`/projects/${project.project_id}`)}
      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Project & ID */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
          {project.project_name}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          {project.project_id} • {project.agency}
        </div>
      </div>

      {/* Sector & State */}
      <div>
        <div style={{ fontSize: 12, color: '#374151' }}>{project.sector}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{project.state}</div>
      </div>

      {/* Physical Progress */}
      <div style={{ paddingRight: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{progress.toFixed(1)}%</span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{timeConsumed.toFixed(1)}% time</span>
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${Math.min(timeConsumed, 100)}%`, background: '#d1d5db', borderRadius: 10,
          }} />
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${Math.min(progress, 100)}%`,
            background: progress < 40 ? '#ef4444' : progress < 65 ? '#f59e0b' : '#22c55e',
            borderRadius: 10,
          }} />
        </div>
      </div>

      {/* Schedule Drift */}
      <div style={{ fontSize: 13, fontWeight: 700, color: driftColor }}>
        {formatDrift(project.schedule_drift)}pp
      </div>

      {/* Cost Overrun */}
      <div style={{ fontSize: 13, fontWeight: 700, color: costColor }}>
        {formatDrift(project.cost_escalation)}%
      </div>

      {/* Risk Badge */}
      <div>
        <RiskBadge label={project.risk_label} size="sm" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => navigate(`/projects/${project.project_id}`)}
          style={{
            fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          Inspect
        </button>
        <button
          onClick={() => navigate(`/what-if/${project.project_id}`)}
          style={{
            fontSize: 11, fontWeight: 700, color: '#6b7280', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          Simulate
        </button>
      </div>
    </div>
  );
};

const Watchlist = ({ projects, total, loading }) => {
  const navigate = useNavigate();
  const COL_HEADERS = [
    'PROJECT & ID', 'SECTOR & STATE', 'PHYSICAL PROGRESS',
    'SCHEDULE DRIFT', 'COST OVERRUN', 'RISK LEVEL', 'ACTION',
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f3f4f6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', letterSpacing: '0.03em' }}>
            PRIORITY ACTION WATCHLIST
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#d97706',
            padding: '2px 8px', borderRadius: 8,
          }}>Top Focus</span>
        </div>
        <button
          onClick={() => navigate('/projects')}
          style={{
            fontSize: 12, fontWeight: 700, color: '#16a34a', background: 'none',
            border: 'none', cursor: 'pointer',
          }}
        >
          View All {total?.toLocaleString() || 0} Projects →
        </button>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.3fr 2fr 1fr 1fr 1fr 1.2fr',
        padding: '0 8px 8px', gap: 8,
      }}>
        {COL_HEADERS.map(h => (
          <div key={h} style={{
            fontSize: 10, fontWeight: 700, color: '#9ca3af',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{h}</div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
          Loading projects…
        </div>
      )}
      {!loading && projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
          No projects found. Upload a PAIMANA snapshot to get started.
        </div>
      )}
      {projects.map(p => <WatchlistRow key={p.project_id} project={p} />)}
    </div>
  );
};

export default Watchlist;
