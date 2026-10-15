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
}

let utente: Utente | null = null;

vi.mock('./sso', () => ({
  verifySession: async () => (utente ? { userId: utente.userId, email: utente.email, name: utente.name, status: 'active' } : null),
  fetchUserInfo: async () =>
    utente
      ? {
          user: { status: 'active', isTeacher: !!utente.teacher, isSuperAdmin: false },
          access: { allowed: true },
          approvedClasses: utente.classes.map((classe) => ({ classe, scuola: 'M', annoScolastico: '2026/27' })),
          teacherClasses: [],
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

const PROF: Utente = { userId: 'prof', name: 'Prof Carello', email: 'prof@s.it', classes: [], teacher: true };
const ALDO: Utente = { userId: 'aldo', name: 'Aldo Rossi', email: 'aldo@s.it', classes: ['3A'] };
const BICE: Utente = { userId: 'bice', name: 'Bice Verdi', email: 'bice@s.it', classes: ['3A'] };
const CARLO: Utente = { userId: 'carlo', name: 'Carlo Neri', email: 'carlo@s.it', classes: ['3B'] };

const REGISTRO = [ALDO, BICE, CARLO].map((u) => ({
  id: u.userId,
  name: u.name,
  email: u.email,
  status: 'active',
  role: 'student',
  enrollments: u.classes.map((classe) => ({ classe, approved: true })),
}));

let env: Env;

beforeEach(() => {
  env = { DB: databaseDiProva().db };
  utente = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).endsWith('/api/admin/users')) return new Response(JSON.stringify({ users: REGISTRO }));
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

async function assegnaAllaClasse(cls: string, openForMin: number | null = 60): Promise<string> {
  const r = await chiama<{ id: string }>(PROF, assegna, { method: 'POST', body: { examId: 'binary-1', targetType: 'class', class: cls, openForMin } });
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
