/**
 * Il PERIMETRO del docente: quali classi, quali studenti e quali prove vede
 * e gestisce nella console. Stessa regola di VLSM (functions/_lib/perimetro.ts).
 *
 * Lo decide l'IdP, non l'app:
 *   - le CLASSI sono quelle che il super-admin gli ha assegnato su AUTH per
 *     l'anno in corso (`teacherClasses` di /api/userinfo);
 *   - gli STUDENTI sono quelli che /api/admin/users gli restituisce, già
 *     filtrati da AUTH per le sue classi.
 * Il super-admin non ha perimetro: vede e gestisce tutto.
 *
 * Una prova è del docente se è di uno studente suo, oppure se appartiene a
 * un'assegnazione sua (data a una sua classe): così la sessione di una sua
 * classe resta intera anche se uno studente, nel frattempo, ha cambiato
 * classe.
 *
 * Il filtro sta sul server: una lista filtrata solo dal browser è una lista
 * completa consegnata a chi apre gli strumenti per sviluppatori.
 */
import { jsonError, type TeacherAccess } from './shared';
import { fetchRoster, rosterStudents, sortClasses, type RosterStudent, type RosterUser } from './roster';
import { getAssignment, listAssignmentTargets, type AssignmentRow } from './examdb';
import type { Env } from './shared';

export interface Perimeter {
  superAdmin: boolean;
  /** Classi dell'anno, in forma canonica. Vuoto per il super-admin, che non ne ha bisogno. */
  classes: Set<string>;
  /** Studenti del registro visti dal docente; `null` = nessun limite (super-admin). */
  students: Set<string> | null;
  /** Il registro com'è arrivato da AUTH; `null` se non ha risposto. */
  roster: RosterUser[] | null;
}

/** La forma canonica di AUTH: «4 ci» e «4CI» sono la stessa classe. */
export function normalizeClass(c: string): string {
  return c.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Il perimetro di chi chiama. Per un docente il registro non è un di più:
 * senza, non si sa quali studenti siano suoi, e si risponde 502 invece di
 * mostrare tutto o niente. Il super-admin ne fa a meno.
 */
export async function loadPerimeter(
  request: Request,
  access: TeacherAccess,
  opts: { rosterOptional?: boolean } = {}
): Promise<Perimeter | Response> {
  const roster = await fetchRoster(request);
  if (!access.superAdmin && !roster && !opts.rosterOptional) {
    return jsonError(
      502,
      'Registro non raggiungibile: senza auth.nicolocarello.it non si sa quali studenti sono delle tue classi. Riprova fra poco.',
      'no_roster'
    );
  }
  return {
    superAdmin: access.superAdmin,
    classes: new Set(access.teacherClasses.map(normalizeClass)),
    students: access.superAdmin ? null : new Set(rosterStudents(roster ?? []).map((s) => s.id)),
    roster,
  };
}

/** La classe è del docente? Sempre, per il super-admin. */
export function ownsClass(p: Perimeter, cls: string | null | undefined): boolean {
  if (p.superAdmin) return true;
  return !!cls && p.classes.has(normalizeClass(cls));
}

/** Lo studente è del docente? Sempre, per il super-admin. */
export function seesStudent(p: Perimeter, studentId: string | null | undefined): boolean {
  if (p.students === null) return true;
  return !!studentId && p.students.has(studentId);
}

/** L'assegnazione è del docente: di una sua classe, o personale a un suo studente. */
export function ownsAssignment(p: Perimeter, a: Pick<AssignmentRow, 'target_type' | 'class' | 'target_student'>): boolean {
  if (p.superAdmin) return true;
  if (a.target_type === 'student') return seesStudent(p, a.target_student) || ownsClass(p, a.class);
  return ownsClass(p, a.class);
}

/** La prova è del docente: di un suo studente, o di una sua assegnazione. */
export function seesAttempt(p: Perimeter, a: { user_id: string; assignment_id: string | null }, ownedAssignments: ReadonlySet<string>): boolean {
  if (p.superAdmin) return true;
  return seesStudent(p, a.user_id) || (!!a.assignment_id && ownedAssignments.has(a.assignment_id));
}

/**
 * Le classi da mostrare: per il super-admin tutte quelle note; per un
 * docente solo le sue, scritte come le scrive il registro (è la chiave con
 * cui lo studente cerca la verifica), più quelle assegnate che non hanno
 * ancora nessuno studente.
 */
export function visibleClasses(p: Perimeter, known: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const c of known) if (c && ownsClass(p, c)) out.add(c);
  if (!p.superAdmin) {
    const present = new Set([...out].map(normalizeClass));
    for (const c of p.classes) if (!present.has(c)) out.add(c);
  }
  return sortClasses(out);
}

/** Gli studenti del registro, già ristretti da AUTH al perimetro del docente. */
export function perimeterStudents(p: Perimeter): RosterStudent[] {
  return p.roster ? rosterStudents(p.roster) : [];
}

/**
 * Il filtro SQL per le liste di prove: va nella query e non dopo, perché con
 * il LIMIT filtrare dopo lascerebbe il docente con meno righe di quelle che
 * ha. `null` per il super-admin.
 */
export function attemptScope(p: Perimeter, ownedAssignments: ReadonlySet<string>): { studentIds: string[]; assignmentIds: string[] } | null {
  if (p.superAdmin) return null;
  return { studentIds: [...(p.students ?? [])], assignmentIds: [...ownedAssignments] };
}

export function outsidePerimeter(what: string): Response {
  return jsonError(403, `${what} non è delle tue classi.`, 'forbidden');
}

/** Gli id delle assegnazioni del docente (tutte, per il super-admin). */
export async function ownedAssignmentIds(env: Env, p: Perimeter): Promise<Set<string>> {
  const all = await listAssignmentTargets(env);
  return new Set(all.filter((a) => ownsAssignment(p, a)).map((a) => a.id));
}

/** Una prova sola: di un suo studente, o della sua assegnazione. */
export async function attemptInPerimeter(env: Env, p: Perimeter, a: { user_id: string; assignment_id: string | null }): Promise<boolean> {
  if (seesStudent(p, a.user_id)) return true;
  if (!a.assignment_id) return false;
  const asg = await getAssignment(env, a.assignment_id);
  return !!asg && ownsAssignment(p, asg);
}

/**
 * Le classi di uno studente come le vede il docente: solo le sue, se lo
 * studente ne ha più d'una (a settembre il registro tiene anche quella
 * dell'anno prima). Se nessuna è sua, tutte: lo studente è nel suo registro
 * per una ragione che AUTH conosce, e non deve finire «senza classe».
 */
export function classesInView(p: Perimeter, classes: string[]): string[] {
  if (p.superAdmin) return classes;
  const mine = classes.filter((c) => ownsClass(p, c));
  return mine.length ? mine : classes;
}
