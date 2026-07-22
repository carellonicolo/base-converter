import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Flame, LogIn, RefreshCw, GraduationCap } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { InfoBox } from '../ui/InfoBox';
import { BadgeGrid } from '../ui/BadgeGrid';
import { TutorPanel } from '../ui/TutorPanel';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import {
  generateSet,
  checkAnswer,
  MODULES,
  type Difficulty,
  type ModuleKey,
  type Exercise,
} from '../../../shared/exercises/generator';
import { exercisePrompt, expectedHint, moduleLabel } from '../../lib/exerciseText';
import {
  loadProgress,
  saveProgress,
  recordAttempt,
  levelInfo,
  totals,
  BADGES,
  type Progress,
} from '../../lib/progress';
import { pushProgress, pullProgress } from '../../lib/sync';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function GymPage() {
  const { t } = useI18n();
  const { user, login } = useAuth();
  const toast = useToast();

  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [modules, setModules] = useState<ModuleKey[]>([...MODULES]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<{ correct: boolean; expected: string } | null>(null);
  const [tutor, setTutor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const exercise: Exercise = useMemo(
    () => generateSet(modules, difficulty, 1, seed + index * 100003)[0],
    [modules, difficulty, seed, index]
  );

  useEffect(() => {
    if (!outcome) inputRef.current?.focus();
  }, [exercise, outcome]);

  // Al login: fonde i progressi del server con quelli locali (max per metrica),
  // così chi si allena su più dispositivi non perde nulla.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const merged = await pullProgress(loadProgress());
      if (!alive) return;
      setProgress(merged);
      saveProgress(merged);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const submit = useCallback(() => {
    if (outcome || answer.trim() === '') return;
    const correct = checkAnswer(exercise, answer);
    const res = recordAttempt(progress, exercise.module, correct, exercise.points);
    setProgress(res.progress);
    saveProgress(res.progress);
    setOutcome({ correct, expected: exercise.answer });
    if (res.newBadges.length) {
      for (const id of res.newBadges) {
        const def = BADGES.find((b) => b.id === id);
        if (def) toast(`${t('gym.badgeEarned')} ${t(def.nameKey)}`, 'success');
      }
    }
    if (user) void pushProgress(res.progress);
  }, [answer, exercise, outcome, progress, t, toast, user]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setAnswer('');
    setOutcome(null);
  }, []);

  const restart = () => {
    setSeed(Math.floor(Math.random() * 1_000_000_000));
    setIndex(0);
    setAnswer('');
    setOutcome(null);
  };

  const toggleModule = (m: ModuleKey) => {
    setModules((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      return next.length ? next : prev; // almeno un argomento attivo
    });
    setOutcome(null);
    setAnswer('');
  };

  const lvl = levelInfo(progress.xp);
  const tt = totals(progress);

  return (
    <AppShell
      back={
        <div className="breadcrumb">
          <Link to="/">
            <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {t('common.home')}
          </Link>
        </div>
      }
    >
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Target size={24} />
            </span>
            {t('gym.title')}
          </h1>
          <p>{t('gym.lead')}</p>
        </div>

        {/* Statistiche + livello */}
        <div className="card">
          <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="chip primary">
              {t('gym.level')} {lvl.level}
            </span>
            <span className="streak-chip">
              <Flame size={15} /> {progress.streak}
            </span>
          </div>
          <div className="level-bar">
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
          <p className="hint" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            {user ? (
              t('gym.savedLocal')
            ) : (
              <>
                {t('gym.loginToSave')}{' '}
                <button className="btn btn-sm btn-secondary" type="button" onClick={login} style={{ marginLeft: 6 }}>
                  <LogIn size={14} /> {t('common.login')}
                </button>
              </>
            )}
          </p>
        </div>

        {/* Impostazioni */}
        <div className="card">
          <div className="field">
            <label>{t('gym.chooseModule')}</label>
            <div className="row row-wrap" style={{ gap: '0.4rem' }}>
              {MODULES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip${modules.includes(m) ? ' primary' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleModule(m)}
                  aria-pressed={modules.includes(m)}
                >
                  {moduleLabel(m, t)}
                </button>
              ))}
            </div>
          </div>
          <div className="row row-wrap" style={{ justifyContent: 'space-between' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>{t('gym.difficulty')}</label>
              <div className="segmented">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    className={difficulty === d ? 'active' : ''}
                    onClick={() => {
                      setDifficulty(d);
                      setOutcome(null);
                      setAnswer('');
                    }}
                    type="button"
                  >
                    {t(`gym.${d}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="row" style={{ gap: '0.5rem', alignItems: 'flex-end' }}>
              <button
                type="button"
                className={`btn btn-sm ${tutor ? '' : 'btn-secondary'}`}
                onClick={() => setTutor((v) => !v)}
                aria-pressed={tutor}
                title={t('gym.tutorHint')}
              >
                <GraduationCap size={15} /> {t('gym.tutorMode')}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={restart}>
                <RefreshCw size={15} /> {t('common.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Esercizio */}
        <div className="card exercise-card">
          <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="chip">{moduleLabel(exercise.module, t)}</span>
            <span className="chip">
              {exercise.points} {exercise.points === 1 ? 'punto' : 'punti'}
            </span>
          </div>

          <p className="exercise-prompt">{exercisePrompt(exercise, t)}</p>

          <div className="field">
            <label htmlFor="gym-answer">{t('gym.yourAnswer')}</label>
            <div className="answer-row">
              <input
                id="gym-answer"
                ref={inputRef}
                className="mono"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (outcome) next();
                    else submit();
                  }
                }}
                disabled={!!outcome}
                spellCheck={false}
                autoComplete="off"
              />
              <span className="chip">{expectedHint(exercise)}</span>
            </div>
          </div>

          {!outcome ? (
            <button className="btn" type="button" onClick={submit} disabled={answer.trim() === ''}>
              {t('common.check')}
            </button>
          ) : (
            <>
              <div className={`feedback ${outcome.correct ? 'ok' : 'ko'}`}>
                {outcome.correct ? t('gym.correct') : t('gym.wrong', { answer: outcome.expected })}
              </div>
              <button className="btn" type="button" onClick={next} style={{ marginTop: '1rem' }} autoFocus>
                {t('gym.nextExercise')}
              </button>
            </>
          )}

          {tutor && <TutorPanel exercise={exercise} t={t} />}
        </div>

        {/* Traguardi */}
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('gym.badges')}</h2>
          <BadgeGrid earned={progress.badges} t={t} />
        </div>

        <InfoBox title={t('gym.tutorMode')} tone="tip" collapsedByDefault>
          <p>{t('gym.tutorHint')}</p>
        </InfoBox>
      </div>
    </AppShell>
  );
}
