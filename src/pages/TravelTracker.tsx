import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import type { TravelRow } from '../lib/types';
import { formatVuv } from '../lib/format';

type Props = { rows: TravelRow[] };

const col = createColumnHelper<TravelRow>();

const columns = [
  col.accessor('officerName', { header: 'Officer Name', size: 160 }),
  col.accessor('gender', { header: 'Gender', size: 60 }),
  col.accessor('positionTitle', { header: 'Position', size: 150 }),
  col.accessor('ministry', { header: 'Ministry', size: 120 }),
  col.accessor('department', { header: 'Department', size: 110 }),
  col.accessor('typeOfTravel', { header: 'Type of Travel', size: 180 }),
  col.accessor('travelDate', { header: 'Travel Date', size: 100 }),
  col.accessor('returnDate', { header: 'Return Date', size: 100 }),
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
      return v !== null && v > 0 ? <span className="tabular-nums">{formatVuv(v)}</span> : <span className="text-un-tertiary">—</span>;
    },
  }),
  col.accessor('imprestTotal', { header: 'Imprest Total', size: 110 }),
  col.accessor('approvalStatus', {
    header: 'Status',
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

export function TravelTracker({ rows }: Props) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('All');
  const [fundingFilter, setFundingFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [ministryFilter, setMinistryFilter] = useState('All');
  const [sorting, setSorting] = useState<SortingState>([]);

  const ministries = useMemo(() => {
    const set = new Set(rows.map(r => r.ministry).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (approvalFilter !== 'All' && r.approvalStatus !== approvalFilter) return false;
    if (fundingFilter !== 'All' && r.fundingSource !== fundingFilter) return false;
    if (modeFilter !== 'All' && r.travelMode !== modeFilter) return false;
    if (ministryFilter !== 'All' && r.ministry !== ministryFilter) return false;
    return true;
  }), [rows, approvalFilter, fundingFilter, modeFilter, ministryFilter]);

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

  return (
    <div className="space-y-4">
      <div className="un-page-header">
        <h1 className="text-xl font-semibold text-un-fg">Travel Tracker</h1>
        <p className="mt-1 text-[12px] text-un-secondary">
          Showing {table.getFilteredRowModel().rows.length.toLocaleString()} of {rows.length.toLocaleString()} records
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
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
        ] as [string, string, (v: string) => void, string[]][]).map(([label, value, setter, opts]) => (
          <label key={label} className="flex items-center gap-1.5">
            <span className="text-[11px] text-un-tertiary">{label}:</span>
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              className="rounded-md border border-un-border bg-un-surface px-2 py-1.5 text-[12px] text-un-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}
        {(approvalFilter !== 'All' || fundingFilter !== 'All' || modeFilter !== 'All' || ministryFilter !== 'All' || globalFilter) && (
          <button
            onClick={() => { setApprovalFilter('All'); setFundingFilter('All'); setModeFilter('All'); setMinistryFilter('All'); setGlobalFilter(''); }}
            className="text-[11px] text-un-secondary hover:text-primary underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="un-table-shell overflow-auto">
        <table className="w-full min-w-[900px] text-[11px]">
          <thead className="un-thead">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
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
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="un-trow">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2 text-un-fg truncate max-w-[200px]" title={String(cell.getValue() ?? '')}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-un-tertiary">No records match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[12px] text-un-secondary">
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash"
          >«</button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash"
          >‹</button>
          <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash"
          >›</button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="rounded border border-un-border px-2 py-1 disabled:opacity-40 hover:bg-un-wash"
          >»</button>
        </div>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className="rounded border border-un-border bg-un-surface px-2 py-1 text-[12px] text-un-fg"
        >
          {[25, 50, 100, 250].map(s => <option key={s} value={s}>Show {s}</option>)}
        </select>
      </div>
    </div>
  );
}
