import type { ReactNode } from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Numero sul lato della voce (es. prove in corso). */
  badge?: number;
  /** Pallino verde: qualcosa è attivo adesso. */
  dot?: boolean;
  active: boolean;
  onClick: () => void;
}

/**
 * Guscio con barra laterale, lo stesso di VLSM e CCNA1. Puramente
 * presentazionale: quale voce è attiva lo decide il chiamante. Su schermo
 * stretto la barra diventa una fila orizzontale scorrevole.
 */
export function SidebarShell({
  groupLabel,
  items,
  footer,
  children,
}: {
  groupLabel: string;
  items: SidebarItem[];
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sidebar-shell">
      <nav className="sidebar-nav" aria-label={groupLabel}>
        <div className="sidebar-group-label">{groupLabel}</div>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`sidebar-item${it.active ? ' active' : ''}`}
            aria-current={it.active ? 'page' : undefined}
            onClick={it.onClick}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.badge ? <span className="sidebar-badge">{it.badge}</span> : null}
            {it.dot ? <span className="sidebar-dot" aria-hidden /> : null}
          </button>
        ))}
        {footer ? <div className="sidebar-footer">{footer}</div> : null}
      </nav>
      <div className="sidebar-content">{children}</div>
    </div>
  );
}
