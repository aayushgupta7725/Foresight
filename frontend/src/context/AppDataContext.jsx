/**
 * AppDataContext — fetches summary + projects once, shares across all pages.
 * Pages read from context instead of fetching independently.
 * Re-fetches only when filters change or user triggers a refresh.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getDashboardSummary, getProjects } from '../services/api';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [summary,  setSummary]  = useState(null);
  const [projects, setProjects] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filters,  setFilters]  = useState({});
  const [search,   setSearch]   = useState('');

  // Snapshot label for the header
  const [activeSnapshot, setActiveSnapshot] = useState('Loading…');

  // Prevent re-fetch storms — track the last fetch params
  const lastFetchKey = useRef(null);

  const fetchAll = useCallback(async (opts = {}) => {
    const { risk, state, sector, searchQuery, force } = {
      risk: filters.risk, state: filters.state, sector: filters.sector,
      searchQuery: search, force: false, ...opts,
    };

    // Build a cache key — skip if nothing changed (unless forced)
    const key = JSON.stringify({ risk, state, sector, searchQuery });
    if (!force && key === lastFetchKey.current) return;
    lastFetchKey.current = key;

    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50, sort_by: 'risk_score', sort_dir: 'desc' };
      if (risk        && risk        !== '')                  params.risk_level = risk;
      if (state       && state       !== '' && state !== 'All 28 States & UTs') params.state = state;
      if (sector      && sector      !== '' && sector !== 'All Sectors')        params.sector = sector;
      if (searchQuery && searchQuery.trim())                  params.search = searchQuery.trim();

      const [sumRes, projRes] = await Promise.all([
        getDashboardSummary(),
        getProjects(params),
      ]);

      setSummary(sumRes.data);
      setProjects(projRes.data.projects || []);
      setTotal(projRes.data.total || 0);
      setActiveSnapshot(sumRes.data.active_snapshot || 'July 2026');
    } catch (e) {
      console.error('AppDataContext fetch error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  // Fetch on mount and when filters/search change
  useEffect(() => {
    fetchAll({ risk: filters.risk, state: filters.state, sector: filters.sector, searchQuery: search });
  }, [filters, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = useCallback((f) => {
    setFilters(f);
    lastFetchKey.current = null; // force re-fetch
  }, []);

  const applySearch = useCallback((s) => {
    setSearch(s);
    lastFetchKey.current = null;
  }, []);

  const refresh = useCallback(() => {
    lastFetchKey.current = null;
    fetchAll({ force: true });
  }, [fetchAll]);

  return (
    <AppDataContext.Provider value={{
      summary, projects, total, loading, error,
      filters, search, activeSnapshot,
      applyFilters, applySearch, refresh,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
