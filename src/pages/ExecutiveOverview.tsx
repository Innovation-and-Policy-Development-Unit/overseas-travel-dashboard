import { useMemo, useState } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import type { TravelRow } from '../lib/types';
import {
  ministryAggregates, fundingBreakdown, approvalBreakdown, travelModeBreakdown,
  topDestinations, travelsByMonth, fundingTrend, topDonors, dataQuality, averageMetrics,
} from '../lib/data';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { formatInt, formatVuvMillions, formatVuv, pct, formatDate } from '../lib/format';
import { getChartTheme } from '../lib/chartTheme';

type Props = { rows: TravelRow[]; loadedAt: Date };

export function ExecutiveOverview({ rows, loadedAt }: Props) {
  const [miniTab, setMiniTab] = useState<'total' | 'cost'>('total');
  const dark = document.documentElement.classList.contains('dark');
  const theme = useMemo(() => getChartTheme(dark), [dark]);

  const total = rows.length;
  const intl = rows.filter(r => r.sheet === 'International').length;
  const approved = rows.filter(r => r.approvalStatus === 'Approved').length;
  const female = rows.filter(r => r.gender === 'F').length;
  const male = rows.filter(r => r.gender === 'M').length;
  const donorFunded = rows.filter(r => r.fundingSource === 'Donor Funded').length;
  const totalCost = rows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);

  const ministries = useMemo(() => ministryAggregates(rows).slice(0, 15), [rows]);
  const funding = useMemo(() => fundingBreakdown(rows), [rows]);
  const approval = useMemo(() => approvalBreakdown(rows), [rows]);
  const modes = useMemo(() => travelModeBreakdown(rows), [rows]);
  const destinations = useMemo(() => topDestinations(rows, 10), [rows]);
  const byMonth = useMemo(() => travelsByMonth(rows), [rows]);
  const trend = useMemo(() => fundingTrend(rows), [rows]);
  const donors = useMemo(() => topDonors(rows, 10), [rows]);
  const quality = useMemo(() => dataQuality(rows), [rows]);
  const metrics = useMemo(() => averageMetrics(rows), [rows]);

  const labelStyle = { color: dark ? '#a0aec0' : '#4a5568', fontSize: '10px' };

  const ministryChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 400 },
    title: { text: undefined },
    xAxis: {
      ...theme.xAxis,
      categories: miniTab === 'total'
        ? ministries.map(m => m.ministry)
        : [...ministries].sort((a, b) => b.totalCost - a.totalCost).map(m => m.ministry),
      labels: { style: labelStyle },
    },
    yAxis: { ...theme.yAxis, title: { text: miniTab === 'total' ? 'Requests' : 'VUV' } },
    series: miniTab === 'total'
      ? [{ type: 'bar', name: 'Travel Requests', data: ministries.map(m => m.total), color: '#185FA5' }]
      : [{ type: 'bar', name: 'Estimated Cost (VUV)', data: [...ministries].sort((a, b) => b.totalCost - a.totalCost).map(m => m.totalCost), color: '#378ADD' }],
    legend: { enabled: false },
    tooltip: {
      ...theme.tooltip,
      formatter: miniTab === 'total'
        ? function (this: Highcharts.TooltipFormatterContextObject) { return `<b>${this.x}</b><br/>Requests: <b>${formatInt(this.y as number)}</b>`; }
        : function (this: Highcharts.TooltipFormatterContextObject) { return `<b>${this.x}</b><br/>Cost: <b>${formatVuv(this.y as number)}</b>`; },
    },
  };

  const timeSeriesOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'column', height: 260 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: byMonth.map(m => m.label), labels: { style: labelStyle } },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' }, allowDecimals: false },
    series: [{ type: 'column', name: 'Travel Requests', data: byMonth.map(m => m.count), color: '#185FA5' }],
    legend: { enabled: false },
    plotOptions: { column: { borderRadius: 3 } },
  };

  const fundingTrendOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'line', height: 260 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: trend.map(t => t.label), labels: { style: labelStyle } },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' }, allowDecimals: false },
    series: [
      { type: 'line', name: 'Donor Funded', data: trend.map(t => t.donor), color: '#10B981', marker: { enabled: true } },
      { type: 'line', name: 'Government Funded', data: trend.map(t => t.government), color: '#185FA5', marker: { enabled: true } },
      { type: 'line', name: 'Partly Funded', data: trend.map(t => t.partly), color: '#F59E0B', marker: { enabled: true } },
    ],
  };

  const donorChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 320 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: donors.map(d => d.donor), labels: { style: { ...labelStyle, fontSize: '9px' } } },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' }, allowDecimals: false },
    series: [{ type: 'bar', name: 'Requests', data: donors.map(d => d.count), color: '#8B5CF6' }],
    legend: { enabled: false },
  };

  const fundingChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{ type: 'pie', name: 'Requests', data: Object.entries(funding).map(([name, y]) => ({ name, y })), innerSize: '50%' }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } } } },
  };

  const approvalChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{ type: 'pie', name: 'Requests', data: Object.entries(approval).map(([name, y]) => ({ name, y })), innerSize: '50%' }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } } } },
  };

  const genderChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{
      type: 'pie',
      name: 'Requests',
      data: [
        { name: 'Male', y: male, color: '#185FA5' },
        { name: 'Female', y: female, color: '#F59E0B' },
        ...(rows.filter(r => r.gender === '').length > 0 ? [{ name: 'Unknown', y: rows.filter(r => r.gender === '').length, color: '#CBD5E0' }] : []),
      ],
      innerSize: '50%',
    }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } } } },
  };

  const modeChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{ type: 'pie', name: 'Requests', data: Object.entries(modes).map(([name, y]) => ({ name, y })), innerSize: '50%' }],
    plotOptions: { pie: { dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } } } },
  };

  const destChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 320 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: destinations.map(d => d.destination), labels: { style: labelStyle } },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' } },
    series: [{ type: 'bar', name: 'Requests', data: destinations.map(d => d.count), color: '#10B981' }],
    legend: { enabled: false },
  };

  const qualityFields = [
    { label: 'Estimated Cost', missing: quality.missingCost },
    { label: 'Approval Status', missing: quality.missingApproval },
    { label: 'Report Submitted', missing: quality.missingReport },
    { label: 'Gender', missing: quality.missingGender },
    { label: 'Destination', missing: quality.missingDestination },
  ];

  return (
    <div className="space-y-6">
      <div className="un-page-header">
        <h1 className="text-xl font-semibold text-un-fg">Executive Overview</h1>
        <p className="mt-1 text-[12px] text-un-secondary">
          2026 Overseas Travel Registry — all ministries &nbsp;·&nbsp;
          <span className="text-un-tertiary">Data loaded: {formatDate(loadedAt)}</span>
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Travel Requests" value={formatInt(total)} hint={`${formatInt(intl)} international`} variant="primary" />
        <KpiCard label="Approved" value={formatInt(approved)} hint={pct(approved, total) + ' approval rate'} />
        <KpiCard label="Donor Funded" value={formatInt(donorFunded)} hint={pct(donorFunded, total) + ' of total'} />
        <KpiCard label="Est. Total Cost" value={formatVuvMillions(totalCost)} hint="Sum of declared costs" variant="quiet" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Avg. Trip Duration" value={metrics.avgDurationDays !== null ? `${metrics.avgDurationDays} days` : '—'} hint="International travel" variant="quiet" />
        <KpiCard label="Avg. Cost per Trip" value={metrics.avgCost !== null ? formatVuv(Math.round(metrics.avgCost)) : '—'} hint="Where cost declared" variant="quiet" />
        <KpiCard label="Report Submission Rate" value={metrics.reportSubmissionRate.toFixed(1) + '%'} hint="% with report filed" variant="quiet" />
        <KpiCard label="Gender Equity (Female)" value={metrics.genderEquityRate.toFixed(1) + '%'} hint="% female of gendered records" variant="quiet" />
      </div>

      {/* Ministry overview + time series */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard label="Male Officers" value={formatInt(male)} hint={pct(male, male + female) + ' of gendered'} variant="quiet" />
        <KpiCard label="Female Officers" value={formatInt(female)} hint={pct(female, male + female) + ' of gendered'} variant="quiet" />
      </div>

      {/* Time series */}
      <Panel title="Travel Requests by Month">
        <HighchartsReact highcharts={Highcharts} options={timeSeriesOpts} />
      </Panel>

      {/* Ministry bar */}
      <Panel title="Travel Requests by Ministry">
        <div className="mb-3 flex gap-2">
          {(['total', 'cost'] as const).map(tab => (
            <button key={tab} onClick={() => setMiniTab(tab)}
              className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${miniTab === tab ? 'bg-primary text-white' : 'bg-un-wash text-un-secondary hover:text-un-fg'}`}>
              {tab === 'total' ? 'By Requests' : 'By Cost'}
            </button>
          ))}
        </div>
        <HighchartsReact highcharts={Highcharts} options={ministryChartOpts} />
      </Panel>

      {/* Funding source + Approval */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Funding Source Breakdown">
          <HighchartsReact highcharts={Highcharts} options={fundingChartOpts} />
        </Panel>
        <Panel title="Approval Status">
          <HighchartsReact highcharts={Highcharts} options={approvalChartOpts} />
        </Panel>
      </div>

      {/* Funding trend over time */}
      <Panel title="Funding Source Trend by Month">
        <HighchartsReact highcharts={Highcharts} options={fundingTrendOpts} />
      </Panel>

      {/* Top donors */}
      {donors.length > 0 && (
        <Panel title="Top Donor Organisations">
          <HighchartsReact highcharts={Highcharts} options={donorChartOpts} />
        </Panel>
      )}

      {/* Gender + Mode */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Gender Distribution">
          <HighchartsReact highcharts={Highcharts} options={genderChartOpts} />
        </Panel>
        <Panel title="Travel Mode">
          <HighchartsReact highcharts={Highcharts} options={modeChartOpts} />
        </Panel>
      </div>

      {/* Destinations */}
      <Panel title="Top 10 Destinations">
        <HighchartsReact highcharts={Highcharts} options={destChartOpts} />
      </Panel>

      {/* Data Quality */}
      <Panel title={`Data Quality Score — ${quality.score}%`}>
        <div className="mb-4 flex items-center gap-4">
          <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-[22px] font-bold text-white ${quality.score >= 80 ? 'bg-green-500' : quality.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
            {quality.score}
          </div>
          <p className="text-[12px] text-un-secondary leading-relaxed">
            Overall completeness across 5 key fields for {formatInt(quality.total)} records.
            Incomplete records are highlighted in the Travel Tracker.
          </p>
        </div>
        <div className="space-y-3">
          {qualityFields.map(({ label, missing }) => {
            const filled = quality.total - missing;
            const filledPct = quality.total > 0 ? (filled / quality.total) * 100 : 0;
            return (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-un-secondary">{label}</span>
                  <span className="tabular-nums text-un-fg">{formatInt(filled)} / {formatInt(quality.total)} ({filledPct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-un-wash">
                  <div
                    className={`h-1.5 rounded-full ${filledPct >= 80 ? 'bg-green-500' : filledPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${filledPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
