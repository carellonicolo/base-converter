import { useEffect, useState } from 'react';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { BadgeGrid } from '../ui/BadgeGrid';
import { LoadState } from '../ui/LoadState';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { loadProgress, saveProgress, levelInfo, totals, type Progress } from '../../lib/progress';
import { pullProgress } from '../../lib/sync';
import { moduleLabel } from '../../lib/exerciseText';
import { MODULES } from '../../../shared/exercises/generator';
import { authFetch } from '../../lib/auth';
import { fmtGrade, fmtDate } from '../../lib/format';

interface AttemptRow {
  id: string;
  grade: number | null;
  correct_count: number;
  total_count: number;
  submitted_at: string | null;
}

export function DashboardPage() {
  const { t } = useI18n();
  const { user, loading, login } = useAuth();
  const [progress, setProgress] = useState<Progress>(loadProgress);
  // `null` = non ancora caricato. Deve restare distinto dalla lista vuota:
  // prima partiva da [] e un errore di rete diventava "Nessuna verifica svolta",
  // cioè lo studente credeva di aver perso il compito appena consegnato.
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const merged = await pullProgress(loadProgress());
      if (!alive) return;
      setProgress(merged);
      saveProgress(merged);
      setError(null);
      const res = await authFetch<{ attempts: AttemptRow[] }>('/api/student/attempts');
      if (!alive) return;
      if (res.ok && res.data) setAttempts(res.data.attempts);
      else setError(res.error ?? `HTTP ${res.status}`);
    })();
    return () => {
      alive = false;
    };
  }, [user, reload]);

  const lvl = levelInfo(progress.xp);
  const tt = totals(progress);

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="gate">
          <div className="landing-hero-icon" aria-hidden>
            <LayoutDashboard size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{t('auth.loginNeeded')}</h1>
          <p className="hint">{t('auth.loginNeededBody')}</p>
          <button className="btn" type="button" onClick={login} style={{ marginTop: '1rem' }}>
            <LogIn size={16} /> {t('auth.goLogin')}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <LayoutDashboard size={24} />
            </span>
            {t('dash.title')}
          </h1>
          {user && <p>{t('dash.hello', { name: user.name || user.email })}</p>}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('dash.overall')}</h2>
          <div className="level-bar">
            <span className="chip primary">
              {t('gym.level')} {lvl.level}
            </span>
            <div className="level-track">
              <div className="level-fill" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
            </div>
            <span className="level-label">{t('gym.xpToNext', { xp: lvl.xpForNext, level: lvl.level + 1 })}</span>
          </div>
          <div className="stat-grid" style={{ marginBottom: 0 }}>
            <div className="stat-tile stat-good">
              <div className="stat-value">{progress.xp}</div>
              <div className="stat-label">XP</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{tt.correct}</div>
              <div className="stat-label">{t('gym.solved')}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{tt.attempts ? Math.round(tt.accuracy * 100) : 0}%</div>
              <div className="stat-label">{t('gym.accuracy')}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{progress.bestStreak}</div>
              <div className="stat-label">{t('gym.streak')}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('dash.byModule')}</h2>
          {tt.attempts === 0 ? (
            <p className="hint">{t('dash.noData')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dash.module')}</th>
                  <th>{t('gym.solved')}</th>
                  <th>{t('gym.accuracy')}</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => {
                  const s = progress.byModule[m] ?? { attempts: 0, correct: 0 };
                  const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
                  return (
                    <tr key={m}>
                      <td>{moduleLabel(m, t)}</td>
                      <td className="mono">
                        {s.correct}/{s.attempts}
                      </td>
                      <td className="mono" style={{ color: acc >= 80 ? 'var(--success)' : acc >= 50 ? undefined : 'var(--error)' }}>
                        {s.attempts ? `${acc}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('dash.recentExams')}</h2>
          {!attempts || error ? (
            <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
          ) : attempts.length === 0 ? (
            <p className="hint">{t('dash.noExams')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dash.date')}</th>
                  <th>{t('exam.grade')}</th>
                  <th>{t('exam.reviewTitle')}</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.submitted_at)}</td>
                    <td className="mono" style={{ color: (a.grade ?? 0) >= 6 ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                      {fmtGrade(a.grade)}
                    </td>
                    <td className="mono">
                      {a.correct_count}/{a.total_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('gym.badges')}</h2>
          <BadgeGrid earned={progress.badges} t={t} />
        </div>
      </div>
    </AppShell>
  );
}
