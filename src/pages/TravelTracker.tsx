import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, flexRender, createColumnHelper, type SortingState,
} from '@tanstack/react-table';
import type { TravelRow } from '../lib/types';
import type { ReportStatus } from '../lib/data';
import { formatVuv, formatDate } from '../lib/format';
import { isIncomplete, formatTravelDate, getReportStatus, reportDueDate } from '../lib/data';

type Props = { rows: TravelRow[]; loadedAt: Date };

const col = createColumnHelper<TravelRow>();

const TODAY = new Date();

const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  'Submitted':     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Overdue':       'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'Due Soon':      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Not Yet Due':   'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  'No Return Date':'bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500',
};

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${REPORT_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

const columns = [
  col.accessor('officerName', { header: 'Officer Name', size: 160 }),
  col.accessor('gender', { header: 'Gender', size: 60 }),
  col.accessor('positionTitle', { header: 'Position', size: 150 }),
  col.accessor('ministry', { header: 'Ministry', size: 120 }),
  col.accessor('department', { header: 'Department', size: 110 }),
  col.accessor('typeOfTravel', { header: 'Type of Travel', size: 180 }),
  col.accessor('travelDate', {
    header: 'Travel Date',
    size: 110,
    cell: ({ getValue }) => formatTravelDate(String(getValue() ?? '')),
  }),
  col.accessor('returnDate', {
    header: 'Return Date',
    size: 110,
    cell: ({ getValue }) => formatTravelDate(String(getValue() ?? '')),
  }),
  col.display({
    id: 'reportDue',
    header: 'Report Due',
    size: 110,
    cell: ({ row }) => {
      const due = reportDueDate(row.original.returnDate);
      if (!due) return <span className="text-un-tertiary">—</span>;
      const status = getReportStatus(row.original, TODAY);
      const isOverdue = status === 'Overdue';
      const isDueSoon = status === 'Due Soon';
      return (
        <span className={`tabular-nums ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : isDueSoon ? 'text-orange-600 dark:text-orange-400 font-semibold' : ''}`}>
          {due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      );
    },
  }),
  col.display({
    id: 'reportStatus',
    header: 'Report Status',
    size: 130,
    cell: ({ row }) => <ReportStatusBadge status={getReportStatus(row.original, TODAY)} />,
  }),
  col.accessor('report', {
    header: 'Report Filed',
    size: 100,
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '');
      return v
        ? <span className="text-green-700 dark:text-green-400 text-[10px]">{v}</span>
        : <span className="text-un-tertiary text-[10px]">—</span>;
    },
  }),
  col.accessor('destination', { header: 'Destination', size: 150 }),
  col.accessor('purpose', {
    header: 'Purpose',
    size: 220,
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '');
      return <span title={v}>{v.length > 80 ? v.slice(0, 80) + '…' : v}</span>;
    },
  }),
  col.accessor('fundingSource', { header: 'Funding Source', size: 130 }),
  col.accessor('donorName', { header: 'Donor Name', size: 140 }),
  col.accessor('estimatedCost', {
    header: 'Est. Cost (VUV)',
    size: 120,
    cell: ({ getValue }) => {
      const v = getValue();
      return v !== null && v > 0
        ? <span className="tabular-nums">{formatVuv(v)}</span>
        : <span className="text-red-400 text-[10px]">Missing</span>;
    },
  }),
  col.accessor('imprestTotal', { header: 'Imprest Total', size: 110 }),
  col.accessor('approvalStatus', {
    header: 'Approval',
    size: 100,
    cell: ({ getValue }) => {
      const v = getValue();
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
          v === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
          v === 'Not Approved' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
        }`}>{v}</span>
      );
    },
  }),
  col.accessor('travelMode', { header: 'Mode', size: 120 }),
  col.accessor('sheet', { header: 'Sheet', size: 90 }),
];

const APPROVAL_OPTIONS = ['All', 'Approved', 'Not Approved', 'Pending'];
const FUNDING_OPTIONS = ['All', 'Donor Funded', 'Government Funded', 'Partly Funded', 'Partly Donor', 'Unknown'];
const MODE_OPTIONS = ['All', 'Individual', 'Group/Mission', 'Unknown'];
const REPORT_OPTIONS: ['All', ...ReportStatus[]] = ['All', 'Overdue', 'Due Soon', 'Submitted', 'Not Yet Due', 'No Return Date'];

function exportCSV(rows: TravelRow[]) {
  const headers = [
    'Officer Name', 'Gender', 'Position', 'Ministry', 'Department', 'Type of Travel',
    'Travel Date', 'Return Date', 'Report Due Date', 'Report Status', 'Report Filed',
    'Destination', 'Purpose', 'Funding Source', 'Donor Name',
    'Est. Cost (VUV)', 'Imprest Total', 'Approval Status', 'Travel Mode', 'Sheet',
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const due = reportDueDate(r.returnDate);
    const status = getReportStatus(r, TODAY);
    csvRows.push([
      escape(r.officerName), r.gender, escape(r.positionTitle), escape(r.ministry),
      escape(r.department), escape(r.typeOfTravel),
      r.travelDate, r.returnDate,
      due ? due.toLocaleDateString('en-GB') : '',
      status,
      escape(r.report),
      escape(r.destination), escape(r.purpose), r.fundingSource, escape(r.donorName),
      r.estimatedCost ?? '', escape(r.imprestTotal), r.approvalStatus,
      r.travelMode, r.sheet,
    ].join(','));
  }
  const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overseas_travel_2026_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TravelTracker({ rows, loadedAt }: Props) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('All');
  const [fundingFilter, setFundingFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [ministryFilter, setMinistryFilter] = useState('All');
  const [reportFilter, setReportFilter] = useState<'All' | ReportStatus>('All');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const ministries = useMemo(() => {
    const set = new Set(rows.map(r => r.ministry).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const incompleteCount = useMemo(() => rows.filter(isIncomplete).length, [rows]);

  // Report compliance counts for the summary bar
  const reportCounts = useMemo(() => {
    const overdue = rows.filter(r => getReportStatus(r, TODAY) === 'Overdue').length;
    const dueSoon = rows.filter(r => getReportStatus(r, TODAY) === 'Due Soon').length;
    const submitted = rows.filter(r => r.report !== '').length;
    return { overdue, dueSoon, submitted };
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (approvalFilter !== 'All' && r.approvalStatus !== approvalFilter) return false;
    if (fundingFilter !== 'All' && r.fundingSource !== fundingFilter) return false;
    if (modeFilter !== 'All' && r.travelMode !== modeFilter) return false;
    if (ministryFilter !== 'All' && r.ministry !== ministryFilter) return false;
    if (reportFilter !== 'All' && getReportStatus(r, TODAY) !== reportFilter) return false;
    if (showIncompleteOnly && !isIncomplete(r)) return false;
    return true;
  }), [rows, approvalFilter, fundingFilter, modeFilter, ministryFilter, reportFilter, showIncompleteOnly]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const hasFilters = approvalFilter !== 'All' || fundingFilter !== 'All' || modeFilter !== 'All'
    || ministryFilter !== 'All' || reportFilter !== 'All' || globalFilter || showIncompleteOnly;

  return (
    <div className="space-y-4">
      <div className="un-page-header">
        <h1 className="text-xl font-semibold text-un-fg">Travel Tracker</h1>
        <p className="mt-1 text-[12px] text-un-secondary">
          Showing {table.getFilteredRowModel().rows.length.toLocaleString()} of {rows.length.toLocaleString()} records
          &nbsp;·&nbsp;
          <span className="text-un-tertiary">Data loaded: {formatDate(loadedAt)}</span>
        </p>
      </div>

      {/* Report compliance summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-un-border bg-un-surface px-4 py-3">
        <span className="text-[11px] font-semibold text-un-secondary uppercase tracking-wide">Report Compliance:</span>
        <button
          onClick={() => setReportFilter(reportFilter === 'Overdue' ? 'All' : 'Overdue')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border ${
            reportFilter === 'Overdue'
              ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300'
              : 'border-un-border text-un-secondary hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="font-bold">{reportCounts.overdue}</span> Overdue
        </button>
        <button
          onClick={() => setReportFilter(reportFilter === 'Due Soon' ? 'All' : 'Due Soon')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border ${
            reportFilter === 'Due Soon'
              ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300'
              : 'border-un-border text-un-secondary hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-900/20 dark:hover:text-orange-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
          <span className="font-bold">{reportCounts.dueSoon}</span> Due Soon
        </button>
        <button
          onClick={() => setReportFilter(reportFilter === 'Submitted' ? 'All' : 'Submitted')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border ${
            reportFilter === 'Submitted'
              ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300'
              : 'border-un-border text-un-secondary hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="font-bold">{reportCounts.submitted}</span> Submitted
        </button>
        <span className="text-[10px] text-un-tertiary ml-auto">Officers have 5 days after return to submit their report. Click a badge to filter.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Search officer, ministry, destination…"
          className="rounded-md border border-un-border bg-un-surface px-3 py-1.5 text-[12px] text-un-fg placeholder:text-un-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 w-72"
        />
        {([
          ['Ministry', ministryFilter, setMinistryFilter, ministries],
          ['Approval', approvalFilter, setApprovalFilter, APPROVAL_OPTIONS],
          ['Funding', fundingFilter, setFundingFilter, FUNDING_OPTIONS],
          ['Mode', modeFilter, setModeFilter, MODE_OPTIONS],
          ['Report', reportFilter, setReportFilter, REPORT_OPTIONS],
        ] as [string, string, (v: string) => void, string[]][]).map(([label, value, setter, opts]) => (
          <label key={label} className="flex items-center gap-1.5">
            <span className="text-[11px] text-un-tertiary">{label}:</span>
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              className={`rounded-md border px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                label === 'Report' && value === 'Overdue'
                  ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                  : label === 'Report' && value === 'Due Soon'
                  ? 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
                  : 'border-un-border bg-un-surface text-un-fg'
              }`}
            >
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showIncompleteOnly}
            onChange={e => setShowIncompleteOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-un-border accent-primary"
          />
          <span className="text-[11px] text-un-secondary">
            Incomplete only
            <span className="ml-1 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {incompleteCount}
            </span>
          </span>
          <span className="group relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-un-tertiary hover:text-un-secondary cursor-help">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-md border border-un-border bg-un-surface shadow-un-md opacity-0 group-hover:opacity-100 transition-opacity z-50 p-3 text-left">
              <p className="text-[11px] font-semibold text-un-fg mb-1.5">Incomplete record</p>
              <p className="text-[10px] text-un-secondary leading-relaxed">A record is flagged incomplete if it is missing <strong>any</strong> of:</p>
              <ul className="mt-1.5 space-y-1 text-[10px] text-un-secondary">
                <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-400" />Estimated travel cost</li>
                <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-400" />Approval status</li>
                <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-400" />Officer gender</li>
              </ul>
            </div>
          </span>
        </label>

        {hasFilters && (
          <button
            onClick={() => {
              setApprovalFilter('All'); setFundingFilter('All'); setModeFilter('All');
              setMinistryFilter('All'); setReportFilter('All'); setGlobalFilter('');
              setShowIncompleteOnly(false);
            }}
            className="text-[11px] text-un-secondary hover:text-primary underline"
          >
            Clear filters
          </button>
        )}

        <button
          onClick={() => exportCSV(table.getFilteredRowModel().rows.map(r => r.original))}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-un-border bg-un-surface px-3 py-1.5 text-[11px] font-medium text-un-secondary hover:bg-un-wash hover:text-un-fg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="un-table-shell overflow-auto">
        <table className="w-full min-w-[1600px] text-[11px]">
          <thead className="un-thead">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                <th className="px-3 py-2 w-1" />
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-un-tertiary cursor-pointer select-none whitespace-nowrap"
                    style={{ width: h.column.columnDef.size }}
                    onClick={h.column.getToggleSortingHandler()}
                    aria-sort={h.column.getIsSorted() === 'asc' ? 'ascending' : h.column.getIsSorted() === 'desc' ? 'descending' : 'none'}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {' '}{h.column.getIsSorted() === 'asc' ? '▲' : h.column.getIsSorted() === 'desc' ? '▼' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const incomplete = isIncomplete(row.original);
              const rptStatus = getReportStatus(row.original, TODAY);
              const isOverdue = rptStatus === 'Overdue';
              return (
                <tr
                  key={row.id}
                  className={`un-trow ${
                    isOverdue
                      ? 'border-l-2 border-l-red-400 bg-red-50/40 dark:bg-red-900/10'
                      : incomplete
                      ? 'border-l-2 border-l-yellow-400'
                      : ''
                  }`}
                >
                  <td className="px-1 py-2">
                    {isOverdue ? (
                      <span title="Report overdue — past 5-day deadline" className="block h-1.5 w-1.5 rounded-full bg-red-500 mx-auto" />
                    ) : incomplete ? (
                      <span title="Incomplete record — missing cost, approval, or gender" className="block h-1.5 w-1.5 rounded-full bg-yellow-400 mx-auto" />
                    ) : null}
                  </td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2 text-un-fg truncate max-w-[200px]" title={String(cell.getValue() ?? '')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-un-tertiary">No records match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[12px] text-un-secondary">
        <div className="flex items-center gap-2">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash">«</button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash">‹</button>
          <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash">›</button>
          <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash">»</button>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-un-tertiary">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />Report overdue
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-un-tertiary">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />Incomplete record
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="rounded border border-un-border bg-un-surface px-2 py-1 text-[12px] text-un-fg"
          >
            {[25, 50, 100, 250].map(s => <option key={s} value={s}>Show {s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
