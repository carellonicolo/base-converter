// @vitest-environment jsdom
/**
 * La console docente nuova: barra laterale, Assegna (classe o studente, con
 * finestra), Sessioni live con gli interventi, Storico con il recupero per
 * gli assenti, Classifica, Studenti, Catalogo — senza SSO reale, con le
 * Function simulate.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider } from '../i18n';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/Confirm';
import { AuthProvider } from '../hooks/useAuth';
import { AdminPage } from '../components/screens/AdminPage';
import { EXAMS } from '../../shared/exam/catalog';
import { configFromSpec, buildExam, gradeExam } from '../../shared/exam/config';

const TEACHER = { id: 'u1', email: 'prof@example.it', name: 'Prof', status: 'active', isTeacher: true, isSuperAdmin: false, classes: [] };
const NOW = new Date().toISOString();
const inMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const mod = (correct: number, attempts: number) => ({ attempts, correct });
const emptyMods = { converter: mod(0, 0), arithmetic: mod(0, 0), signed: mod(0, 0), ieee: mod(0, 0), text: mod(0, 0) };

/** Tre studenti con XP crescenti, così l'ordinamento e il podio sono verificabili. */
const PROGRESS = {
  classes: ['3A', '3B'],
  students: [
    {
      userId: 's-carla', name: 'Carla Bassi', email: 'carla@s.it', classes: ['3A'], updatedAt: '2026-07-20T10:00:00Z',
      progress: { xp: 300, streak: 0, bestStreak: 4, badges: ['firstStep'], byModule: { ...emptyMods, converter: mod(10, 12) }, updatedAt: '' },
    },
    {
      userId: 's-aldo', name: 'Aldo Rossi', email: 'aldo@s.it', classes: ['3A'], updatedAt: '2026-07-22T10:00:00Z',
      progress: { xp: 1200, streak: 0, bestStreak: 12, badges: ['firstStep', 'ten', 'streak10'], byModule: { ...emptyMods, converter: mod(30, 33) }, updatedAt: '' },
    },
    {
      userId: 's-bruno', name: 'Bruno Verdi', email: 'bruno@s.it', classes: ['3B'], updatedAt: '2026-07-21T10:00:00Z',
      progress: { xp: 700, streak: 0, bestStreak: 6, badges: ['firstStep', 'ten'], byModule: { ...emptyMods, signed: mod(20, 25) }, updatedAt: '' },
    },
  ],
};

const exam = (id: string) => {
  const s = EXAMS.find((e) => e.id === id)!;
  return { id: s.id, topic: s.topic, level: s.level, questionCount: s.questionCount, durationMin: s.durationMin, passGrade: s.passGrade };
};

const session = (over: Record<string, unknown>) => ({
  id: 'sess', examId: 'binary-1', exam: exam('binary-1'), missing: false, class: '3A', targetType: 'class', studentId: null, studentName: null,
  status: 'open', state: 'open', openUntil: inMin(40), reopenedAt: null, durationMin: 30, createdBy: 'prof@example.it', createdAt: NOW, updatedAt: NOW,
  attempts: 1, submitted: 1, live: 0, annulled: 0, avgGrade: 8, passed: 1, enrolled: 2, ...over,
});

const SESSIONS = [
  session({ id: 'aperta' }),
  session({ id: 'chiusa', examId: 'hex-2', exam: exam('hex-2'), class: '3B', status: 'closed', state: 'closed', openUntil: inMin(-60), createdAt: '2026-10-01T08:00:00Z', avgGrade: 5.5, passed: 0 }),
];

const attempt = (over: Record<string, unknown>) => ({
  id: 'p1', studentId: 's-aldo', name: 'Aldo Rossi', email: 'aldo@s.it', class: '3B', assignmentId: 'chiusa', examId: 'hex-2', exam: exam('hex-2'),
  state: 'consegnata', grade: 5.5, score: 6.5, maxScore: 12, correctCount: 6, totalCount: 12, awayEvents: 2, awayMs: 15000, fullscreenExits: 1, warnings: 0,
  startedAt: '2026-10-01T08:05:00Z', deadlineAt: '2026-10-01T08:45:00Z', submittedAt: '2026-10-01T08:40:00Z', lastSeenAt: '2026-10-01T08:40:00Z',
  submitReason: 'volontaria', annulledReason: null, ...over,
});

