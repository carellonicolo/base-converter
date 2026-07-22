/**
 * Client di autenticazione via SSO centralizzato (auth.nicolocarello.it).
 * L'identità arriva dal cookie condiviso `nc_session`: registrazione, login e
 * logout vivono sull'IdP; qui solo fetch autenticate e redirect.
 *
 * Modello di accesso di QUESTA app: uso LIBERO (strumenti, teoria, palestra
 * anche senza login). Il login serve per salvare i progressi su tutti i
 * dispositivi e per le verifiche ufficiali (che richiedono classe approvata).
 */

export const AUTH_ORIGIN = 'https://auth.nicolocarello.it';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: string;
  isTeacher: boolean;
  isSuperAdmin: boolean;
  /** Classi approvate (vuoto se in attesa). */
  classes: string[];
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

/** Fetch autenticata: il cookie SSO viaggia da solo (`credentials: 'include'`). */
export async function authFetch<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<ApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const res = await fetch(path, { ...init, headers, credentials: 'include', signal: ctrl.signal });
    let data: unknown;
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = undefined;
      }
    }
    if (!res.ok) {
      const body = data as { error?: string; code?: string } | undefined;
      return { ok: false, status: res.status, error: body?.error ?? `HTTP ${res.status}`, code: body?.code, data: data as T };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Profilo dell'utente loggato (dato fresco dell'IdP via la nostra Function
 * /api/profile). Ritorna 401 se non c'è sessione: normale in modalità libera.
 */
export async function apiProfile(): Promise<ApiResult<{ user: UserProfile }>> {
  return authFetch<{ user: UserProfile }>('/api/profile');
}

/** Manda il browser al login centrale, tornando poi alla pagina corrente. */
export function redirectToLogin(): void {
  window.location.assign(`${AUTH_ORIGIN}/login?redirect=${encodeURIComponent(window.location.href)}`);
}

/** Logout globale SSO: disconnette da TUTTE le app e torna alla home. */
export function redirectToLogout(): void {
  window.location.assign(`${AUTH_ORIGIN}/api/logout?redirect=${encodeURIComponent(window.location.origin)}`);
}
