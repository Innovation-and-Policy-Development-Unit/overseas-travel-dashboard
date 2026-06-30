import * as XLSX from 'xlsx';
import type { TravelRow } from './types';

function parseCost(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw > 0 ? raw : null;
  const str = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(str);
  return isNaN(n) || n === 0 ? null : n;
}

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toUpperCase().replace(/\s+/g, '_')] = v;
  }
  return out;
}

function normaliseDateValue(val: unknown): string {
  if (val instanceof Date) {
    // cellDates:true gives us a proper Date object — format to DD.MM.YYYY
    const d = val as Date;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    // Raw Excel serial — convert manually
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  }
  return String(val || '').trim();
}

export function parseTravelDate(str: string): Date | null {
  const s = str.trim();
  // DD.MM.YYYY
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  // M/D/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
  return null;
}

export function formatTravelDate(str: string): string {
  const d = parseTravelDate(str);
  if (!d) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
      travelDate: normaliseDateValue(r['TRAVEL_DATE']),
      returnDate: normaliseDateValue(r['RETURN_DATE']),
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
  if (s.includes('donor') || s.includes('donour')) return 'Donor Funded';
  if (s.includes('partly') || s.includes('partial')) return 'Partly Funded';
  if (s.includes('ministry') || s.includes('department') || s.includes('fully funded') || s.includes('fully fund')) return 'Government Funded';
  if (s === '' || s === 'n/a') return 'Unknown';
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

export async function loadTravelRows(): Promise<{ rows: TravelRow[]; loadedAt: Date }> {
  const res = await fetch('./data/overseas_travel.xlsx');
  if (!res.ok) throw new Error(`Failed to load data: ${res.statusText}`);
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array', cellDates: true });
  const intl = parseSheet(wb, 'International Travels', 'International');
  const dom = parseSheet(wb, 'Domestic Travels', 'Domestic');
  return { rows: [...intl, ...dom], loadedAt: new Date() };
}

// ── Aggregations ──────────────────────────────────────────────────────────────

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
    if (!map.has(m)) map.set(m, { ministry: m, total: 0, approved: 0, donorFunded: 0, govFunded: 0, male: 0, female: 0, totalCost: 0 });
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
  for (const r of rows) map[r.fundingSource] = (map[r.fundingSource] ?? 0) + 1;
  return map;
}

export function approvalBreakdown(rows: TravelRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.approvalStatus] = (map[r.approvalStatus] ?? 0) + 1;
  return map;
}

export function travelModeBreakdown(rows: TravelRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.travelMode] = (map[r.travelMode] ?? 0) + 1;
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

export function travelsByMonth(rows: TravelRow[]): { month: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = parseTravelDate(r.travelDate);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from(map.entries())
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      return { month, label: `${MONTHS[parseInt(m) - 1]} ${y}`, count };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function fundingTrend(rows: TravelRow[]): { label: string; donor: number; government: number; partly: number }[] {
  const map = new Map<string, { donor: number; government: number; partly: number }>();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const r of rows) {
    const d = parseTravelDate(r.travelDate);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, { donor: 0, government: 0, partly: 0 });
    const m = map.get(key)!;
    if (r.fundingSource === 'Donor Funded') m.donor++;
    else if (r.fundingSource === 'Government Funded') m.government++;
    else m.partly++;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [y, m] = key.split('-');
      return { label: `${MONTHS[parseInt(m) - 1]} ${y}`, ...v };
    });
}

