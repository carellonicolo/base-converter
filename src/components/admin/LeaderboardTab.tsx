import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Flame } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../ui/Modal';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type ProgressStudentRaw } from '../../lib/teacherApi';
import { coerceProgress, levelFromXp, totals, BADGES, emptyProgress, type Progress } from '../../lib/progress';
import { moduleLabel } from '../../lib/exerciseText';
import { fmtDate } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText, instant } from '../../lib/sort';
import { MODULES } from '../../../shared/exercises/generator';
import { ClassPicker, NO_CLASS, StatTiles, TabHead, classLabel, groupByClass, useRememberedClass, type Tfn } from './common';

export interface RankRow {
  userId: string;
  name: string;
  email: string;
  classes: string[];
  updatedAt: string | null;
  progress: Progress;
  level: number;
  xp: number;
  solved: number;
  attempts: number;
  accuracy: number;
  /** Posto in classifica per XP; `null` per chi non ha ancora XP. */
  rank: number | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Col = 'rank' | 'student' | 'level' | 'xp' | 'solved' | 'accuracy' | 'streak' | 'badges' | 'last';

function columns(t: Tfn): SortColumn<RankRow, Col>[] {
  return [
    { key: 'rank', label: '#', value: (r) => r.rank },
    { key: 'student', label: t('admin.student'), value: (r) => surnameFirst(r.name) },
    { key: 'level', label: t('gym.level'), dir: 'desc', value: (r) => r.level },
    { key: 'xp', label: 'XP', dir: 'desc', value: (r) => r.xp },
    { key: 'solved', label: t('admin.solved'), dir: 'desc', value: (r) => r.solved },
    { key: 'accuracy', label: t('gym.accuracy'), dir: 'desc', value: (r) => (r.attempts ? r.accuracy : null) },
    { key: 'streak', label: t('admin.bestStreak'), dir: 'desc', value: (r) => r.progress.bestStreak },
    { key: 'badges', label: t('gym.badges'), dir: 'desc', value: (r) => r.progress.badges.length },
    { key: 'last', label: t('admin.lastTraining'), dir: 'desc', value: (r) => instant(r.updatedAt) },
  ];
}

const byName = (a: RankRow, b: RankRow) => compareText(surnameFirst(a.name), surnameFirst(b.name));

/** Le righe della classifica: matematica di livello e precisione con le funzioni dello studente. */
export function rankRows(raw: ProgressStudentRaw[]): RankRow[] {
  return raw
    .map((s) => {
      const progress = s.progress ? coerceProgress(s.progress) : emptyProgress();
      const tt = totals(progress);
      return {
        userId: s.userId,
        name: s.name,
        email: s.email,
        classes: s.classes,
        updatedAt: s.progress ? s.updatedAt : null,
        progress,
        level: levelFromXp(progress.xp),
        xp: progress.xp,
        solved: tt.correct,
        attempts: tt.attempts,
        accuracy: tt.accuracy,
        rank: null as number | null,
      };
    })
    .sort((a, b) => b.xp - a.xp || b.solved - a.solved || byName(a, b))
    .map((r, i) => ({ ...r, rank: r.xp > 0 ? i + 1 : null }));
}

/**
 * La palestra vista dal docente, come in VLSM: prima la classe, poi podio,
 * classifica per XP (ordinabile per ogni colonna), dove sbaglia la classe e
 * il dettaglio di ogni studente.
 */
export function LeaderboardTab() {
  const { t } = useI18n();
  const [raw, setRaw] = useState<ProgressStudentRaw[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cls, setCls] = useRememberedClass();
  const [detail, setDetail] = useState<RankRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await teacherApi.progress();
    setLoading(false);
    if (res.ok && res.data) {
      setRaw(res.data.students);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByClass(raw ?? []), [raw]);
  const openCls = raw && cls !== null && groups.some((g) => g.name === cls) ? cls : null;

  const rows = useMemo(() => {
    if (!raw || openCls === null) return [];
    return rankRows(raw.filter((s) => (openCls === NO_CLASS ? s.classes.length === 0 : s.classes.includes(openCls))));
  }, [raw, openCls]);

  const cols = useMemo(() => columns(t), [t]);
  const { sorted, header } = useSort(rows, cols, { column: 'xp', dir: 'desc' }, byName);

  const summary = useMemo(() => {
    if (!rows.length) return null;
    const now = Date.now();
    const sum = emptyProgress();
    for (const r of rows) {
      for (const m of MODULES) {
        sum.byModule[m].attempts += r.progress.byModule[m]?.attempts ?? 0;
        sum.byModule[m].correct += r.progress.byModule[m]?.correct ?? 0;
      }
    }
    return {
      active: rows.filter((r) => r.updatedAt && now - Date.parse(r.updatedAt) <= WEEK_MS).length,
      avgXp: Math.round(rows.reduce((s, r) => s + r.xp, 0) / rows.length),
      avgLevel: rows.reduce((s, r) => s + r.level, 0) / rows.length,
      solved: rows.reduce((s, r) => s + r.solved, 0),
      badges: rows.reduce((s, r) => s + r.progress.badges.length, 0),
      byModule: sum.byModule,
    };
  }, [rows]);

  const podium = rows.filter((r) => r.rank !== null).slice(0, 3);
  const maxXp = rows[0]?.xp || 1;

  return (
    <>
      <TabHead
        title={
          <span className="row" style={{ display: 'inline-flex' }}>
            <Trophy size={20} color="var(--primary)" />
            {openCls === null ? (
              t('admin.rankingTitle')
            ) : (
              <>
                <button type="button" className="link-button" onClick={() => setCls(null)}>
                  {t('admin.rankingTitle')}
                </button>
                <span aria-hidden>›</span> {classLabel(openCls, t)}
              </>
            )}
          </span>
        }
        lead={openCls === null ? t('admin.rankingLead') : t('admin.rankingLeadClass')}
        actions={
          <>
            {openCls !== null && (
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setCls(null)}>
                <ArrowLeft size={14} /> {t('admin.classes')}
              </button>
            )}
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} /> {t('admin.refresh')}
            </button>
          </>
        }
      />

