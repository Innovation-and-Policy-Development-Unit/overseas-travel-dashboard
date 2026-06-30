import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppSidebar } from './components/AppSidebar';
import { loadTravelRows, getAvailableYears, filterByYear } from './lib/data';
import type { TravelRow } from './lib/types';
import { useMediaQuery } from './hooks/useMediaQuery';

const ExecutiveOverview = lazy(() => import('./pages/ExecutiveOverview').then(m => ({ default: m.ExecutiveOverview })));
const MinistryBreakdown = lazy(() => import('./pages/MinistryBreakdown').then(m => ({ default: m.MinistryBreakdown })));
const TravelTracker = lazy(() => import('./pages/TravelTracker').then(m => ({ default: m.TravelTracker })));

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center gap-3 text-un-secondary">
      <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span className="text-[13px]">Loading…</span>
    </div>
  );
}

function App() {
  const [rows, setRows] = useState<TravelRow[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const years = useMemo(() => getAvailableYears(rows), [rows]);
  const filteredRows = useMemo(() => filterByYear(rows, selectedYear), [rows, selectedYear]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const location = useLocation();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    loadTravelRows()
      .then(({ rows: data, loadedAt: ts }) => { setRows(data); setLoadedAt(ts); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') { setError(String(err.message)); setLoading(false); } });
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => { if (isDesktop) setSidebarOpen(false); }, [isDesktop]);
  useEffect(() => { setSidebarOpen(false); }, [location]);
  useEffect(() => {
    document.body.style.overflow = sidebarOpen && !isDesktop ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isDesktop]);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="flex min-h-screen bg-un-canvas">
      {sidebarOpen && !isDesktop && (
        <div className="fixed inset-0 z-20 bg-black/40" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${isDesktop ? 'sticky top-0 h-screen flex-shrink-0' : `fixed inset-y-0 left-0 z-30 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}`} aria-label="Sidebar navigation">
        <AppSidebar
          onClose={() => setSidebarOpen(false)}
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!isDesktop && (
          <header className="flex items-center gap-3 border-b border-un-border bg-un-surface px-4 py-3">
            <button onClick={() => setSidebarOpen(o => !o)} aria-label="Open navigation" className="rounded-md p-1.5 text-un-secondary hover:bg-un-wash">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-un-fg">Overseas Travel Dashboard</span>
          </header>
        )}

        <main className="flex-1 overflow-auto p-6" aria-live="polite">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-3 text-un-secondary">
              <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-[13px]">Loading travel data…</span>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-md rounded-md border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 p-6 text-center">
              <p className="text-[13px] font-medium text-red-700 dark:text-red-400">Failed to load data</p>
              <p className="mt-2 text-[12px] text-red-600 dark:text-red-500">{error}</p>
            </div>
          ) : (
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/executive" replace />} />
                <Route path="/executive" element={<ExecutiveOverview rows={filteredRows} loadedAt={loadedAt} />} />
                <Route path="/ministry" element={<MinistryBreakdown rows={filteredRows} />} />
                <Route path="/tracker" element={<TravelTracker rows={filteredRows} loadedAt={loadedAt} />} />
              </Routes>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
