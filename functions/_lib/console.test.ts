/**
 * Le regole della console nuova, provate sulle Functions vere e su un
 * SQLite con lo schema di produzione (vedi testing/database.ts).
 *
 * L'SSO è finto (chi chiama lo decide `utente`), il registro dell'IdP è una
 * fetch finta: tutto il resto — query, batch, condizioni sullo stato — è il
 * codice che gira in produzione.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseDiProva } from './testing/database';
import type { Env } from './shared';

interface Utente {
  userId: string;
  name: string;
  email: string;
  classes: string[];
  teacher?: boolean;
  superAdmin?: boolean;
  /** Le classi del docente sull'IdP (`teacherClasses`). */
  teaches?: string[];
}

let utente: Utente | null = null;
/** AUTH non risponde a /api/admin/users. */
let registroGiu = false;

vi.mock('./sso', () => ({
  verifySession: async () => (utente ? { userId: utente.userId, email: utente.email, name: utente.name, status: 'active' } : null),
  fetchUserInfo: async () =>
    utente
      ? {
          user: { status: 'active', isTeacher: !!utente.teacher, isSuperAdmin: !!utente.superAdmin },
          access: { allowed: true },
          approvedClasses: utente.classes.map((classe) => ({ classe, scuola: 'M', annoScolastico: '2026/27' })),
          teacherClasses: utente.teaches ?? [],
        }
      : null,
  requireAppAccess: async () => ({ ok: false, reason: 'unauthenticated', message: '', redirectTo: '' }),
}));

import { onRequestPost as assegna, onRequestPatch as modifica } from '../api/teacher/assignments';
import { onRequestGet as sessione } from '../api/teacher/session';
import { onRequestPost as interviene } from '../api/teacher/intervene';
import { onRequestDelete as eliminaProva, onRequestGet as prova } from '../api/teacher/attempt';
import { onRequestGet as live } from '../api/teacher/live';
import { onRequestGet as stato } from '../api/exam/state';
import { onRequestPost as avvia } from '../api/exam/start';
import { onRequestPost as battito } from '../api/exam/heartbeat';
import { onRequestGet as canale } from '../api/exam/events';
import { onRequestPost as consegna } from '../api/exam/submit';
import { onRequestGet as elencoAssegnazioni } from '../api/teacher/assignments';
import { onRequestGet as risultati } from '../api/teacher/results';
import { onRequestGet as studenti } from '../api/teacher/students';
import { onRequestGet as palestra } from '../api/teacher/progress';
import { onRequestGet as classi } from '../api/teacher/classes';

const PROF: Utente = { userId: 'prof', name: 'Prof Carello', email: 'prof@s.it', classes: [], teacher: true, teaches: ['3A', '3B'] };
/** Un docente della sola 3A; la classe arriva in minuscolo, come può capitare sull'IdP. */
const PROF_3A: Utente = { userId: 'prof3a', name: 'Prof Bianchi', email: 'bianchi@s.it', classes: [], teacher: true, teaches: ['3a'] };
const SUPER: Utente = { userId: 'admin', name: 'Super Admin', email: 'admin@s.it', classes: [], teacher: true, superAdmin: true };
const ALDO: Utente = { userId: 'aldo', name: 'Aldo Rossi', email: 'aldo@s.it', classes: ['3A'] };
const BICE: Utente = { userId: 'bice', name: 'Bice Verdi', email: 'bice@s.it', classes: ['3A'] };
const CARLO: Utente = { userId: 'carlo', name: 'Carlo Neri', email: 'carlo@s.it', classes: ['3B'] };

const registro = () =>
  [ALDO, BICE, CARLO].map((u) => ({
    id: u.userId,
    name: u.name,
    email: u.email,
    status: 'active',
    role: 'student',
    enrollments: u.classes.map((classe) => ({ classe, approved: true })),
  }));

/** Come AUTH: tutto al super-admin, a un docente gli studenti delle sue classi. */
function registroPer(chi: Utente | null) {
  const tutti = registro();
  if (!chi || chi.superAdmin) return tutti;
  const sue = new Set((chi.teaches ?? []).map((c) => c.toUpperCase()));
  return tutti.filter((u) => u.enrollments.some((e) => sue.has(e.classe.toUpperCase())));
}

