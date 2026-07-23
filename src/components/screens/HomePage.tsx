import { Link } from 'react-router-dom';
import {
  Binary,
  Calculator,
  Diff,
  Sigma,
  Type,
  Target,
  ClipboardCheck,
  LayoutDashboard,
  Lock,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';

interface Card {
  to: string;
  icon: LucideIcon;
  title: string;
  text: string;
  locked?: boolean;
  badge?: string;
}

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const tools: Card[] = [
    { to: '/convertitore', icon: Binary, title: t('home.convTitle'), text: t('home.convText') },
    { to: '/aritmetica', icon: Calculator, title: t('home.arithTitle'), text: t('home.arithText') },
    { to: '/segno', icon: Diff, title: t('home.signedTitle'), text: t('home.signedText') },
    { to: '/ieee754', icon: Sigma, title: t('home.ieeeTitle'), text: t('home.ieeeText') },
    { to: '/testo', icon: Type, title: t('home.textTitle'), text: t('home.textText') },
  ];

  const learn: Card[] = [
    { to: '/palestra', icon: Target, title: t('home.gymTitle'), text: t('home.gymText') },
    { to: '/verifica', icon: ClipboardCheck, title: t('home.examTitle'), text: t('home.examText'), badge: t('common.needLogin') },
  ];
  if (user) {
    learn.push({ to: '/dashboard', icon: LayoutDashboard, title: t('home.dashTitle'), text: t('home.dashText') });
  }
  // La console docente non compare qui: si raggiunge dal pulsante dedicato
  // nella barra in alto (carello-shell), così l'accesso è uno solo.

  return (
    <AppShell>
      <main className="landing">
        <div className="landing-intro">
          <div className="landing-hero-icon" aria-hidden>
            <Binary size={34} />
          </div>
          <h1 className="landing-title">{t('home.title')}</h1>
          <p className="landing-subtitle">{t('home.subtitle')}</p>
        </div>

        <h2 style={{ maxWidth: 1000, margin: '0 auto 0.75rem', fontSize: '1.05rem' }}>{t('home.startTools')}</h2>
        <div className="landing-grid" style={{ marginBottom: '2rem' }}>
          {tools.map((c) => (
            <HomeCard key={c.to} card={c} cta={t('common.open')} />
          ))}
        </div>

        <h2 style={{ maxWidth: 1000, margin: '0 auto 0.75rem', fontSize: '1.05rem' }}>{t('home.startLearn')}</h2>
        <div className="landing-grid">
          {learn.map((c) => (
            <HomeCard key={c.to} card={c} cta={t('common.open')} />
          ))}
        </div>
      </main>
    </AppShell>
  );
}

function HomeCard({ card, cta }: { card: Card; cta: string }) {
  const Icon = card.icon;
  return (
    <Link to={card.to} className={`landing-card${card.locked ? ' locked' : ''}`}>
      {card.badge && <span className="landing-card-badge">{card.badge}</span>}
      <div className="landing-card-icon" aria-hidden>
        {card.locked ? <Lock size={22} /> : <Icon size={22} />}
      </div>
      <h3 className="landing-card-title">{card.title}</h3>
      <p className="landing-card-text">{card.text}</p>
      <span className="landing-card-cta">
        {cta} <ArrowRight size={14} style={{ verticalAlign: '-2px' }} />
      </span>
    </Link>
  );
}
