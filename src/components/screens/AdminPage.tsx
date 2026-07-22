import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, LogIn, Download, Save, Radio, Eye, RefreshCw } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { authFetch } from '../../lib/auth';
import { fmtGrade, fmtDateTime, fmtClock } from '../../lib/format';
import { moduleLabel } from '../../lib/exerciseText';
import { MODULES, type ModuleKey, type Difficulty } from '../../../shared/exercises/generator';
import { DEFAULT_CLASS, DEFAULT_CONFIG, type ExamConfig } from '../../../shared/exam/config';

type Tab = 'config' | 'results' | 'live';

interface ClassConfigRow {
  class: string;
  config: ExamConfig;
  updated_at: string;
}

interface ResultRow {
  id: string;
  name: string;
  email: string;
  class: string | null;
  grade: number | null;
  correct_count: number;
  total_count: number;
  away_events: number;
  submitted_at: string | null;
}

interface LiveRow {
  id: string;
  name: string;
  email: string;
  class: string | null;
  away_events: number;
  remainingMs: number;
  last_seen_at: string;
}

export function AdminPage() {
  const { t } = useI18n();
  const { user, loading, isTeacher, login } = useAuth();
  const [tab, setTab] = useState<Tab>('config');

  const back = (
    <div className="breadcrumb">
      <Link to="/">
        <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {t('common.home')}
      </Link>
    </div>
  );

  // Finché l'identità non è risolta non si può decidere nulla: senza questo
  // gate la console si montava (e chiamava le API docente) anche a chi non lo è.
  if (loading) {
    return (
      <AppShell back={back}>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell back={back}>
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
      <AppShell back={back}>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.teacherOnly')}</h2>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back={back}>
      <div className="module module-wide">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Users size={24} />
            </span>
            {t('admin.title')}
          </h1>
        </div>

        <div className="admin-tabs">
          <button className={`btn btn-sm ${tab === 'config' ? '' : 'btn-secondary'}`} onClick={() => setTab('config')} type="button">
            {t('admin.tabConfig')}
          </button>
          <button className={`btn btn-sm ${tab === 'results' ? '' : 'btn-secondary'}`} onClick={() => setTab('results')} type="button">
            {t('admin.tabResults')}
          </button>
          <button className={`btn btn-sm ${tab === 'live' ? '' : 'btn-secondary'}`} onClick={() => setTab('live')} type="button">
            {t('admin.tabLive')}
          </button>
        </div>

        {tab === 'config' && <ConfigTab t={t} />}
        {tab === 'results' && <ResultsTab t={t} />}
        {tab === 'live' && <LiveTab t={t} />}
      </div>
    </AppShell>
  );
}

type Tfn = (k: string, v?: Record<string, string | number>) => string;

/**
 * Stato di attesa di una scheda della console.
 *
 * ⚠️ Un errore del server DEVE restare visibile: prima un 500 (per esempio
 * tabelle `bc_*` non ancora migrate) lasciava "Caricamento…" per sempre e la
 * console sembrava semplicemente morta, senza alcun indizio sulla causa.
 */
function LoadState({ t, error, onRetry }: { t: Tfn; error: string | null; onRetry: () => void }) {
  if (!error) return <p>{t('common.loading')}</p>;
  return (
    <div className="feedback ko" style={{ display: 'block' }}>
      <strong>{t('errors.loadFailed')}</strong>
      <p className="mono" style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.85rem', wordBreak: 'break-word' }}>{error}</p>
      <button className="btn btn-sm btn-secondary" type="button" onClick={onRetry}>
        <RefreshCw size={14} /> {t('errors.retry')}
      </button>
    </div>
  );
}

function ConfigTab({ t }: { t: Tfn }) {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassConfigRow[]>([]);
  const [defaults, setDefaults] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [examsEnabled, setExamsEnabled] = useState(true);
  const [selected, setSelected] = useState<string>(DEFAULT_CLASS);
  const [draft, setDraft] = useState<ExamConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Si carica UNA sola volta. Prima `load` dipendeva da `selected`, quindi ogni
  // lettera digitata nel campo "classe nuova" rileggeva dal server e sovrascriveva
  // la configurazione che il docente stava componendo.
  const load = useCallback(async () => {
    setError(null);
    const res = await authFetch<{ classes: ClassConfigRow[]; examsEnabled: boolean; defaults: ExamConfig }>('/api/teacher/config');
    if (!res.ok || !res.data) {
      setError(res.error ?? `HTTP ${res.status}`);
      return;
    }
    const data = res.data;
    setClasses(data.classes);
    setExamsEnabled(data.examsEnabled);
    setDefaults(data.defaults);
    setDraft((prev) => prev ?? data.classes.find((c) => c.class === DEFAULT_CLASS)?.config ?? data.defaults);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const res = await authFetch<{ classes: ClassConfigRow[] }>('/api/teacher/config', {
      method: 'PUT',
      body: JSON.stringify({ class: selected, config: draft, examsEnabled }),
    });
    setSaving(false);
    if (res.ok) {
      toast(t('admin.saved'), 'success');
      if (res.data?.classes) setClasses(res.data.classes);
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  if (!draft) {
    return (
      <div className="card">
        <LoadState t={t} error={error} onRetry={() => void load()} />
      </div>
    );
  }

  const toggleModule = (m: ModuleKey) => {
    const has = draft.modules.includes(m);
    const next = has ? draft.modules.filter((x) => x !== m) : [...draft.modules, m];
    setDraft({ ...draft, modules: next.length ? next : draft.modules });
  };

  return (
    <div className="card">
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={examsEnabled}
            onChange={(e) => setExamsEnabled(e.target.checked)}
            style={{ width: 'auto', marginRight: 8 }}
          />
          {t('admin.examEnabled')} (globale)
        </label>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="adm-class">{t('admin.classLabel')}</label>
          <select
            id="adm-class"
            value={selected}
            onChange={(e) => {
              const v = e.target.value;
              setSelected(v);
              const existing = classes.find((c) => c.class === v);
              setDraft(existing ? existing.config : defaults);
            }}
          >
            <option value={DEFAULT_CLASS}>{t('admin.defaultClass')}</option>
            {classes.filter((c) => c.class !== DEFAULT_CLASS).map((c) => (
              <option key={c.class} value={c.class}>
                {c.class}
              </option>
            ))}
          </select>
          <p className="hint" style={{ marginTop: 6 }}>
            Puoi digitare una classe nuova nel campo qui sotto.
          </p>
          <input
            value={selected === DEFAULT_CLASS ? '' : selected}
            onChange={(e) => {
              const v = e.target.value.trim() || DEFAULT_CLASS;
              setSelected(v);
              // Se la classe digitata ha già una configurazione, la mostro invece
              // di lasciar salvare per sbaglio quella attualmente a schermo.
              const existing = classes.find((c) => c.class === v);
              if (existing) setDraft(existing.config);
            }}
            placeholder="es. 3A"
            style={{ marginTop: 4 }}
          />
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              style={{ width: 'auto', marginRight: 8 }}
            />
            {t('admin.examEnabled')} ({t('admin.classLabel').toLowerCase()})
          </label>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="adm-dur">{t('admin.examDuration')}</label>
          <input
            id="adm-dur"
            type="number"
            min={1}
            max={240}
            value={draft.durationMin}
            onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="adm-q">{t('admin.examQuestions')}</label>
          <input
            id="adm-q"
            type="number"
            min={1}
            max={50}
            value={draft.questionCount}
            onChange={(e) => setDraft({ ...draft, questionCount: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field">
        <label>{t('admin.modules')}</label>
        <div className="row row-wrap" style={{ gap: '0.4rem' }}>
          {MODULES.map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${draft.modules.includes(m) ? ' primary' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleModule(m)}
              aria-pressed={draft.modules.includes(m)}
            >
              {moduleLabel(m, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('admin.difficulty')}</label>
          <div className="segmented">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                className={draft.difficulty === d ? 'active' : ''}
                onClick={() => setDraft({ ...draft, difficulty: d })}
              >
                {t(`gym.${d}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="adm-pass">{t('admin.passThreshold')}</label>
          <input
            id="adm-pass"
            type="number"
            min={0}
            max={10}
            step={0.25}
            value={draft.passGrade}
            onChange={(e) => setDraft({ ...draft, passGrade: Number(e.target.value) })}
          />
        </div>
      </div>

      <button className="btn" type="button" onClick={save} disabled={saving}>
        <Save size={16} /> {saving ? t('common.loading') : t('admin.saveConfig')}
      </button>
    </div>
  );
}

function ResultsTab({ t }: { t: Tfn }) {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [cls, setCls] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    // Piccolo ritardo: filtrando per classe si digita, e senza questo partiva
    // una query al database a ogni tasto.
    const timer = setTimeout(() => {
      void (async () => {
        setError(null);
        const res = await authFetch<{ results: ResultRow[] }>(`/api/teacher/results${cls ? `?class=${encodeURIComponent(cls)}` : ''}`);
        if (!alive) return;
        if (res.ok && res.data) setRows(res.data.results);
        else setError(res.error ?? `HTTP ${res.status}`);
      })();
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cls, reload]);

  return (
    <div className="card">
      <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <input
          value={cls}
          onChange={(e) => setCls(e.target.value)}
          placeholder={t('admin.classLabel')}
          style={{ maxWidth: 200 }}
        />
        <a className="btn btn-sm btn-secondary" href={`/api/teacher/results?format=csv${cls ? `&class=${encodeURIComponent(cls)}` : ''}`}>
          <Download size={15} /> {t('admin.exportCsv')}
        </a>
      </div>

      {!rows || error ? (
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      ) : rows.length === 0 ? (
        <p className="hint">{t('admin.noResults')}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.student')}</th>
                <th>{t('admin.classLabel')}</th>
                <th>{t('admin.grade')}</th>
                <th>{t('exam.reviewTitle')}</th>
                <th>{t('admin.awayEvents')}</th>
                <th>{t('admin.when')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    <br />
                    <span className="hint">{r.email}</span>
                  </td>
                  <td>{r.class ?? '—'}</td>
                  <td className="mono" style={{ fontWeight: 700, color: (r.grade ?? 0) >= 6 ? 'var(--success)' : 'var(--error)' }}>
                    {fmtGrade(r.grade)}
                  </td>
                  <td className="mono">
                    {r.correct_count}/{r.total_count}
                  </td>
                  <td className="mono" style={{ color: r.away_events > 0 ? 'var(--error)' : undefined }}>
                    {r.away_events}
                  </td>
                  <td>{fmtDateTime(r.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiveTab({ t }: { t: Tfn }) {
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await authFetch<{ live: LiveRow[] }>('/api/teacher/live');
      if (!alive) return;
      if (res.ok && res.data) {
        setRows(res.data.live);
        setError(null);
      } else {
        setError(res.error ?? `HTTP ${res.status}`);
      }
    };
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [reload]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: '1rem' }}>
        <Radio size={18} color="var(--primary)" />
        <strong>{t('admin.onlineNow')}</strong>
        <span className="hint">(aggiornamento ogni 15 s)</span>
      </div>
      {/* Se un aggiornamento periodico fallisce tengo a schermo l'ultimo elenco
          valido — durante una verifica sparire di colpo sarebbe peggio — e
          segnalo il problema sopra la tabella. */}
      {rows && error && (
        <p className="hint" style={{ color: 'var(--error)' }}>
          {t('errors.loadFailed')} — {error}
        </p>
      )}
      {!rows ? (
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      ) : rows.length === 0 ? (
        <p className="hint">{t('admin.noResults')}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.student')}</th>
              <th>{t('admin.classLabel')}</th>
              <th>{t('exam.timeLeft')}</th>
              <th>{t('admin.awayEvents')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}
                  <br />
                  <span className="hint">{r.email}</span>
                </td>
                <td>{r.class ?? '—'}</td>
                <td className="mono">{fmtClock(r.remainingMs)}</td>
                <td className="mono" style={{ color: r.away_events > 0 ? 'var(--error)' : undefined }}>
                  <Eye size={14} style={{ verticalAlign: '-2px' }} /> {r.away_events}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