const STUDENTS = [
  { id: 's-aldo', name: 'Aldo Rossi', email: 'aldo@s.it', status: 'active', classes: ['3A'], lastLoginAt: NOW, submitted: 2, annulled: 0, live: 0, avgGrade: 7.25, lastExamAt: NOW, xp: 1200, gymAt: NOW },
  { id: 's-carla', name: 'Carla Bassi', email: 'carla@s.it', status: 'active', classes: ['3A'], lastLoginAt: null, submitted: 0, annulled: 0, live: 0, avgGrade: null, lastExamAt: null, xp: null, gymAt: null },
  { id: 's-bruno', name: 'Bruno Verdi', email: 'bruno@s.it', status: 'active', classes: ['3B'], lastLoginAt: null, submitted: 1, annulled: 0, live: 0, avgGrade: 5.5, lastExamAt: NOW, xp: 700, gymAt: NOW },
];

const calls: { url: string; method: string; body: unknown }[] = [];

function stubFetch() {
  calls.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
      const q = new URL(url, 'http://x').searchParams;

      if (url.includes('/api/profile')) return json({ user: TEACHER });
      if (url.includes('/api/teacher/exams') && q.get('id')) {
        const spec = EXAMS.find((e) => e.id === q.get('id'))!;
        const questions = buildExam(configFromSpec(spec), 7).map((ex, i) => ({ index: i, module: ex.module, kind: ex.kind, params: ex.params, points: ex.points, answer: ex.answer }));
        return json({ exam: spec, seed: 7, questions });
      }
      if (url.includes('/api/teacher/exams')) return json({ exams: EXAMS });
      if (url.includes('/api/teacher/classes')) return json({ classes: ['3A', '3B'], source: 'auth' });
      if (url.includes('/api/teacher/assignments')) {
        if (method === 'GET') return json({ assignments: SESSIONS, now: new Date().toISOString() });
        return json({ ok: true, id: 'nuova', closedPrevious: 0 });
      }
      if (url.includes('/api/teacher/session')) {
        return json({
          session: SESSIONS[1],
          attempts: [attempt({})],
          enrolled: [
            { id: 's-aldo', name: 'Aldo Rossi', email: 'aldo@s.it' },
            { id: 's-bruno', name: 'Bruno Verdi', email: 'bruno@s.it' },
          ],
          analysis: [{ key: 'conv:16>2', kind: 'conv', params: { from: 16, to: 2 }, total: 6, correct: 2, earned: 2, points: 6 }],
          nomi: { 'aldo rossi': { nome: 'Aldo', cognome: 'Rossi' } },
          now: new Date().toISOString(),
        });
      }
      if (url.includes('/api/teacher/attempt')) {
        const spec = EXAMS.find((e) => e.id === 'hex-2')!;
        const outcome = gradeExam(configFromSpec(spec), 7, []);
        return json({
          attempt: attempt({}),
          durationMin: 40,
          provisional: false,
          outcome: { grade: outcome.grade, score: outcome.score, maxScore: outcome.maxScore, correctCount: 0, totalCount: outcome.totalCount },
          questions: outcome.questions,
          focusEvents: [{ at: '2026-10-01T08:10:00Z', ms: 15000 }],
          events: [{ id: 1, type: 'ammonizione', message: 'Telefono', createdAt: '2026-10-01T08:12:00Z' }],
        });
      }
      if (url.includes('/api/teacher/live')) {
        return json({ live: [{ ...attempt({ state: 'in_corso', submittedAt: null, deadlineAt: inMin(20), lastSeenAt: NOW }), answered: 4, total: 12 }], now: NOW });
      }
      if (url.includes('/api/teacher/intervene')) return json({ ok: true });
      if (url.includes('/api/teacher/results')) {
        return json({ results: [attempt({}), attempt({ id: 'p2', name: 'Bruno Verdi', grade: 8, state: 'consegnata', awayEvents: 0, awayMs: 0, fullscreenExits: 0 })] });
      }
      if (url.includes('/api/teacher/students') && q.get('id')) {
        return json({ student: STUDENTS[0], attempts: [attempt({})], progress: PROGRESS.students[1].progress, progressAt: NOW, nomi: {} });
      }
      if (url.includes('/api/teacher/students')) return json({ students: STUDENTS, classes: ['3A', '3B'], source: 'auth', nomi: {} });
      if (url.includes('/api/teacher/progress')) return json(PROGRESS);
      return json({});
    })
  );
}

