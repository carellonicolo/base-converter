import { NavLink } from 'react-router-dom';
import { Binary, Calculator, Diff, Sigma, Type, Target, ClipboardCheck, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Item {
  to: string;
  icon: LucideIcon;
  key: string;
}

/**
 * Barra di navigazione tra gli strumenti: premendo una voce cambia il corpo
 * della pagina (rotta) senza passare dalla home. La voce attiva è guidata da
 * NavLink (classe `active`), la "pillola" colorata è pura CSS — niente
 * framer-motion, per non appesantire il bundle.
 */
const ITEMS: Item[] = [
  { to: '/convertitore', icon: Binary, key: 'nav.converter' },
  { to: '/aritmetica', icon: Calculator, key: 'nav.arith' },
  { to: '/segno', icon: Diff, key: 'nav.signed' },
  { to: '/ieee754', icon: Sigma, key: 'nav.ieee' },
  { to: '/testo', icon: Type, key: 'nav.text' },
  { to: '/palestra', icon: Target, key: 'nav.gym' },
  { to: '/verifica', icon: ClipboardCheck, key: 'nav.exam' },
];

export function ToolNav() {
  const { t } = useI18n();
  return (
    <nav className="tool-nav-wrap" aria-label={t('nav.tools')}>
      <div className="tool-nav">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => `tool-tab${isActive ? ' active' : ''}`}
              title={t(it.key)}
            >
              <Icon size={16} aria-hidden />
              <span className="tool-tab-label">{t(it.key)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
