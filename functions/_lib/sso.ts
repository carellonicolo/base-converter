/**
 * VERIFICATORE SSO — da copiare in functions/_lib/sso.ts di OGNI app consumer.
 *
 * Verifica il cookie di sessione `nc_session` emesso dall'Identity Provider
 * usando SOLO la chiave PUBBLICA scaricata da /.well-known/jwks.json.
 * Nessun segreto condiviso: l'app puo' verificare ma non forgiare token.
 *
 * Il gate da usare e' `requireAppAccess()`: identita' + abilitazione in una
 * chiamata. La regola da tenere a mente: PER L'APP, CHI NON E' ABILITATO NON E'
 * LOGGATO. L'IdP gli da' un cookie che vale solo su auth.nicolocarello.it; se
 * l'app lo manda al login, l'IdP riconosce la sessione e gli mostra cosa manca
 * (classe da confermare, account sospeso...) senza chiedergli di nuovo le
 * credenziali.
 *
 * Dipendenze: nessuna (solo Web Crypto, nativo nei Worker).
 */

const AUTH_ORIGIN = 'https://auth.nicolocarello.it';
const ISSUER = 'https://auth.nicolocarello.it';
const SESSION_COOKIE = 'nc_session';
const JWKS_TTL_MS = 60 * 60 * 1000;

export interface Identity {
  userId: string;
  email: string;
  name: string;
  status: string;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

let jwksCache: { keys: Jwk[]; importedByKid: Map<string, CryptoKey>; fetchedAt: number } | null = null;

function base64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64urlToString(s: string): string {
  return new TextDecoder().decode(base64urlToBytes(s));
}

export function readCookie(request: Request, name = SESSION_COOKIE): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx) === name) return part.slice(idx + 1);
  }
  return null;
}

async function getKey(kid: string | undefined): Promise<CryptoKey | null> {
  if (!jwksCache || Date.now() - jwksCache.fetchedAt > JWKS_TTL_MS) {
    const res = await fetch(`${AUTH_ORIGIN}/.well-known/jwks.json`);
    if (!res.ok) return null;
    const doc = (await res.json()) as { keys: Jwk[] };
    jwksCache = { keys: doc.keys ?? [], importedByKid: new Map(), fetchedAt: Date.now() };
  }
  const cached = kid ? jwksCache.importedByKid.get(kid) : undefined;
  if (cached) return cached;
  const jwk = kid ? jwksCache.keys.find((k) => k.kid === kid) : jwksCache.keys[0];
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (jwk.kid) jwksCache.importedByKid.set(jwk.kid, key);
  return key;
}

/**
 * Verifica il cookie di sessione della richiesta.
 * Ritorna l'identita' se il token e' valido (firma + scadenza + issuer) e
 * destinato alle app, altrimenti null.
 *
 * Dice solo CHI e' l'utente, non che sia abilitato: per quello serve
 * `requireAppAccess()`, che interroga l'IdP.
 */
