import {
  Award,
  Binary,
  Calculator,
  Cog,
  Crown,
  Diff,
  Flame,
  Globe,
  Settings,
  Sigma,
  Sparkles,
  Star,
  Target,
  Trophy,
  Type,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { BADGES } from '../../lib/progress';

type Tfn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Mappa esplicita nome → componente.
 *
 * ⚠️ NON usare `import * as Icons from 'lucide-react'`: includerebbe l'INTERA
 * libreria di icone nel bundle (~850 kB) invece delle sole icone usate qui.
 */
const ICONS: Record<string, LucideIcon> = {
  Award,
  Binary,
  Calculator,
  Cog,
  Crown,
  Diff,
  Flame,
  Globe,
  Settings,
  Sigma,
  Sparkles,
  Star,
  Target,
  Trophy,
  Type,
  Zap,
};

/** Griglia dei traguardi: sbloccati a colori, ancora da prendere in grigio. */
export function BadgeGrid({ earned, t }: { earned: string[]; t: Tfn }) {
  return (
    <div className="badge-grid">
      {BADGES.map((b) => {
        const has = earned.includes(b.id);
        const Icon = ICONS[b.icon] ?? Award;
        return (
          <div key={b.id} className={`badge-item ${has ? 'earned' : 'locked'}`} title={t(b.descKey)}>
            <div className="badge-medal" aria-hidden>
              <Icon size={24} />
            </div>
            <p className="badge-name">{t(b.nameKey)}</p>
            <p className="badge-desc">{t(b.descKey)}</p>
          </div>
        );
      })}
    </div>
  );
}
