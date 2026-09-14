/**
 * Helper condivisi tra le Pages Functions di Base Converter.
 *
 * Autenticazione: SSO centralizzato (auth.nicolocarello.it), cookie condiviso
 * `nc_session` verificato con la sola chiave pubblica (vedi _lib/sso.ts).
 *
 * Regole di accesso di QUESTA app (decise col docente):
 *  - Strumenti, teoria e palestra sono LIBERI: non passano da qui.
 *  - Il salvataggio dei progressi richiede un account ABILITATO sull'IdP.
 *  - Le VERIFICHE richiedono account attivo E classe approvata.
 *  - La console richiede `isTeacher || isSuperAdmin`.
 */

import { verifySession, fetchUserInfo, requireAppAccess, type Identity } from './sso';

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
 * Account abilitato sull'IdP (qualsiasi ruolo). Usato per il salvataggio dei
 * progressi.
 *
 * Fino a settembre 2026 bastava una sessione valida, anche in attesa di
 * approvazione. Ora chi non è abilitato, per l'app, non è loggato — come in
 * tutta la piattaforma (vedi _lib/sso.ts): la palestra la usa in modalità
 * libera, senza salvataggi, finché un docente non conferma la sua classe.
 */
export async function requireUser(request: Request): Promise<Access | Response> {
  const gate = await requireAppAccess(request);
  if (!gate.ok && gate.reason !== 'idp_unreachable') {
    return jsonError(401, 'Accesso richiesto. Effettua il login.', 'unauthenticated');
  }
  const identity = await verifySession(request);
  if (!identity) return jsonError(401, 'Accesso richiesto. Effettua il login.', 'unauthenticated');

  if (!gate.ok) {
    // L'IdP non risponde: ci fidiamo della firma del cookie (già verificata)
    // ma senza classi approvate. Sufficiente per i progressi personali.
    return { identity, isTeacher: false, classes: [], status: identity.status };
  }
  const info = gate.info;
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
  // Non abilitato sull'IdP (sospeso, password da sostituire…), docente compreso:
  // per l'app non è loggato.
  if (!info.access?.allowed) {
    return jsonError(401, 'Accesso non ancora abilitato. Effettua di nuovo il login.', 'unauthenticated');
  }

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
  if (!info.access?.allowed) {
    return jsonError(401, 'Accesso non ancora abilitato. Effettua di nuovo il login.', 'unauthenticated');
  }
  if (!(info.user.isTeacher || info.user.isSuperAdmin)) {
    return jsonError(403, 'Sezione riservata al docente.', 'forbidden');
  }
  return { identity, isTeacher: true, classes: [], status: info.user.status };
}
