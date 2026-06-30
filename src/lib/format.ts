const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const vuvFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatInt(n: number): string {
  return intFmt.format(n);
}

export function formatVuv(n: number): string {
  return 'VUV ' + vuvFmt.format(n);
}

export function formatVuvMillions(n: number): string {
  return (n / 1_000_000).toFixed(1) + 'M VUV';
}

export function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return ((n / total) * 100).toFixed(1) + '%';
}
