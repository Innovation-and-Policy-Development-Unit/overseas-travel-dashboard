import { useMemo, useState } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import type { TravelRow } from '../lib/types';
import { ministryAggregates, fundingBreakdown, approvalBreakdown, travelModeBreakdown, topDestinations } from '../lib/data';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { formatInt, formatVuvMillions, pct } from '../lib/format';
import { getChartTheme } from '../lib/chartTheme';

type Props = { rows: TravelRow[] };

export function ExecutiveOverview({ rows }: Props) {
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

  const ministryChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 380 },
    title: { text: undefined },
    xAxis: {
      ...theme.xAxis,
      categories: miniTab === 'total'
        ? ministries.map(m => m.ministry)
        : [...ministries].sort((a, b) => b.totalCost - a.totalCost).map(m => m.ministry),
      labels: { style: { color: '#4a5568', fontSize: '10px' } },
    },
    yAxis: { ...theme.yAxis, title: { text: miniTab === 'total' ? 'Requests' : 'VUV' } },
    series: miniTab === 'total'
      ? [{
          type: 'bar',
          name: 'Travel Requests',
          data: ministries.map(m => m.total),
          color: '#185FA5',
        }]
      : [{
          type: 'bar',
          name: 'Estimated Cost (VUV)',
          data: [...ministries].sort((a, b) => b.totalCost - a.totalCost).map(m => m.totalCost),
          color: '#378ADD',
        }],
    legend: { enabled: false },
    tooltip: {
      ...theme.tooltip,
      formatter: miniTab === 'total'
        ? function (this: Highcharts.TooltipFormatterContextObject) { return `<b>${this.x}</b><br/>Requests: <b>${formatInt(this.y as number)}</b>`; }
        : function (this: Highcharts.TooltipFormatterContextObject) { return `<b>${this.x}</b><br/>Cost: <b>VUV ${formatInt(this.y as number)}</b>`; },
    },
  };

  const fundingChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{
      type: 'pie',
      name: 'Requests',
      data: Object.entries(funding).map(([name, y]) => ({ name, y })),
      innerSize: '50%',
    }],
    plotOptions: {
      pie: {
        dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } },
      },
    },
  };

  const approvalChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{
      type: 'pie',
      name: 'Requests',
      data: Object.entries(approval).map(([name, y]) => ({ name, y })),
      innerSize: '50%',
    }],
    plotOptions: {
      pie: {
        dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } },
      },
    },
  };

  const destChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'bar', height: 320 },
    title: { text: undefined },
    xAxis: { ...theme.xAxis, categories: destinations.map(d => d.destination) },
    yAxis: { ...theme.yAxis, title: { text: 'Requests' } },
    series: [{ type: 'bar', name: 'Requests', data: destinations.map(d => d.count), color: '#10B981' }],
    legend: { enabled: false },
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
    plotOptions: {
      pie: {
        dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } },
      },
    },
  };

  const modeChartOpts: Highcharts.Options = {
    ...theme,
    chart: { ...theme.chart, type: 'pie', height: 240 },
    title: { text: undefined },
    series: [{
      type: 'pie',
      name: 'Requests',
      data: Object.entries(modes).map(([name, y]) => ({ name, y })),
      innerSize: '50%',
    }],
    plotOptions: {
      pie: {
        dataLabels: { enabled: true, format: '<b>{point.name}</b><br/>{point.percentage:.1f}%', style: { fontSize: '10px' } },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="un-page-header">
        <h1 className="text-xl font-semibold text-un-fg">Executive Overview</h1>
        <p className="mt-1 text-[12px] text-un-secondary">2026 Overseas Travel Registry — summary across all ministries</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Travel Requests" value={formatInt(total)} hint={`${formatInt(intl)} international`} variant="primary" />
        <KpiCard label="Approved" value={formatInt(approved)} hint={pct(approved, total) + ' approval rate'} />
        <KpiCard label="Donor Funded" value={formatInt(donorFunded)} hint={pct(donorFunded, total) + ' of total'} />
        <KpiCard label="Est. Total Cost" value={formatVuvMillions(totalCost)} hint="Sum of declared costs" variant="quiet" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Male Officers" value={formatInt(male)} hint={pct(male, male + female) + ' of gendered'} variant="quiet" />
        <KpiCard label="Female Officers" value={formatInt(female)} hint={pct(female, male + female) + ' of gendered'} variant="quiet" />
        <KpiCard label="Ministries" value={formatInt(new Set(rows.map(r => r.ministry)).size)} hint="Distinct ministries" variant="quiet" />
      </div>

      <Panel title="Travel Requests by Ministry">
        <div className="mb-3 flex gap-2">
          {(['total', 'cost'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMiniTab(tab)}
              className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${miniTab === tab ? 'bg-primary text-white' : 'bg-un-wash text-un-secondary hover:text-un-fg'}`}
            >
              {tab === 'total' ? 'By Requests' : 'By Cost'}
            </button>
          ))}
        </div>
        <HighchartsReact highcharts={Highcharts} options={ministryChartOpts} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Funding Source Breakdown">
          <HighchartsReact highcharts={Highcharts} options={fundingChartOpts} />
        </Panel>
        <Panel title="Approval Status">
          <HighchartsReact highcharts={Highcharts} options={approvalChartOpts} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Gender Distribution">
          <HighchartsReact highcharts={Highcharts} options={genderChartOpts} />
        </Panel>
        <Panel title="Travel Mode">
          <HighchartsReact highcharts={Highcharts} options={modeChartOpts} />
        </Panel>
      </div>

      <Panel title="Top 10 Destinations">
        <HighchartsReact highcharts={Highcharts} options={destChartOpts} />
      </Panel>
    </div>
  );
}
