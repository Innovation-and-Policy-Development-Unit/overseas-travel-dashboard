import type { PageId } from './lib/types';

export const DASHBOARD_NAV: { id: PageId; path: string; label: string }[] = [
  { id: 'executive', path: '/executive', label: 'Executive Overview' },
  { id: 'ministry', path: '/ministry', label: 'Ministry Breakdown' },
  { id: 'tracker', path: '/tracker', label: 'Travel Tracker' },
];
