import React from 'react';
import { useAppData } from '../context/AppDataContext';
import GeospatialCard from '../components/GeospatialCard';
import PortfolioRisk from '../components/PortfolioRisk';
import FilterMatrix from '../components/FilterMatrix';
import Watchlist from '../components/Watchlist/Watchlist';

const Dashboard = () => {
  const { summary, projects, total, loading, applyFilters } = useAppData();

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      background: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Top Row — Geo + Portfolio side by side, full width */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <GeospatialCard summary={summary} />
        <PortfolioRisk  summary={summary} />
      </div>

      {/* Filter Row — full width below */}
      <FilterMatrix summary={summary} onApply={applyFilters} />

      {/* Watchlist */}
      <Watchlist
        projects={projects}
        total={total}
        loading={loading && projects.length === 0}
      />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', padding: '8px 0' }}>
        Foresight • National Infrastructure Risk Monitoring Platform • MoSPI PAIMANA Compliant
      </div>
    </div>
  );
};

export default Dashboard;
