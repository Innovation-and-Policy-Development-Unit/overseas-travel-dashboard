import * as XLSX from 'xlsx';
import type { TravelRow } from './types';

function parseCost(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const str = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toUpperCase().replace(/\s+/g, '_')] = v;
  }
  return out;
}

function parseSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  label: TravelRow['sheet'],
): TravelRow[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw
    .map(normalizeKeys)
    .filter(r => String(r['MINISTRY'] || '').trim() !== '')
    .map(r => ({
      dateReceived: typeof r['DATE_RECIVED'] === 'number' ? r['DATE_RECIVED'] as number : null,
      officerName: String(r['OFFICER_NAME'] || '').trim(),
      gender: (['M', 'F'].includes(String(r['GENDER'] || '').trim())
        ? String(r['GENDER'] || '').trim()
        : '') as TravelRow['gender'],
      positionTitle: String(r['POSITION_TITTLE'] || '').trim(),
      department: String(r['DEPARTMENT'] || '').trim(),
      ministry: String(r['MINISTRY'] || '').trim(),
      typeOfTravel: String(r['TYPE_OF_TRAVEL'] || '').trim(),
      travelDate: String(r['TRAVEL_DATE'] || '').trim(),
      returnDate: String(r['RETURN_DATE'] || '').trim(),
      destination: String(r['DESTINATION'] || '').trim(),
      purpose: String(r['TRAVEL_PURPOSE_AND_DETAILS_ON_ITS_BENEFITS'] || '').trim(),
      fundingSource: normalizeFunding(String(r['SOURCE_OF_FUNDING'] || '')),
      estimatedCost: parseCost(r['ESTIMATE_TRAVELS_COSTS']),
      imprestTotal: String(r['IMPREST_TOTAL'] || '').trim(),
      donorName: String(r['NAME_OF_THE_DONOR'] || '').trim(),
      approvalStatus: normalizeApproval(String(r['APPROVED/NOT_APPROVED'] || '')),
      report: String(r['REPORT'] || '').trim(),
      travelMode: normalizeTravelMode(String(r['MISSION/INDIVIDUAL_TRAVEL'] || '')),
      sheet: label,
    }));
}

function normalizeFunding(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('donor') && s.includes('partly')) return 'Partly Donor';
  if (s.includes('donor') || s.includes('fully funded by the donor') || s.includes('donour')) return 'Donor Funded';
  if (s.includes('partly')) return 'Partly Funded';
  if (s.includes('ministry') || s.includes('department') || s.includes('fully funded')) return 'Government Funded';
  if (s === '') return 'Unknown';
  return 'Government Funded';
}

function normalizeApproval(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('not')) return 'Not Approved';
  if (s.includes('approved')) return 'Approved';
  return 'Pending';
}

function normalizeTravelMode(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('mission') || s.includes('group')) return 'Group/Mission';
  if (s.includes('individual')) return 'Individual';
  return 'Unknown';
}

export async function loadTravelRows(): Promise<TravelRow[]> {
  const res = await fetch('./data/overseas_travel.xlsx');
  if (!res.ok) throw new Error(`Failed to load data: ${res.statusText}`);
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const intl = parseSheet(wb, 'International Travels', 'International');
  const dom = parseSheet(wb, 'Domestic Travels', 'Domestic');
  return [...intl, ...dom];
}

export interface MinistryAggregate {
  ministry: string;
  total: number;
  approved: number;
  donorFunded: number;
  govFunded: number;
  male: number;
  female: number;
  totalCost: number;
}

export function ministryAggregates(rows: TravelRow[]): MinistryAggregate[] {
  const map = new Map<string, MinistryAggregate>();
  for (const r of rows) {
    const m = r.ministry || 'Unknown';
    if (!map.has(m)) {
      map.set(m, { ministry: m, total: 0, approved: 0, donorFunded: 0, govFunded: 0, male: 0, female: 0, totalCost: 0 });
    }
    const agg = map.get(m)!;
    agg.total++;
    if (r.approvalStatus === 'Approved') agg.approved++;
    if (r.fundingSource === 'Donor Funded' || r.fundingSource === 'Partly Donor') agg.donorFunded++;
    if (r.fundingSource === 'Government Funded' || r.fundingSource === 'Partly Funded') agg.govFunded++;
    if (r.gender === 'M') agg.male++;
    if (r.gender === 'F') agg.female++;
    agg.totalCost += r.estimatedCost ?? 0;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function fundingBreakdown(rows: TravelRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.fundingSource] = (map[r.fundingSource] ?? 0) + 1;
  }
  return map;
}

export function approvalBreakdown(rows: TravelRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.approvalStatus] = (map[r.approvalStatus] ?? 0) + 1;
  }
  return map;
}

export function travelModeBreakdown(rows: TravelRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.travelMode] = (map[r.travelMode] ?? 0) + 1;
  }
  return map;
}

export function topDestinations(rows: TravelRow[], n = 10): { destination: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.destination) continue;
    const key = r.destination.split('-')[0].trim();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