export async function verifySession(request: Request): Promise<Identity | null> {
  const token = readCookie(request);
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(base64urlToString(h));
  } catch {
    return null;
  }
  if (header.alg !== 'ES256') return null;

  const key = await getKey(header.kid);
  if (!key) return null;

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64urlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`)
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload: { iss?: string; aud?: unknown; sub?: string; email?: string; name?: string; status?: string; exp?: number };
  try {
    payload = JSON.parse(base64urlToString(p));
  } catch {
    return null;
  }
  if (payload.iss !== ISSUER) return null;
  // Token destinato al solo IdP: e' la sessione di chi NON e' abilitato alle
  // app (classe da confermare, domanda da docente, password da sostituire).
  // L'IdP la mette in un cookie che le app non ricevono; se arriva qui
  // comunque — copiata a mano — non vale.
  if (payload.aud === ISSUER) return null;
  if (typeof payload.exp !== 'number' || Math.floor(Date.now() / 1000) >= payload.exp) return null;
  if (!payload.sub) return null;

  return {
    userId: payload.sub,
    email: payload.email ?? '',
    name: payload.name ?? '',
    status: payload.status ?? 'active',
  };
}

/**
 * Perché l'IdP nega l'accesso. `null` quando l'accesso è concesso.
 * `renewal_required`: l'iscrizione vale un anno scolastico, dal 1° settembre
 * va rinnovata e riconfermata da un docente.
 */
export type AccessReason =
  | 'suspended'
  /** Credenziali di innesco da sostituire: l'utente resta sull'IdP finché non lo fa. */
  | 'must_change_password'
  | 'no_class'
  | 'renewal_required'
  | 'pending_approval'
  /** Ha chiesto di entrare come docente: domanda da compilare o in attesa del super-admin. */
  | 'teacher_draft'
  | 'teacher_pending';

export interface AccessState {
  allowed: boolean;
  reason: AccessReason | null;
  message: string;
  /** Classe confermata per l'anno in corso. */
  classe: string | null;
  pendingClasse: string | null;
  /** Classe dell'anno precedente, quando c'è da rinnovare. */
  previousClasse: string | null;
  /** Anno scolastico su cui è valutato l'accesso, es. '2026/2027'. */
  annoScolastico: string;
}

export interface UserInfo {
  access: AccessState;
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    role: 'student' | 'teacher' | 'super_admin';
    isTeacher: boolean;
    isSuperAdmin: boolean;
  };
  /** Tutte le iscrizioni, anni passati compresi: lo storico, per chi lo vuole davvero. */
  enrollments?: { id: string; scuola: string; classe: string; annoScolastico: string; approved: boolean }[];
  approvedClasses: { scuola: string; classe: string; annoScolastico: string }[];
  /**
   * Classi che questo DOCENTE insegna nell'anno in corso. Vuoto per gli
   * studenti e per il super-admin — che non ha perimetro: vede tutto.
   *
   * Serve alle app che mostrano al docente i dati di una classe (registri,
   * verifiche, statistiche): il perimetro lo conosce l'IdP, ed e' li' che va
   * chiesto. Un elenco tenuto dall'app resterebbe indietro il giorno in cui
   * una classe cambia docente, e nessuno se ne accorgerebbe.
   *
   * NB: `isTeacher` dice *se* e' un docente, questo campo dice *di chi*.
   * Per il super-admin i due non coincidono: e' docente e non ha classi.
   */
  teacherClasses: string[];
}

/**
 * Recupera i dati FRESCHI dell'utente (stato + abilitazione + classi approvate)
 * dall'IdP, inoltrando il cookie della richiesta. E' la fonte autorevole del
 * GATE: riflette subito approvazioni e sospensioni, senza aspettare la scadenza
 * del token.
 *
 * null se manca il cookie o l'IdP risponde con un errore; un errore di rete
 * invece si propaga. Per il gate usa `requireAppAccess()`, che distingue i due
 * casi.
 */
export async function fetchUserInfo(request: Request): Promise<UserInfo | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const res = await fetch(`${AUTH_ORIGIN}/api/userinfo`, { headers: { cookie } });
  if (!res.ok) return null;
  return (await res.json()) as UserInfo;
}

/** Perché `requireAppAccess` ha detto no. */
export type GateReason = AccessReason | 'unauthenticated' | 'idp_unreachable';

/**
 * GATE DI ACCESSO ALL'APP — usalo all'ingresso di ogni app consumer e in ogni
 * endpoint che serve dati o accetta salvataggi.
 *
 * Un cookie valido dice solo CHI è l'utente, non che sia abilitato: uno
 * studente appena entrato con Google non ha ancora una classe confermata da un
 * docente, uno sospeso ha ancora un token firmato fino alla scadenza. Questa
 * funzione chiede all'IdP e risponde:
 *
 *   ok: true                      abilitato, `info` e' il dato fresco;
 *   reason: 'unauthenticated'     nessuna sessione valida per le app
 *                                 → 401, la SPA manda al login;
 *   reason: AccessReason          loggato ma non abilitato → per l'app e' come
 *                                 non loggato (401). `redirectTo` e' la sua
 *                                 area sull'IdP, per la SPA che vuole spiegarlo
 *                                 da se' invece di mandare al login;
 *   reason: 'idp_unreachable'     l'IdP non risponde → 503. MAI 401: la SPA
 *                                 manderebbe al login, l'IdP (che dal browser
 *                                 magari risponde) riconoscerebbe la sessione e
 *                                 la rimanderebbe qui — un rimbalzo senza fine.
 *
 *   const gate = await requireAppAccess(request);
 *   if (!gate.ok) return new Response(gate.message, { status: gate.reason === 'idp_unreachable' ? 503 : 401 });
 */
export async function requireAppAccess(
  request: Request
): Promise<{ ok: true; info: UserInfo } | { ok: false; reason: GateReason; message: string; redirectTo: string }> {
  // Prima la firma, in locale: un cookie assente, scaduto o destinato al solo
  // IdP non merita una chiamata di rete.
  if (!(await verifySession(request))) {
    return { ok: false, reason: 'unauthenticated', message: 'Devi accedere.', redirectTo: loginRedirectUrl(request.url) };
  }

  let res: Response | null = null;
  try {
    res = await fetch(`${AUTH_ORIGIN}/api/userinfo`, { headers: { cookie: request.headers.get('cookie') ?? '' } });
  } catch {
    res = null;
  }
  // 401 dall'IdP: la sessione e' stata chiusa (logout, sospensione, password
  // cambiata). La firma non lo sa, l'IdP si'.
  if (res?.status === 401) {
    return { ok: false, reason: 'unauthenticated', message: 'Devi accedere.', redirectTo: loginRedirectUrl(request.url) };
  }
  let info: UserInfo | null = null;
  if (res?.ok) {
    try {
      info = (await res.json()) as UserInfo;
    } catch {
      info = null;
    }
  }
  if (!info?.access) {
    return {
      ok: false,
      reason: 'idp_unreachable',
      message: 'Il registro della scuola (auth.nicolocarello.it) non risponde. Riprova fra poco.',
      redirectTo: '',
    };
  }
  if (!info.access.allowed) {
    const reason = info.access.reason ?? 'no_class';
    return {
      ok: false,
      reason,
      message: info.access.message || 'Accesso non abilitato.',
      // L'area riservata dell'IdP spiega cosa manca e raccoglie la classe.
      redirectTo: `${AUTH_ORIGIN}/?gate=${reason}`,
    };
  }
  return { ok: true, info };
}

/** URL a cui rimandare il browser per il login, tornando poi alla pagina corrente. */
export function loginRedirectUrl(currentUrl: string): string {
  return `${AUTH_ORIGIN}/login?redirect=${encodeURIComponent(currentUrl)}`;
}