let env: Env;

beforeEach(() => {
  env = { DB: databaseDiProva().db };
  utente = null;
  registroGiu = false;
  ALDO.classes = ['3A'];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).endsWith('/api/admin/users')) {
        if (registroGiu) return new Response('{}', { status: 503 });
        return new Response(JSON.stringify({ users: registroPer(utente) }));
      }
      return new Response('{}', { status: 404 });
    })
  );
  vi.useRealTimers();
});

type Handler = (ctx: { request: Request; env: Env }) => Promise<Response> | Response;

async function chiama<T = Record<string, unknown>>(
  chi: Utente,
  handler: unknown,
  { method = 'GET', path = '/', body }: { method?: string; path?: string; body?: unknown } = {}
): Promise<{ status: number; data: T }> {
  utente = chi;
  const request = new Request(`https://converter.test${path}`, {
    method,
    headers: { cookie: 'nc_session=x', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await (handler as Handler)({ request, env });
  return { status: res.status, data: (await res.json()) as T };
}

async function assegnaAllaClasse(cls: string, openForMin: number | null = 60, chi: Utente = PROF): Promise<string> {
  const r = await chiama<{ id: string }>(chi, assegna, { method: 'POST', body: { examId: 'binary-1', targetType: 'class', class: cls, openForMin } });
  expect(r.status).toBe(200);
  return r.data.id;
}

async function svolgi(chi: Utente, risposte: string[] = []): Promise<string> {
  const s = await chiama<{ id: string }>(chi, avvia, { method: 'POST' });
  expect(s.status).toBe(200);
  const c = await chiama(chi, consegna, { method: 'POST', body: { id: s.data.id, answers: risposte } });
  expect(c.status).toBe(200);
  return s.data.id;
}

describe('assegnazione a una classe con finestra', () => {
  it('la vede solo la classe giusta, finché la finestra è aperta', async () => {
    await assegnaAllaClasse('3A', 30);
    expect((await chiama(ALDO, stato)).data.assigned).toBe(true);
    expect((await chiama(CARLO, stato)).data.assigned).toBe(false);

    // Trentun minuti dopo non la inizia più nessuno.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect((await chiama(BICE, stato)).data.assigned).toBe(false);
    expect((await chiama(BICE, avvia, { method: 'POST' })).data.code).toBe('not_assigned');
  });

  it('chi l’ha iniziata la porta a termine anche dopo la chiusura', async () => {
    const id = await assegnaAllaClasse('3A', 15);
    const s = await chiama<{ id: string }>(ALDO, avvia, { method: 'POST' });
    await chiama(PROF, modifica, { method: 'PATCH', body: { id, action: 'close' } });

    const st = await chiama<{ current: { id: string } | null }>(ALDO, stato);
    expect(st.data.current?.id).toBe(s.data.id);
    expect((await chiama(ALDO, consegna, { method: 'POST', body: { id: s.data.id, answers: [] } })).status).toBe(200);
  });

  it('una nuova verifica alla stessa classe chiude la precedente', async () => {
    await assegnaAllaClasse('3A');
    const r = await chiama<{ closedPrevious: number }>(PROF, assegna, {
      method: 'POST',
      body: { examId: 'hex-1', targetType: 'class', class: '3A', openForMin: 60 },
    });
    expect(r.data.closedPrevious).toBe(1);
  });
});

describe('recupero per gli assenti', () => {
  it('riaperta, la può iniziare solo chi non l’ha svolta', async () => {
    const id = await assegnaAllaClasse('3A');
    await svolgi(ALDO);
    await chiama(PROF, modifica, { method: 'PATCH', body: { id, action: 'close' } });
    expect((await chiama(BICE, stato)).data.assigned).toBe(false);

    await chiama(PROF, modifica, { method: 'PATCH', body: { id, action: 'reopen', openForMin: 60 } });
    expect((await chiama(ALDO, avvia, { method: 'POST' })).data.code).toBe('already_done');
    expect((await chiama(BICE, avvia, { method: 'POST' })).status).toBe(200);

    // Il recupero resta nella stessa sessione dello Storico.
    const sess = await chiama<{ attempts: unknown[]; enrolled: unknown[] }>(PROF, sessione, { path: `/?id=${id}` });
    expect(sess.data.attempts).toHaveLength(2);
    expect(sess.data.enrolled).toHaveLength(2);
  });

  it('eliminando la prova, lo studente la può rifare', async () => {
    await assegnaAllaClasse('3A');
    const provaId = await svolgi(ALDO);
    expect((await chiama(ALDO, avvia, { method: 'POST' })).data.code).toBe('already_done');
    expect((await chiama(PROF, eliminaProva, { method: 'DELETE', path: `/?id=${provaId}` })).status).toBe(200);
    expect((await chiama(ALDO, avvia, { method: 'POST' })).status).toBe(200);
  });
});

describe('assegnazione al singolo studente', () => {
  it('la vede solo lui, con la sua classe', async () => {
    const r = await chiama<{ id: string }>(PROF, assegna, {
      method: 'POST',
      body: { examId: 'twos-2', targetType: 'student', studentId: 'carlo', openForMin: null },
    });
    expect(r.status).toBe(200);
    expect((await chiama(ALDO, stato)).data.assigned).toBe(false);
    const st = await chiama<{ assigned: boolean; exam: { id: string } }>(CARLO, stato);
    expect(st.data.assigned).toBe(true);
    expect(st.data.exam.id).toBe('twos-2');

    await chiama(CARLO, avvia, { method: 'POST' });
    const sess = await chiama<{ session: { targetType: string; studentName: string; class: string } }>(PROF, sessione, { path: `/?id=${r.data.id}` });
    expect(sess.data.session).toMatchObject({ targetType: 'student', studentName: 'Carlo Neri', class: '3B' });
  });

  it('un recupero personale non chiude la verifica della classe', async () => {
    await assegnaAllaClasse('3A');
    const r = await chiama<{ closedPrevious: number }>(PROF, assegna, {
      method: 'POST',
      body: { examId: 'hex-1', targetType: 'student', studentId: 'bice' },
    });
    expect(r.data.closedPrevious).toBe(0);
    expect((await chiama<{ exam: { id: string } }>(ALDO, stato)).data.exam.id).toBe('binary-1');
  });
});

describe('durante la prova', () => {
  it('le risposte salvate dal battito restano, e la consegna la fa il server se il computer si spegne', async () => {
    await assegnaAllaClasse('3A');
    const s = await chiama<{ id: string; questions: unknown[] }>(ALDO, avvia, { method: 'POST' });
    const b = await chiama(ALDO, battito, {
      method: 'POST',
      body: { id: s.data.id, answers: ['101'], awayEvents: 2, awayMs: 9000, fullscreenExits: 1, focusEvents: [{ at: new Date().toISOString(), ms: 9000 }] },
    });
    expect(b.data.open).toBe(true);

    const l = await chiama<{ live: { answered: number; awayEvents: number; fullscreenExits: number }[] }>(PROF, live);
    expect(l.data.live[0]).toMatchObject({ answered: 1, awayEvents: 2, fullscreenExits: 1 });

    // Il computer si spegne: tre minuti oltre la scadenza la consegna il server.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + (30 + 3) * 60_000);
    expect((await chiama<{ live: unknown[] }>(PROF, live)).data.live).toHaveLength(0);
    const p = await chiama<{ attempt: { state: string; submitReason: string; awayEvents: number }; focusEvents: unknown[] }>(PROF, prova, {
      path: `/?id=${s.data.id}`,
    });
    expect(p.data.attempt).toMatchObject({ state: 'consegnata', submitReason: 'server', awayEvents: 2 });
    expect(p.data.focusEvents).toHaveLength(1);
  });

  it('avviso, ammonizione e interruzione arrivano allo studente', async () => {
    await assegnaAllaClasse('3A');
    const s = await chiama<{ id: string }>(ALDO, avvia, { method: 'POST' });
    const attemptId = s.data.id;

    await chiama(PROF, interviene, { method: 'POST', body: { attemptId, type: 'alert', message: 'Mancano 10 minuti' } });
    await chiama(PROF, interviene, { method: 'POST', body: { attemptId, type: 'ammonizione', message: 'Telefono' } });
    let c = await chiama<{ state: string; events: { id: number; type: string }[] }>(ALDO, canale, { path: '/?since=0' });
    expect(c.data.events.map((e) => e.type)).toEqual(['alert', 'ammonizione']);
    const ultimo = c.data.events[1].id;

    await chiama(PROF, interviene, { method: 'POST', body: { attemptId, type: 'annulla', message: 'Copiava' } });
    c = await chiama(ALDO, canale, { path: `/?since=${ultimo}` });
    expect(c.data.state).toBe('annullata');
    expect(c.data.events.map((e) => e.type)).toEqual(['annulla']);

    // Interrotta, non si consegna e non si riprende.
    const sub = await chiama<{ code: string }>(ALDO, consegna, { method: 'POST', body: { id: attemptId, answers: [] } });
    expect(sub.data.code).toBe('annulled');
    const p = await chiama<{ attempt: { warnings: number; annulledReason: string } }>(PROF, prova, { path: `/?id=${attemptId}` });
    expect(p.data.attempt).toMatchObject({ warnings: 1, annulledReason: 'Copiava' });
    expect((await chiama<{ submitted: { state: string } }>(ALDO, stato)).data.submitted.state).toBe('annullata');
  });

  it('un avviso senza testo non parte', async () => {
    await assegnaAllaClasse('3A');
    const s = await chiama<{ id: string }>(ALDO, avvia, { method: 'POST' });
    const r = await chiama(PROF, interviene, { method: 'POST', body: { attemptId: s.data.id, type: 'alert', message: ' ' } });
    expect(r.status).toBe(400);
  });
});

describe('perimetro del docente', () => {
  const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id).sort();

  it('assegna solo alle sue classi e agli studenti del suo registro', async () => {
    expect((await chiama(PROF_3A, assegna, { method: 'POST', body: { examId: 'binary-1', targetType: 'class', class: '3B' } })).status).toBe(403);
    expect((await chiama(PROF_3A, assegna, { method: 'POST', body: { examId: 'binary-1', targetType: 'class', class: '3A' } })).status).toBe(200);
    expect((await chiama(PROF_3A, assegna, { method: 'POST', body: { examId: 'hex-1', targetType: 'student', studentId: 'carlo' } })).status).toBe(403);
    expect((await chiama(PROF_3A, assegna, { method: 'POST', body: { examId: 'hex-1', targetType: 'student', studentId: 'bice' } })).status).toBe(200);
  });

  it('vede e gestisce solo le sue sessioni', async () => {
    const sua = await assegnaAllaClasse('3A');
    const altrui = await assegnaAllaClasse('3B');
    const elenco = await chiama<{ assignments: { id: string }[] }>(PROF_3A, elencoAssegnazioni);
    expect(ids(elenco.data.assignments)).toEqual([sua]);
    expect((await chiama(PROF_3A, sessione, { path: `/?id=${altrui}` })).status).toBe(403);
    expect((await chiama(PROF_3A, modifica, { method: 'PATCH', body: { id: altrui, action: 'close' } })).status).toBe(403);
    expect((await chiama(PROF_3A, modifica, { method: 'PATCH', body: { id: sua, action: 'close' } })).status).toBe(200);
  });

  it('non vede né tocca le prove degli altri studenti', async () => {
    await assegnaAllaClasse('3A');
    await assegnaAllaClasse('3B');
    const aldo = await chiama<{ id: string }>(ALDO, avvia, { method: 'POST' });
    const carlo = await chiama<{ id: string }>(CARLO, avvia, { method: 'POST' });

    const l = await chiama<{ live: { id: string }[] }>(PROF_3A, live);
    expect(ids(l.data.live)).toEqual([aldo.data.id]);
    expect((await chiama(PROF_3A, prova, { path: `/?id=${carlo.data.id}` })).status).toBe(403);
    expect((await chiama(PROF_3A, interviene, { method: 'POST', body: { attemptId: carlo.data.id, type: 'alert', message: 'x' } })).status).toBe(403);
    expect((await chiama(PROF_3A, eliminaProva, { method: 'DELETE', path: `/?id=${carlo.data.id}` })).status).toBe(403);
    expect((await chiama(PROF_3A, interviene, { method: 'POST', body: { attemptId: aldo.data.id, type: 'alert', message: 'x' } })).status).toBe(200);

    await chiama(ALDO, consegna, { method: 'POST', body: { id: aldo.data.id, answers: [] } });
    await chiama(CARLO, consegna, { method: 'POST', body: { id: carlo.data.id, answers: [] } });
    const r = await chiama<{ results: { id: string }[] }>(PROF_3A, risultati, { path: '/?state=all' });
    expect(ids(r.data.results)).toEqual([aldo.data.id]);
    // Il super-admin non ha perimetro.
    const tutti = await chiama<{ results: { id: string }[] }>(SUPER, risultati, { path: '/?state=all' });
    expect(ids(tutti.data.results)).toEqual(ids([aldo.data, carlo.data]));
  });

  it('studenti e palestra: solo i suoi', async () => {
    const ora = new Date().toISOString();
    for (const u of [ALDO, CARLO]) {
      await env.DB.prepare(`INSERT INTO bc_progress (user_id, email, full_name, data, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(u.userId, u.email, u.name, JSON.stringify({ xp: 100 }), ora)
        .run();
    }
    const st = await chiama<{ students: { id: string }[] }>(PROF_3A, studenti);
    expect(ids(st.data.students)).toEqual(['aldo', 'bice']);
    expect((await chiama(PROF_3A, studenti, { path: '/?id=carlo' })).status).toBe(403);
    expect((await chiama(PROF_3A, studenti, { path: '/?id=aldo' })).status).toBe(200);

    const pr = await chiama<{ students: { userId: string }[] }>(PROF_3A, palestra);
    expect(pr.data.students.map((x) => x.userId).sort()).toEqual(['aldo', 'bice']);
    const prTutti = await chiama<{ students: { userId: string }[] }>(SUPER, palestra);
    expect(prTutti.data.students.map((x) => x.userId).sort()).toEqual(['aldo', 'bice', 'carlo']);
  });

  it('le classi sono quelle dell’IdP, anche senza registro', async () => {
    const c = await chiama<{ classes: string[]; scope: string }>(PROF_3A, classi);
    expect(c.data).toMatchObject({ classes: ['3A'], scope: 'own' });
    registroGiu = true;
    expect((await chiama<{ classes: string[] }>(PROF_3A, classi)).data.classes).toEqual(['3A']);
  });

  it('senza registro un docente riceve 502, il super-admin no', async () => {
    await assegnaAllaClasse('3A');
    registroGiu = true;
    expect((await chiama(PROF_3A, elencoAssegnazioni)).status).toBe(502);
    expect((await chiama(PROF_3A, live)).status).toBe(502);
    expect((await chiama(SUPER, elencoAssegnazioni)).status).toBe(200);
  });

  it('una sessione sua resta intera anche se lo studente cambia classe', async () => {
    const id = await assegnaAllaClasse('3A', 60, PROF_3A);
    const p = await svolgi(ALDO);
    ALDO.classes = ['3B']; // Aldo passa alla 3B: non è più nel registro di PROF_3A.
    expect((await chiama(PROF_3A, prova, { path: `/?id=${p}` })).status).toBe(200);
    const sess = await chiama<{ attempts: { id: string }[] }>(PROF_3A, sessione, { path: `/?id=${id}` });
    expect(ids(sess.data.attempts)).toEqual([p]);
    const r = await chiama<{ results: { id: string }[] }>(PROF_3A, risultati);
    expect(ids(r.data.results)).toEqual([p]);
  });
});
