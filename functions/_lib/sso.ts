/**
 * VERIFICATORE SSO — da copiare in functions/_lib/sso.ts di OGNI app consumer.
 *
 * Verifica il cookie di sessione `nc_session` emesso dall'Identity Provider
 * usando SOLO la chiave PUBBLICA scaricata da /.well-known/jwks.json.
 * Nessun segreto condiviso: l'app puo' verificare ma non forgiare token.
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
 * Ritorna l'identita' se il token e' valido (firma + scadenza + issuer), altrimenti null.
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

  let payload: { iss?: string; sub?: string; email?: string; name?: string; status?: string; exp?: number };
  try {
    payload = JSON.parse(base64urlToString(p));
  } catch {
    return null;
  }
  if (payload.iss !== ISSUER) return null;
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
 * Recupera i dati FRESCHI dell'utente (stato + classi approvate) dall'IdP,
 * inoltrando il cookie della richiesta. Usalo per il GATE delle verifiche.
 */
export async function fetchUserInfo(request: Request): Promise<{
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    role: 'student' | 'teacher' | 'super_admin';
    isTeacher: boolean;
    isSuperAdmin: boolean;
  };
  approvedClasses: { scuola: string; classe: string; annoScolastico: string }[];
} | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const res = await fetch(`${AUTH_ORIGIN}/api/userinfo`, { headers: { cookie } });
  if (!res.ok) return null;
  return (await res.json()) as never;
}

/** URL a cui rimandare il browser per il login, tornando poi alla pagina corrente. */
export function loginRedirectUrl(currentUrl: string): string {
  return `${AUTH_ORIGIN}/login?redirect=${encodeURIComponent(currentUrl)}`;
}