      {!raw ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : openCls === null ? (
        groups.length === 0 ? (
          <div className="card hint">{t('prog.empty')}</div>
        ) : (
          <ClassPicker groups={groups} onPick={setCls} />
        )
      ) : (
        summary && (
          <>
            <StatTiles
              tiles={[
                { label: t('prog.active'), value: `${summary.active}/${rows.length}` },
                { label: t('admin.avgXp'), value: summary.avgXp.toLocaleString('it-IT'), tone: 'good' },
                { label: t('prog.avgLevel'), value: summary.avgLevel.toLocaleString('it-IT', { maximumFractionDigits: 1 }) },
                { label: t('prog.totalSolved'), value: String(summary.solved) },
                { label: t('admin.badgesTaken'), value: String(summary.badges) },
              ]}
            />

            {podium.length > 0 && (
              <div className="card">
                <h3 className="section-h" style={{ marginTop: 0 }}>
                  <Trophy size={18} /> {t('prog.podium')}
                </h3>
                <div className="podium">
                  {(podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium.length === 2 ? [podium[1], podium[0]] : podium).map((s) => (
                    <div key={s.userId} className={`podium-spot rank-${s.rank}`}>
                      <div className="podium-medal" aria-hidden>
                        {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="podium-name" title={surnameFirst(s.name)}>
                        {surnameFirst(s.name)}
                      </div>
                      <div className="podium-block">
                        <div className="podium-level">
                          {t('gym.level')} {s.level}
                        </div>
                        <div className="podium-xp">{s.xp} XP</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>{t('prog.leaderboard')}</h3>
              <p className="hint" style={{ marginTop: 0 }}>{t('admin.rankingHint')}</p>
              <div className="table-wrap">
                <table className="result-table rank-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <ThSort key={c.key} {...header(c.key)} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr
                        key={r.userId}
                        className="row-link"
                        tabIndex={0}
                        role="button"
                        aria-label={t('admin.gymOf', { name: surnameFirst(r.name) })}
                        onClick={() => setDetail(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetail(r);
                          }
                        }}
                      >
                        <td className="rank-pos">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank ?? '—'}</td>
                        <td className="rank-name">{surnameFirst(r.name)}</td>
                        <td>
                          <span className="chip primary">{r.level}</span>
                        </td>
                        <td>
                          <span className="xp-cell">
                            <span className="rank-xp-bar">
                              <span style={{ width: `${Math.round((r.xp / maxXp) * 100)}%` }} />
                            </span>
                            <strong className="mono">{r.xp.toLocaleString('it-IT')}</strong>
                          </span>
                        </td>
                        <td className="mono">
                          {r.solved}
                          <span className="hint">/{r.attempts}</span>
                        </td>
                        <td className="mono">{r.attempts ? `${Math.round(r.accuracy * 100)}%` : '—'}</td>
                        <td className="mono">{r.progress.bestStreak}</td>
                        <td className="mono">
                          {r.progress.badges.length}
                          <span className="hint">/{BADGES.length}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.updatedAt ? fmtDate(r.updatedAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.classMistakes')}</h3>
              <ModuleRates byModule={summary.byModule} />
            </div>
          </>
        )
      )}

      {detail && (
        <Modal title={surnameFirst(detail.name)} onClose={() => setDetail(null)}>
          <GymDetail row={detail} />
        </Modal>
      )}
    </>
  );
}

/** Precisione per argomento, con una barra: dove si sbaglia di più. */
export function ModuleRates({ byModule }: { byModule: Progress['byModule'] }) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="result-table" style={{ marginBottom: 0 }}>
        <thead>
          <tr>
            <th>{t('dash.module')}</th>
            <th>{t('gym.accuracy')}</th>
            <th>{t('admin.correct')}</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m) => {
            const st = byModule[m] ?? { attempts: 0, correct: 0 };
            const pct = st.attempts ? Math.round((st.correct / st.attempts) * 100) : null;
            return (
              <tr key={m}>
                <td>{moduleLabel(m, t)}</td>
                <td>
                  {pct === null ? (
                    <span className="hint">—</span>
                  ) : (
                    <span className="rate">
                      <span className="rate-track">
                        <span className={`rate-fill${pct < 40 ? ' bad' : pct < 70 ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="rate-text">{pct}%</span>
                    </span>
                  )}
                </td>
                <td className="mono">
                  {st.correct}/{st.attempts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** La palestra di uno studente: livello, argomenti, traguardi. */
export function GymDetail({ row, contact = true }: { row: Pick<RankRow, 'email' | 'classes' | 'progress' | 'level' | 'xp' | 'updatedAt'>; contact?: boolean }) {
  const { t } = useI18n();
  const earned = BADGES.filter((b) => row.progress.badges.includes(b.id));
  return (
    <>
      {contact && (
        <p className="hint" style={{ marginTop: 0 }}>
          {row.email}
          {row.classes.length ? ` · ${row.classes.join(', ')}` : ''}
        </p>
      )}
      <StatTiles
        tiles={[
          { label: t('gym.level'), value: String(row.level), tone: 'good' },
          { label: 'XP', value: row.xp.toLocaleString('it-IT') },
          { label: t('admin.bestStreak'), value: String(row.progress.bestStreak) },
          { label: t('gym.badges'), value: `${earned.length}/${BADGES.length}` },
        ]}
      />
      <h3 className="section-h">{t('dash.byModule')}</h3>
      <ModuleRates byModule={row.progress.byModule} />
      <h3 className="section-h">
        {t('gym.badges')} · {earned.length}/{BADGES.length}
      </h3>
      {earned.length === 0 ? (
        <p className="hint">{t('prog.noBadges')}</p>
      ) : (
        <div className="row row-wrap" style={{ gap: '0.4rem' }}>
          {earned.map((b) => (
            <span key={b.id} className="chip" title={t(b.descKey)}>
              {t(b.nameKey)}
            </span>
          ))}
        </div>
      )}
      <p className="hint" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Flame size={14} /> {t('admin.lastTraining')}: {row.updatedAt ? fmtDate(row.updatedAt) : '—'}
      </p>
    </>
  );
}
