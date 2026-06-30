type Props = {
  label: string;
  value: string;
  hint?: string;
  variant?: 'default' | 'primary' | 'quiet';
};

export function KpiCard({ label, value, hint, variant = 'default' }: Props) {
  const isPrimary = variant === 'primary';
  const isQuiet = variant === 'quiet';
  return (
    <div
      className={
        isPrimary
          ? 'un-elevated rounded-md border border-un-border border-l-[4px] border-l-primary bg-un-surface p-5 ring-1 ring-primary/15'
          : isQuiet
            ? 'rounded-md border border-un-border bg-un-surface p-5 shadow-un-sm'
            : 'un-elevated rounded-md border border-un-border border-l-[3px] border-l-accent bg-un-surface p-5'
      }
    >
      <p className={isPrimary ? 'text-[10px] font-semibold uppercase tracking-wide text-un-secondary' : 'text-[10px] font-semibold uppercase tracking-wide text-un-tertiary'}>
        {label}
      </p>
      <p className={isPrimary ? 'mt-3 text-[clamp(26px,4vw,36px)] font-semibold tabular-nums leading-none tracking-tight text-un-fg' : 'mt-3 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-un-fg'}>
        {value}
      </p>
      {hint ? <p className="mt-3 text-[12px] font-normal leading-snug text-un-secondary">{hint}</p> : null}
    </div>
  );
}
