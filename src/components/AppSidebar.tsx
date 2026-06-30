import { NavLink } from 'react-router-dom';
import { DASHBOARD_NAV } from '../navConfig';
import { ThemeToggle } from './ThemeToggle';

type Props = { onClose?: () => void };

export function AppSidebar({ onClose }: Props) {
  return (
    <nav className="flex h-full flex-col bg-un-surface border-r border-un-border w-60">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-un-border">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-un-fg leading-tight truncate">Overseas Travel</p>
          <p className="text-[10px] text-un-tertiary leading-tight">2026 Registry Dashboard</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-un-tertiary">Navigation</p>
        <ul className="space-y-0.5">
          {DASHBOARD_NAV.map(item => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-un-secondary hover:bg-un-wash hover:text-un-fg'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-un-border">
        <span className="text-[10px] text-un-tertiary">Theme</span>
        <ThemeToggle />
      </div>
    </nav>
  );
}
