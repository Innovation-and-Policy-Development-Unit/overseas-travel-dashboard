import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, children, className = '' }: Props) {
  return (
    <div className={`rounded-md border border-un-border bg-un-surface shadow-un-sm ${className}`}>
      <div className="border-b border-un-border px-5 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-un-secondary">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
