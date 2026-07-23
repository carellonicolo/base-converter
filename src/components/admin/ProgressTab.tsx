import { useEffect, useMemo, useState } from 'react';
import { Trophy, Flame, ChevronDown, TrendingUp, CheckCircle2, Award, Activity } from 'lucide-react';
import { LoadState } from '../ui/LoadState';
import { authFetch } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
import { moduleLabel } from '../../lib/exerciseText';
import { coerceProgress, levelFromXp, totals, BADGES, type Progress } from '../../lib/progress';
import { MODULES } from '../../../shared/exercises/generator';

type Tfn = (k: string, v?: Record<string, string | number>) => string;

interface StudentRaw {
  userId: string;
  name: string;
  email: string;
  classes: string[];
  progress: unknown;
  updatedAt: string;
}

interface StudentStat {
  userId: string;
  name: string;
  email: string;
  classes: string[];
  updatedAt: string;
  progress: Progress;
  level: number;
  xp: number;
  solved: number;
  attempts: number;
  accuracy: number;
  badges: string[];
}

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ALL = '__all__';

export function ProgressTab({ t, now }: { t: Tfn; now: number }) {
  const [raw, setRaw] = useState<StudentRaw[] | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [cls, setCls] = useState<string>(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setError(null);
      const res = await authFetch<{ students: StudentRaw[]; classes: string[] }>('/api/teacher/progress');
      if (!alive) return;
      if (res.ok && res.data) {
        setRaw(res.data.students);
        setClasses(res.data.classes);
      } else {
        setError(res.error ?? `HTTP ${res.status}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  // Studenti della classe scelta, con la matematica di livello/precisione
  // calcolata qui (stesse funzioni dello studente) e ordinati per XP.
  const students = useMemo<StudentStat[]>(() => {
    if (!raw) return [];
    const filtered = cls === ALL ? raw : raw.filter((s) => s.classes.includes(cls));
    return filtered
      .map((s) => {
        const progress = coerceProgress(s.progress);
        const tt = totals(progress);
        return {
          userId: s.userId,
          name: s.name,
          email: s.email,
          classes: s.classes,
          updatedAt: s.updatedAt,
          progress,
          level: levelFromXp(progress.xp),
          xp: progress.xp,
          solved: tt.correct,
          attempts: tt.attempts,
          accuracy: tt.accuracy,
          badges: progress.badges,
        };
      })
      .sort((a, b) => b.xp - a.xp || b.solved - a.solved);
  }, [raw, cls]);

  const dash = useMemo(() => {
    if (!students.length) return null;
    const avgLevel = students.reduce((s, x) => s + x.level, 0) / students.length;
    const totalSolved = students.reduce((s, x) => s + x.solved, 0);
    const active = students.filter((x) => now - new Date(x.updatedAt).getTime() <= ACTIVE_WINDOW_MS).length;
    // Badge più diffuso nella selezione.
    const counts = new Map<string, number>();
    for (const s of students) for (const b of s.badges) counts.set(b, (counts.get(b) ?? 0) + 1);
    let topBadge: { id: string; n: number } | null = null;
    for (const [id, n] of counts) if (!topBadge || n > topBadge.n) topBadge = { id, n };
    const topBadgeDef = topBadge ? BADGES.find((b) => b.id === topBadge!.id) : null;
    return { avgLevel, totalSolved, active, topBadgeName: topBadgeDef ? t(topBadgeDef.nameKey) : '—', topBadgeN: topBadge?.n ?? 0 };
  }, [students, now, t]);

  if (!raw || error) {
    return (
      <div className="card">
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  const podium = students.slice(0, 3);
  const maxXp = students[0]?.xp || 1;

  return (
    <div>
      {/* Selettore classe */}
      <div className="card" style={{ paddingBottom: '1rem' }}>
        <div className="row row-wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <p className="hint" style={{ margin: 0 }}>{t('prog.lead')}</p>
          <div className="field" style={{ margin: 0, minWidth: 180 }}>
            <select value={cls} onChange={(e) => { setCls(e.target.value); setOpenId(null); }} aria-label={t('admin.classLabel')}>
              <option value={ALL}>{t('prog.allClasses')}</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="card">
          <p className="hint">{t('prog.empty')}</p>
        </div>
      ) : (
        <>
          {/* Cruscotto */}
          {dash && (
            <div className="prog-dash">
              <DashTile icon={<TrendingUp size={18} />} value={dash.avgLevel.toFixed(1)} label={t('prog.avgLevel')} />
              <DashTile icon={<CheckCircle2 size={18} />} value={String(dash.totalSolved)} label={t('prog.totalSolved')} />
              <DashTile icon={<Activity size={18} />} value={`${dash.active}/${students.length}`} label={t('prog.active')} />
              <DashTile icon={<Award size={18} />} value={dash.topBadgeName} label={t('prog.topBadge')} small />
            </div>
          )}

          {/* Podio */}
          {podium.length >= 1 && (
            <div className="card">
              <h2 className="prog-h2"><Trophy size={18} /> {t('prog.podium')}</h2>
              <div className="podium">
                {orderPodium(podium).map((s) => (
                  <PodiumSpot key={s.userId} student={s} rank={students.indexOf(s) + 1} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* Classifica */}
          <div className="card">
            <h2 className="prog-h2"><Trophy size={18} /> {t('prog.leaderboard')}</h2>
            <div className="rank-list">
              {students.map((s, i) => (
                <RankRow
                  key={s.userId}
                  student={s}
                  rank={i + 1}
                  maxXp={maxXp}
                  open={openId === s.userId}
                  onToggle={() => setOpenId((cur) => (cur === s.userId ? null : s.userId))}
                  showClass={cls === ALL}
                  t={t}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashTile({ icon, value, label, small }: { icon: React.ReactNode; value: string; label: string; small?: boolean }) {
  return (
    <div className="prog-dash-tile">
      <div className="prog-dash-icon" aria-hidden>{icon}</div>
      <div className="prog-dash-value" style={small ? { fontSize: '1rem' } : undefined}>{value}</div>
      <div className="prog-dash-label">{label}</div>
    </div>
  );
}

/** Ordina il podio come 2° · 1° · 3° per l'effetto scenografico. */
function orderPodium(top: StudentStat[]): StudentStat[] {
  if (top.length === 3) return [top[1], top[0], top[2]];
  if (top.length === 2) return [top[1], top[0]];
  return top;
}

function PodiumSpot({ student, rank, t }: { student: StudentStat; rank: number; t: Tfn }) {
  return (
    <div className={`podium-spot rank-${rank}`}>
      <div className="podium-medal" aria-hidden>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
      <div className="podium-name" title={student.name}>{student.name}</div>
      <div className="podium-block">
        <div className="podium-level">{t('gym.level')} {student.level}</div>
        <div className="podium-xp">{student.xp} XP</div>
      </div>
    </div>
  );
}

function RankRow({
  student,
  rank,
  maxXp,
  open,
  onToggle,
  showClass,
  t,
}: {
  student: StudentStat;
  rank: number;
  maxXp: number;
  open: boolean;
  onToggle: () => void;
  showClass: boolean;
  t: Tfn;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const earnedBadges = BADGES.filter((b) => student.badges.includes(b.id));
  return (
    <div className={`rank-row${open ? ' open' : ''}`}>
      <button className="rank-main" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="rank-pos">{medal ?? rank}</span>
        <span className="rank-id">
          <span className="rank-name">{student.name}</span>
          <span className="rank-sub">
            {showClass && student.classes.length > 0 && <span className="chip chip-mini">{student.classes.join(', ')}</span>}
            {student.email}
          </span>
        </span>
        <span className="rank-level">
          <span className="chip primary">{t('gym.level')} {student.level}</span>
        </span>
        <span className="rank-xp">
          <span className="rank-xp-bar"><span style={{ width: `${Math.round((student.xp / maxXp) * 100)}%` }} /></span>
          <span className="rank-xp-num">{student.xp} XP</span>
        </span>
        <span className="rank-metric mono">{student.solved}</span>
        <span className="rank-metric mono">{student.attempts ? Math.round(student.accuracy * 100) : 0}%</span>
        <span className="rank-badges"><Award size={14} /> {student.badges.length}</span>
        <ChevronDown size={16} className="rank-caret" />
      </button>

      {open && (
        <div className="rank-detail">
          <div className="rank-detail-grid">
            <div>
              <h4 className="rank-detail-h">{t('dash.byModule')}</h4>
              <table className="data-table compact">
                <tbody>
                  {MODULES.map((m) => {
                    const st = student.progress.byModule[m] ?? { attempts: 0, correct: 0 };
                    const acc = st.attempts ? Math.round((st.correct / st.attempts) * 100) : 0;
                    return (
                      <tr key={m}>
                        <td>{moduleLabel(m, t)}</td>
                        <td className="mono">{st.correct}/{st.attempts}</td>
                        <td className="mono" style={{ color: st.attempts ? (acc >= 70 ? 'var(--success)' : acc >= 40 ? undefined : 'var(--error)') : 'var(--muted)' }}>
                          {st.attempts ? `${acc}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="rank-detail-h">{t('gym.badges')} · {earnedBadges.length}/{BADGES.length}</h4>
              {earnedBadges.length === 0 ? (
                <p className="hint">{t('prog.noBadges')}</p>
              ) : (
                <div className="row row-wrap" style={{ gap: '0.4rem' }}>
                  {earnedBadges.map((b) => (
                    <span key={b.id} className="chip" title={t(b.descKey)}>{t(b.nameKey)}</span>
                  ))}
                </div>
              )}
              <p className="hint" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} /> {t('gym.streak')}: {student.progress.bestStreak} · {t('admin.when')}: {fmtDateTime(student.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