export function topDonors(rows: TravelRow[], n = 10): { donor: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.donorName.trim();
    if (!d || d.toLowerCase() === 'n/a' || d === '') continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([donor, count]) => ({ donor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function genderByMinistry(rows: TravelRow[]): { ministry: string; male: number; female: number; equityPct: number }[] {
  const map = new Map<string, { male: number; female: number }>();
  for (const r of rows) {
    const m = r.ministry || 'Unknown';
    if (!map.has(m)) map.set(m, { male: 0, female: 0 });
    const agg = map.get(m)!;
    if (r.gender === 'M') agg.male++;
    if (r.gender === 'F') agg.female++;
  }
  return Array.from(map.entries())
    .map(([ministry, { male, female }]) => ({
      ministry,
      male,
      female,
      equityPct: male + female > 0 ? Math.round((female / (male + female)) * 100) : 0,
    }))
    .filter(r => r.male + r.female > 0)
    .sort((a, b) => b.female - a.female);
}

export interface DataQuality {
  total: number;
  missingCost: number;
  missingApproval: number;
  missingReport: number;
  missingGender: number;
  missingDestination: number;
  score: number;
}

export function dataQuality(rows: TravelRow[]): DataQuality {
  const total = rows.length;
  if (total === 0) return { total: 0, missingCost: 0, missingApproval: 0, missingReport: 0, missingGender: 0, missingDestination: 0, score: 0 };
  const missingCost = rows.filter(r => r.estimatedCost === null).length;
  const missingApproval = rows.filter(r => r.approvalStatus === 'Pending').length;
  const missingReport = rows.filter(r => r.report === '').length;
  const missingGender = rows.filter(r => r.gender === '').length;
  const missingDestination = rows.filter(r => r.destination === '').length;
  const fieldScores = [missingCost, missingApproval, missingReport, missingGender, missingDestination]
    .map(missing => (total - missing) / total);
  const score = Math.round((fieldScores.reduce((s, v) => s + v, 0) / fieldScores.length) * 100);
  return { total, missingCost, missingApproval, missingReport, missingGender, missingDestination, score };
}

export interface AverageMetrics {
  avgDurationDays: number | null;
  avgCost: number | null;
  reportSubmissionRate: number;
  genderEquityRate: number;
}

export function averageMetrics(rows: TravelRow[]): AverageMetrics {
  let totalDays = 0;
  let durationCount = 0;
  for (const r of rows) {
    const start = parseTravelDate(r.travelDate);
    const end = parseTravelDate(r.returnDate);
    if (start && end) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 90) { totalDays += days; durationCount++; }
    }
  }
  const costRows = rows.filter(r => r.estimatedCost !== null && r.estimatedCost > 0);
  const avgCost = costRows.length > 0
    ? costRows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0) / costRows.length
    : null;
  const reportSubmissionRate = rows.length > 0
    ? (rows.filter(r => r.report !== '').length / rows.length) * 100
    : 0;
  const gendered = rows.filter(r => r.gender !== '');
  const genderEquityRate = gendered.length > 0
    ? (gendered.filter(r => r.gender === 'F').length / gendered.length) * 100
    : 0;
  return {
    avgDurationDays: durationCount > 0 ? Math.round(totalDays / durationCount) : null,
    avgCost,
    reportSubmissionRate,
    genderEquityRate,
  };
}

export function isIncomplete(r: TravelRow): boolean {
  return r.estimatedCost === null || r.approvalStatus === 'Pending' || r.gender === '';
}

export type ReportStatus = 'Submitted' | 'Overdue' | 'Due Soon' | 'Not Yet Due' | 'No Return Date';

export function reportDueDate(returnDateStr: string): Date | null {
  const ret = parseTravelDate(returnDateStr);
  if (!ret) return null;
  const due = new Date(ret);
  due.setDate(due.getDate() + 5);
  return due;
}

export function getReportStatus(r: TravelRow, today = new Date()): ReportStatus {
  if (r.report !== '') return 'Submitted';
  const ret = parseTravelDate(r.returnDate);
  if (!ret) return 'No Return Date';
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const retMidnight = new Date(ret.getFullYear(), ret.getMonth(), ret.getDate());
  if (retMidnight > todayMidnight) return 'Not Yet Due';
  const daysSinceReturn = Math.floor((todayMidnight.getTime() - retMidnight.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceReturn > 5) return 'Overdue';
  return 'Due Soon';
}

export interface ReportCompliance {
  total: number;
  submitted: number;
  overdue: number;
  dueSoon: number;
  notYetDue: number;
  noReturnDate: number;
  submissionRate: number;
  overdueRate: number;
}

export function reportCompliance(rows: TravelRow[], today = new Date()): ReportCompliance {
  const returned = rows.filter(r => {
    const ret = parseTravelDate(r.returnDate);
    if (!ret) return false;
    return ret <= today;
  });
  const submitted = returned.filter(r => r.report !== '').length;
  const overdue = returned.filter(r => getReportStatus(r, today) === 'Overdue').length;
  const dueSoon = returned.filter(r => getReportStatus(r, today) === 'Due Soon').length;
  const notYetDue = rows.filter(r => getReportStatus(r, today) === 'Not Yet Due').length;
  const noReturnDate = rows.filter(r => getReportStatus(r, today) === 'No Return Date').length;
  const total = returned.length;
  return {
    total,
    submitted,
    overdue,
    dueSoon,
    notYetDue,
    noReturnDate,
    submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0,
  };
}

export function getAvailableYears(rows: TravelRow[]): number[] {
  const years = new Set<number>();
  for (const r of rows) {
    const d = parseTravelDate(r.travelDate);
    if (d) years.add(d.getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function filterByYear(rows: TravelRow[], year: number | 'all'): TravelRow[] {
  if (year === 'all') return rows;
  return rows.filter(r => {
    const d = parseTravelDate(r.travelDate);
    // If date is missing or unparseable (e.g. empty, or "date1 & date2"), keep the row
    if (!d) return true;
    return d.getFullYear() === year;
  });
}
