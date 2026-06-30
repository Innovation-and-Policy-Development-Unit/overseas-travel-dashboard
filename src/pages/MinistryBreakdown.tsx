import { useMemo, useState } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import type { TravelRow } from '../lib/types';
import { ministryAggregates } from '../lib/data';
import { Panel } from '../components/Panel';
import { formatInt, formatVuv, pct } from '../lib/format';
import { getChartTheme } from '../lib/chartTheme';

type Props = { rows: TravelRow[] };

type SortCol = 'total' | 'approved' | 'donorFunded' | 'male' | 'female' | 'totalCost';
type SortDir = 'asc' | 'desc';

export function MinistryBreakdown({ rows }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
  const dark = document.documentElement.classList.contains('dark');
  const theme = useMemo(() => getChartTheme(dark), [dark]);

  const aggregates = useMemo(() => ministryAggregates(rows), [rows]);

  const sorted = useMemo(() => {
    return [...aggregates].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return mul * (a[sortCol] - b[sortCol]);
    });
  }, [aggregates, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function sortIcon(col: SortCol) {
    if (sortCol !== col) return <span className="text-un-tertiary">↕</span>;
    return <span className="text-primary">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  const deptRows = useMemo(() => {
    if (!selectedMinistry) return [];
    const m = selectedMinistry;
    const deptMap = new Map<string, { dept: string; total: number; approved: number; male: number; female: number; cost: number }>();
    rows.filter(r => r.ministry === m).forEach(r => {
      const d = r.department || 'Unknown';
      if (!deptMap.has(d)) deptMap.set(d, { dept: d, total: 0, approved: 0, male: 0, female: 0, cost: 0 });
      const agg = deptMap.get(d)!;
      agg.total++;
      if (r.approvalStatus === 'Approved') agg.approved++;
      if (r.gender === 'M') agg.male++;
      if (r.gender === 'F') agg.female++;
      agg.cost += r.estimatedCost ?? 0;
    });
    return Array.from(deptMap.values()).sort((a, b) => b.total - a.total);
  }, [rows, selectedMinistry]);

  const selectedAgg = aggregates.find(a => a.ministry === selectedMinistry);

  const drillChartOpts: Highcharts.Options = useMemo(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 280 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: deptRows.slice(0, 12).map(d => d.dept) },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' } },
    series: [
      { type: 'bar', name: 'Approved', data: deptRows.slice(0, 12).map(d => d.approved), color: '#10B981' },
      { type: 'bar', name: 'Total', data: deptRows.slice(0, 12).map(d => d.total - d.approved), color: '#CBD5E0' },
    ],
    plotOptions: { bar: { stacking: 'normal' } },
    legend: { enabled: true },
  }), [theme, deptRows]);

  return (
    <div className="space-y-6">
      <div className="un-page-header">
        <h1 className="text-xl font-semibold text-un-fg">Ministry Breakdown</h1>
        <p className="mt-1 text-[12px] text-un-secondary">Click a ministry row to drill down by department</p>
      </div>

      <div className="un-table-shell">
        <table className="w-full text-[12px]">
          <thead className="un-thead">
            <tr>
              <th className="px-3 py-2 text-left">Ministry</th>
              {(
                [
                  ['total', 'Total'],
                  ['approved', 'Approved'],
                  ['donorFunded', 'Donor Funded'],
                  ['male', 'Male'],
                  ['female', 'Female'],
                  ['totalCost', 'Est. Cost (VUV)'],
                ] as [SortCol, string][]
              ).map(([col, label]) => (
                <th
                  key={col}
                  className="px-3 py-2 text-right cursor-pointer select-none"
                  onClick={() => toggleSort(col)}
                >
                  {label} {sortIcon(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(agg => {
              const isSelected = selectedMinistry === agg.ministry;
              return (
                <tr
                  key={agg.ministry}
                  className={`un-trow cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    setSelectedMinistry(isSelected ? null : agg.ministry);
                    setExpanded(e => {
                      const next = new Set(e);
                      if (isSelected) next.delete(agg.ministry); else next.add(agg.ministry);
                      return next;
                    });
                  }}
                >
                  <td className="px-3 py-2 font-medium text-un-fg">
                    <span className="mr-1 text-un-tertiary">{expanded.has(agg.ministry) ? '▾' : '▸'}</span>
                    {agg.ministry}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-fg">{formatInt(agg.total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-fg">
                    {formatInt(agg.approved)}
                    <span className="ml-1 text-un-tertiary text-[10px]">({pct(agg.approved, agg.total)})</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-fg">{formatInt(agg.donorFunded)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-fg">{formatInt(agg.male)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-fg">{formatInt(agg.female)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-un-secondary">{agg.totalCost > 0 ? formatVuv(agg.totalCost) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedMinistry && selectedAgg && (
        <Panel title={`${selectedMinistry} — Department Detail`}>
          <div className="mb-4 grid grid-cols-3 gap-3 md:grid-cols-6">
            {[
              ['Total', formatInt(selectedAgg.total)],
              ['Approved', formatInt(selectedAgg.approved)],
              ['Donor Funded', formatInt(selectedAgg.donorFunded)],
              ['Male', formatInt(selectedAgg.male)],
              ['Female', formatInt(selectedAgg.female)],
              ['Est. Cost', selectedAgg.totalCost > 0 ? formatVuv(selectedAgg.totalCost) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-un-canvas p-3 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-un-tertiary">{label}</p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-un-fg">{value}</p>
              </div>
            ))}
          </div>
          <HighchartsReact highcharts={Highcharts} options={drillChartOpts} />
          <div className="mt-4 un-table-shell overflow-auto max-h-64">
            <table className="w-full text-[11px]">
              <thead className="un-thead">
                <tr>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Approved</th>
                  <th className="px-3 py-2 text-right">Male</th>
                  <th className="px-3 py-2 text-right">Female</th>
                  <th className="px-3 py-2 text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map(d => (
                  <tr key={d.dept} className="un-trow">
                    <td className="px-3 py-1.5 text-un-fg">{d.dept}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-un-fg">{formatInt(d.total)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-un-fg">{formatInt(d.approved)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-un-fg">{formatInt(d.male)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-un-fg">{formatInt(d.female)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-un-secondary">{d.cost > 0 ? formatVuv(d.cost) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
