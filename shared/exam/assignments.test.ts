import { describe, expect, it } from 'vitest';
import {
  assignmentState,
  extendUntil,
  isAbandoned,
  parseFocusEvents,
  pickAssignment,
  SERVER_GRACE_MS,
  windowUntil,
  type AttemptStateForPick,
} from './assignments';

const T0 = Date.parse('2026-10-15T08:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const a = (id: string, created: number, open_until: string | null = null, status = 'open') => ({ id, status, open_until, created_at: iso(created) });

describe('assignmentState', () => {
  it('distingue aperta, scaduta e chiusa', () => {
    expect(assignmentState(a('x', T0, iso(T0 + 60_000)), T0)).toBe('open');
    expect(assignmentState(a('x', T0, iso(T0 + 60_000)), T0 + 60_000)).toBe('expired');
    expect(assignmentState(a('x', T0, null), T0 + 1e9)).toBe('open');
    expect(assignmentState(a('x', T0, null, 'closed'), T0)).toBe('closed');
  });
});

describe('pickAssignment', () => {
  const none = new Map<string, AttemptStateForPick>();

  it('sceglie la più recente non ancora svolta', () => {
    const list = [a('vecchia', T0), a('nuova', T0 + 1000)];
    expect(pickAssignment(list, none, T0 + 2000)?.assignment.id).toBe('nuova');
    const fatta = new Map<string, AttemptStateForPick>([['nuova', 'consegnata']]);
    expect(pickAssignment(list, fatta, T0 + 2000)).toMatchObject({ assignment: { id: 'vecchia' }, attempt: null });
  });

  it('svolte tutte: l’ultima, con il suo stato (anche annullata)', () => {
    const list = [a('x', T0)];
    expect(pickAssignment(list, new Map([['x', 'annullata']]), T0)).toMatchObject({ assignment: { id: 'x' }, attempt: 'annullata' });
  });

  it('ignora le finestre scadute', () => {
    expect(pickAssignment([a('x', T0, iso(T0 + 1000))], none, T0 + 1000)).toBeNull();
  });
});

describe('finestre e scadenze', () => {
  it('windowUntil: minuti da adesso, limitati a un giorno; null resta senza termine', () => {
    expect(windowUntil(30, T0)).toBe(iso(T0 + 30 * 60_000));
    expect(windowUntil(99999, T0)).toBe(iso(T0 + 24 * 3600_000));
    expect(windowUntil(null, T0)).toBeNull();
  });

  it('extendUntil: dal termine se futuro, da adesso se passato', () => {
    expect(extendUntil(iso(T0 + 10 * 60_000), 15, T0)).toBe(iso(T0 + 25 * 60_000));
    expect(extendUntil(iso(T0 - 10 * 60_000), 15, T0)).toBe(iso(T0 + 15 * 60_000));
    expect(extendUntil(null, 15, T0)).toBeNull();
  });

  it('isAbandoned: solo oltre scadenza più margine', () => {
    expect(isAbandoned(T0, T0 + SERVER_GRACE_MS)).toBe(false);
    expect(isAbandoned(T0, T0 + SERVER_GRACE_MS + 1)).toBe(true);
  });
});

describe('parseFocusEvents', () => {
  it('scarta ciò che non ha la forma giusta', () => {
    const ev = parseFocusEvents(JSON.stringify([{ at: iso(T0), ms: 1200.4 }, { at: 'ieri', ms: 3 }, { ms: 5 }, null, { at: iso(T0), ms: -1 }]));
    expect(ev).toEqual([{ at: iso(T0), ms: 1200 }]);
    expect(parseFocusEvents('non json')).toEqual([]);
  });
});
