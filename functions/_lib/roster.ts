/**
 * Il registro degli studenti, letto dall'Identity Provider.
 *
 * Si inoltra LATO SERVER il cookie del docente a /api/admin/users di AUTH,
 * che restituisce una lista già ristretta a ciò che quel docente può vedere
 * (tutto per il super-admin, le sue classi per un docente). Nessun segreto
 * condiviso, nessun CORS: è una fetch worker → worker.
 *
 * Va chiamato SOLO dopo `requireTeacher`. Se AUTH non risponde ritorna
 * `null`: il chiamante decide se degradare (classi note dal DB) o dirlo.
 */

const AUTH_ORIGIN = 'https://auth.nicolocarello.it';

export interface RosterUser {
  id: string;
  email: string;
  name: string;
  /** Nome e cognome separati dall'IdP, quando li conosce. */
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  role?: string;
  isSuperAdmin?: boolean;
  lastLoginAt?: string | null;
  enrollments?: { classe?: string; approved?: boolean }[];
}

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  /** Classi approvate. */
  classes: string[];
  lastLoginAt: string | null;
}

export async function fetchRoster(request: Request): Promise<RosterUser[] | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  try {
    const res = await fetch(`${AUTH_ORIGIN}/api/admin/users`, { headers: { cookie } });
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: RosterUser[] };
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return null;
  }
}

/** Solo gli studenti: docenti e super-admin non sono studenti di nessuno. */
export function rosterStudents(users: RosterUser[]): RosterStudent[] {
  return users
    .filter((u) => u.id && !u.isSuperAdmin && (u.role ?? 'student') === 'student')
    .map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      status: u.status,
      classes: (u.enrollments ?? []).filter((e) => e.approved && e.classe).map((e) => e.classe as string),
      lastLoginAt: u.lastLoginAt ?? null,
    }));
}

/** Le classi approvate presenti nel registro, in ordine «4AI» prima di «10AI». */
export function rosterClasses(users: RosterUser[]): string[] {
  const set = new Set<string>();
  for (const u of users) for (const e of u.enrollments ?? []) if (e.approved && e.classe) set.add(e.classe);
  return sortClasses(set);
}

export function sortClasses(classes: Iterable<string>): string[] {
  return [...classes].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}

/**
 * I nomi divisi dall'IdP, per chiave del nome completo: la console li usa per
 * mostrare «Cognome Nome» senza indovinare dove finisce il nome. Solo quelli
 * coerenti col nome completo (un nome cambiato dopo la divisione non deve
 * prendersi la divisione di un altro).
 */
export function knownNames(students: Iterable<Pick<RosterStudent, 'name' | 'firstName' | 'lastName'>>): Record<string, { nome: string; cognome: string }> {
  const clean = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ');
  const out = new Map<string, { nome: string; cognome: string }>();
  for (const s of students) {
    const nome = clean(s.firstName);
    const cognome = clean(s.lastName);
    const key = clean(s.name).toLocaleLowerCase('it');
    if (!nome || !cognome || !key) continue;
    if (`${nome} ${cognome}`.toLocaleLowerCase('it') !== key) continue;
    out.set(key, { nome, cognome });
  }
  return Object.fromEntries(out);
}