beforeAll(() => {
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  }
  Object.defineProperty(window.navigator, 'language', { value: 'it-IT', configurable: true });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderConsole(path = '/admin') {
  stubFetch();
  render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <AdminPage />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

const nav = () => screen.getByRole('navigation', { name: 'Console docente' });
const goTo = (label: string) => fireEvent.click(within(nav()).getByRole('button', { name: new RegExp(`^${label}`) }));
const lastCall = (path: string, method: string) => [...calls].reverse().find((c) => c.url.includes(path) && c.method === method);

describe('console docente — navigazione', () => {
  it('ha la barra laterale con le sette schede, come VLSM e CCNA1', async () => {
    renderConsole();
    await waitFor(() => expect(nav()).toBeTruthy());
    for (const label of ['Assegna', 'Sessioni live', 'Storico verifiche', 'Risultati', 'Classifica', 'Studenti', 'Catalogo']) {
      expect(within(nav()).getByRole('button', { name: new RegExp(`^${label}`) })).toBeTruthy();
    }
  });

  it('apre la scheda scritta nell’indirizzo', async () => {
    renderConsole('/admin?tab=catalog');
    await waitFor(() => expect(screen.getByText('Catalogo delle verifiche')).toBeTruthy());
  });
});

describe('console docente — Assegna', () => {
  it('mostra le verifiche aperte adesso, con la finestra', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByText('Aperte adesso')).toBeTruthy());
    expect(screen.getByText(/Si può iniziare fino alle/)).toBeTruthy();
  });

  it('assegna a una classe con la finestra per iniziarla', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByRole('radio', { name: '3A' })).toBeTruthy());
    fireEvent.click(screen.getByRole('radio', { name: '3B' }));
    fireEvent.change(screen.getByLabelText('Si può iniziare per'), { target: { value: '30' } });
    fireEvent.click(within(document.querySelector('.assign-form') as HTMLElement).getByRole('button', { name: /^Assegna$/ }));
    await waitFor(() => expect(lastCall('/api/teacher/assignments', 'POST')).toBeTruthy());
    expect(lastCall('/api/teacher/assignments', 'POST')!.body).toMatchObject({ targetType: 'class', class: '3B', openForMin: 30 });
  });

  it('assegna a un singolo studente', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Singolo studente' })).toBeTruthy());
    fireEvent.click(screen.getByRole('radio', { name: 'Singolo studente' }));
    await waitFor(() => expect(screen.getByRole('option', { name: /Verdi Bruno/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Scegli lo studente'), { target: { value: 's-bruno' } });
    fireEvent.change(screen.getByLabelText('Si può iniziare per'), { target: { value: 'none' } });
    fireEvent.click(within(document.querySelector('.assign-form') as HTMLElement).getByRole('button', { name: /^Assegna$/ }));
    await waitFor(() => expect(lastCall('/api/teacher/assignments', 'POST')).toBeTruthy());
    expect(lastCall('/api/teacher/assignments', 'POST')!.body).toMatchObject({ targetType: 'student', studentId: 's-bruno', openForMin: null });
  });
});

describe('console docente — Storico', () => {
  it('apre la sessione con statistiche, assenti e analisi', async () => {
    renderConsole('/admin?tab=history');
    await waitFor(() => expect(screen.getByRole('button', { name: /Sessione di 3B/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Sessione di 3B/ }));
    await waitFor(() => expect(screen.getByText('Consegne su iscritti')).toBeTruthy());
    expect(screen.getByText('1/2')).toBeTruthy();
    // Bruno è iscritto e non ha una prova: è assente.
    expect(screen.getByText(/Verdi Bruno/)).toBeTruthy();
    expect(screen.getByText('Conversione da base 16 a base 2')).toBeTruthy();
    // Le distrazioni portano la prova fra quelle da guardare.
    expect(screen.getByText(/uscite dalla pagina: 2/)).toBeTruthy();
  });

  it('riapre la verifica per gli assenti', async () => {
    renderConsole('/admin?tab=history&session=chiusa');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Riapri per gli assenti/ }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /Riapri per gli assenti/ })[0]);
    await waitFor(() => expect(screen.getByText(/La potrà iniziare solo chi non l’ha svolta \(1\)/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^Riapri$/ }));
    await waitFor(() => expect(lastCall('/api/teacher/assignments', 'PATCH')).toBeTruthy());
    expect(lastCall('/api/teacher/assignments', 'PATCH')!.body).toMatchObject({ id: 'chiusa', action: 'reopen', openForMin: 60 });
  });

  it('apre la prova con risposte, distrazioni e interventi', async () => {
    renderConsole('/admin?tab=history&session=chiusa');
    await waitFor(() => expect(screen.getByRole('button', { name: /Apri la prova di Rossi Aldo/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Apri la prova di Rossi Aldo/ }));
    await waitFor(() => expect(screen.getByText('Uscite dalla pagina (1)')).toBeTruthy());
    expect(screen.getByText(/Telefono/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Elimina prova/ })).toBeTruthy();
  });
});

