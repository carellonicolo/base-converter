/**
 * Helper condivisi tra le Pages Functions di Base Converter.
 *
 * Autenticazione: SSO centralizzato (auth.nicolocarello.it), cookie condiviso
 * `nc_session` verificato con la sola chiave pubblica (vedi _lib/sso.ts).
 *
 * Regole di accesso di QUESTA app (decise col docente):
 *  - Strumenti, teoria e palestra sono LIBERI: non passano da qui.
 *  - Il salvataggio dei progressi richiede solo un account valido.
 *  - Le VERIFICHE richiedono account attivo E classe approvata.
 *  - La console richiede `isTeacher || isSuperAdmin`.
 */

import { verifySession, fetchUserInfo, type Identity } from './sso';

export interface Env {
  DB: D1Database;
}

export type { Identity };

export function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  });
}

export function jsonError(status: number, message: string, code?: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export interface Access {
  identity: Identity;
  isTeacher: boolean;
  /** Classi approvate (vuoto per il docente o per chi è in attesa). */
  classes: string[];
  status: string;
}

/**
 * Sessione valida (qualsiasi utente autenticato). Usato per il salvataggio dei
 * progressi: anche uno studente ancora in attesa di approvazione può tenere i
 * suoi progressi della palestra.
 */
export async function requireUser(request: Request): Promise<Access | Response> {
  const identity = await verifySession(request);
  if (!identity) return jsonError(401, 'Accesso richiesto. Effettua il login.', 'unauthenticated');

  const info = await fetchUserInfo(request);
  if (!info) {
    // L'IdP non risponde: ci fidiamo della firma del cookie (già verificata)
    // ma senza classi approvate. Sufficiente per i progressi personali.
    return { identity, isTeacher: false, classes: [], status: identity.status };
  }
  const isTeacher = !!(info.user.isTeacher || info.user.isSuperAdmin);
  const classes = (info.approvedClasses ?? []).map((c) => c.classe).filter(Boolean);
  return { identity, isTeacher, classes, status: info.user.status };
}

/**
 * Gate delle verifiche ufficiali: account attivo + classe approvata,
 * oppure docente. Il dato è FRESCO dall'IdP, così approvazioni e sospensioni
 * hanno effetto immediato senza ri-login.
 */
export async function requireExamAccess(request: Request): Promise<Access | Response> {
  const identity = await verifySession(request);
  if (!identity) return jsonError(401, 'Accesso richiesto. Effettua il login.', 'unauthenticated');

  const info = await fetchUserInfo(request);
  if (!info) return jsonError(401, 'Sessione non valida. Effettua di nuovo il login.', 'unauthenticated');

  const isTeacher = !!(info.user.isTeacher || info.user.isSuperAdmin);
  if (isTeacher) return { identity, isTeacher: true, classes: [], status: info.user.status };

  if (info.user.status !== 'active') {
    return jsonError(403, 'Account non attivo. Contatta il docente.', 'not_active');
  }
  const classes = (info.approvedClasses ?? []).map((c) => c.classe).filter(Boolean);
  if (classes.length === 0) {
    return jsonError(
      403,
      'Il tuo account è in attesa di approvazione: le verifiche saranno disponibili quando il docente confermerà la tua classe.',
      'pending'
    );
  }
  return { identity, isTeacher: false, classes, status: info.user.status };
}

/** Solo docente (console e API di configurazione). */
export async function requireTeacher(request: Request): Promise<Access | Response> {
  const identity = await verifySession(request);
  if (!identity) return jsonError(401, 'Accesso docente richiesto.', 'unauthenticated');
  const info = await fetchUserInfo(request);
  if (!info) return jsonError(401, 'Sessione non valida. Effettua di nuovo il login.', 'unauthenticated');
  if (!(info.user.isTeacher || info.user.isSuperAdmin)) {
    return jsonError(403, 'Sezione riservata al docente.', 'forbidden');
  }
  return { identity, isTeacher: true, classes: [], status: info.user.status };
}
