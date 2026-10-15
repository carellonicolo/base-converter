import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, LogIn, Send, Activity, History, BarChart3, Trophy, Library, Home, LogOut } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { SidebarShell } from '../ui/SidebarShell';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { teacherApi } from '../../lib/teacherApi';
import { AssignTab } from '../admin/AssignTab';
import { LiveTab } from '../admin/LiveTab';
import { HistoryTab } from '../admin/HistoryTab';
import { ResultsTab } from '../admin/ResultsTab';
import { LeaderboardTab } from '../admin/LeaderboardTab';
import { StudentsTab } from '../admin/StudentsTab';
import { CatalogTab } from '../admin/CatalogTab';

type Tab = 'assign' | 'live' | 'history' | 'results' | 'ranking' | 'students' | 'catalog';

const TABS: { id: Tab; icon: ReactNode }[] = [
  { id: 'assign', icon: <Send size={18} /> },
  { id: 'live', icon: <Activity size={18} /> },
  { id: 'history', icon: <History size={18} /> },
  { id: 'results', icon: <BarChart3 size={18} /> },
  { id: 'ranking', icon: <Trophy size={18} /> },
  { id: 'students', icon: <Users size={18} /> },
  { id: 'catalog', icon: <Library size={18} /> },
];

const isTab = (v: string | null): v is Tab => TABS.some((x) => x.id === v);

/**
 * Console docente, sullo stesso schema di VLSM e CCNA1: una barra laterale
 * con le schede, il contenuto a destra.
 *
 * La scheda aperta (e la sessione dello Storico) sta nell'indirizzo:
 * `/admin?tab=history&session=<id>`. Così un ricaricamento non riporta
 * all'inizio, e una sessione si può riaprire da un segnalibro.
 */
export function AdminPage() {
  const { t } = useI18n();
  const { user, loading, isTeacher, login, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [liveCount, setLiveCount] = useState(0);

  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'assign';
  const go = useCallback(
    (next: Tab, extra: Record<string, string> = {}) => setParams({ tab: next, ...extra }),
    [setParams]
  );

  // Il numero sulla voce «Sessioni live», anche quando la scheda è chiusa.
  useEffect(() => {
    if (!isTeacher || tab === 'live') return;
    let alive = true;
    const load = async () => {
      const res = await teacherApi.live();
      if (alive && res.ok && res.data) setLiveCount(res.data.live.length);
    };
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isTeacher, tab]);

  if (loading) {
    return (
      <AppShell>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="gate">
          <div className="landing-hero-icon" aria-hidden>
            <Users size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{t('auth.loginNeeded')}</h1>
          <button className="btn" type="button" onClick={login} style={{ marginTop: '1rem' }}>
            <LogIn size={16} /> {t('auth.goLogin')}
          </button>
        </div>
      </AppShell>
    );
  }

  if (!isTeacher) {
    return (
      <AppShell>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.teacherOnly')}</h2>
        </div>
      </AppShell>
    );
  }

  const footer = (
    <>
      <button className="sidebar-item" type="button" onClick={() => navigate('/')}>
        <Home size={18} />
        <span>{t('common.home')}</span>
      </button>
      <button className="sidebar-item" type="button" onClick={logout}>
        <LogOut size={18} />
        <span>{t('admin.logout')}</span>
      </button>
    </>
  );

  return (
    <AppShell nav={false}>
      <SidebarShell
        groupLabel={t('admin.title')}
        footer={footer}
        items={TABS.map((x) => ({
          id: x.id,
          label: t(`admin.tab_${x.id}`),
          icon: x.icon,
          badge: x.id === 'live' ? liveCount || undefined : undefined,
          active: tab === x.id,
          onClick: () => go(x.id),
        }))}
      >
        {tab === 'assign' && (
          <AssignTab preselect={params.get('exam')} preselectStudent={params.get('student')} onOpenSession={(id) => go('history', { session: id })} />
        )}
        {tab === 'live' && <LiveTab onCount={setLiveCount} />}
        {tab === 'history' && <HistoryTab sessionId={params.get('session')} onOpen={(id) => go('history', id ? { session: id } : {})} />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'ranking' && <LeaderboardTab />}
        {tab === 'students' && <StudentsTab onAssignTo={(id) => go('assign', { student: id })} />}
        {tab === 'catalog' && <CatalogTab onAssign={(id) => go('assign', { exam: id })} />}
      </SidebarShell>
    </AppShell>
  );
}