describe('console docente — Sessioni live', () => {
  it('manda un avviso allo studente', async () => {
    renderConsole('/admin?tab=live');
    await waitFor(() => expect(screen.getByText('4/12')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Avviso' }));
    fireEvent.change(screen.getByLabelText('Messaggio'), { target: { value: 'Mancano 10 minuti' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invia l’avviso' }));
    await waitFor(() => expect(lastCall('/api/teacher/intervene', 'POST')).toBeTruthy());
    expect(lastCall('/api/teacher/intervene', 'POST')!.body).toMatchObject({ attemptId: 'p1', type: 'alert', message: 'Mancano 10 minuti' });
  });
});

describe('console docente — Classifica', () => {
  async function openRanking(cls: string) {
    renderConsole('/admin?tab=ranking');
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(`^${cls}`) })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${cls}`) }));
    await waitFor(() => expect(screen.getByText('Podio')).toBeTruthy());
  }
  const names = () => Array.from(document.querySelectorAll('.rank-table .rank-name')).map((e) => e.textContent);

  it('si sceglie la classe, poi la classifica per XP con «Cognome Nome»', async () => {
    await openRanking('3A');
    expect(names()).toEqual(['Rossi Aldo', 'Bassi Carla']);
  });

  it('mostra gli esercizi risolti della classe', async () => {
    await openRanking('3A');
    // 10 + 30 = 40 esercizi risolti nella 3A.
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('Esercizi risolti')).toBeTruthy();
  });

  it('si riordina cliccando un’intestazione', async () => {
    await openRanking('3A');
    fireEvent.click(screen.getByRole('button', { name: /^Studente/ }));
    expect(names()).toEqual(['Bassi Carla', 'Rossi Aldo']);
  });

  it('apre il dettaglio di uno studente', async () => {
    await openRanking('3A');
    fireEvent.click(screen.getByRole('button', { name: 'Palestra di Rossi Aldo' }));
    await waitFor(() => expect(screen.getByText('Per argomento')).toBeTruthy());
  });
});

describe('console docente — Studenti e Catalogo', () => {
  it('apre la cartella dello studente, da cui assegnargli una verifica', async () => {
    renderConsole('/admin?tab=students');
    await waitFor(() => expect(screen.getByRole('button', { name: /^3A/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^3A/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cartella di Rossi Aldo' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Cartella di Rossi Aldo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Assegna una verifica personale/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Assegna una verifica personale/ }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Singolo studente', checked: true })).toBeTruthy());
  });

  it('il catalogo mostra i sette argomenti e l’anteprima con le soluzioni', async () => {
    renderConsole();
    await waitFor(() => expect(nav()).toBeTruthy());
    goTo('Catalogo');
    await waitFor(() => expect(screen.getByText('Binario')).toBeTruthy());
    for (const label of ['Binario', 'Esadecimale', 'Basi miste', 'Somme e sottrazioni', 'Virgola mobile', 'Numeri con segno', 'Complemento a due']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    fireEvent.click(screen.getAllByRole('button', { name: /Anteprima/ })[0]);
    await waitFor(() => expect(screen.getByText('Soluzione')).toBeTruthy());
  });

  it('i risultati si filtrano per esito', async () => {
    renderConsole('/admin?tab=results');
    await waitFor(() => expect(screen.getByText('Rossi Aldo')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Esito'), { target: { value: 'pass' } });
    await waitFor(() => expect(screen.queryByText('Rossi Aldo')).toBeNull());
    expect(screen.getByText('Verdi Bruno')).toBeTruthy();
  });
});
