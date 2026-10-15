/**
 * Il nome di uno studente come lo usa la scuola: «Cognome Nome».
 *
 * Il nome arriva come «Nome Cognome», il display_name dell'IdP: qui lo si
 * gira soltanto per mostrarlo e per ordinare, senza toccare il dato salvato.
 *
 * Dove finisce il nome e comincia il cognome lo dice l'IdP, che tiene i due
 * campi separati: le Functions li affiancano alle risposte (`nomi`) e il
 * client li registra con `registerNames`. Per un nome che l'IdP non ha
 * ancora diviso si ricorre a una regola: il cognome è l'ultima parola, con
 * le particelle che la precedono («Maria De Luca» → «De Luca Maria»).
 *
 * Stessa regola di VLSM (src/lib/nomi.ts), perché lo stesso studente non
 * cambi nome passando da un'app all'altra.
 */

const PARTICLES = new Set([
  'da', 'dai', 'dal', 'dall', 'dalla', 'dalle', 'dallo', 'de', 'degli', 'dei', 'del', 'dell', 'della', 'delle', 'dello',
  'di', 'la', 'le', 'li', 'lo', 'mc', 'san', 'santa', 'santo', 'van', 'von',
]);

export interface SplitName {
  nome: string;
  cognome: string;
}

const clean = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ');
const keyOf = (full: string | null | undefined) => clean(full).toLocaleLowerCase('it');

/** I nomi divisi arrivati dall'IdP finora. */
const registry = new Map<string, SplitName>();

/** Registra il campo `nomi` di una risposta. Ignora ciò che non ha la forma giusta. */
export function registerNames(nomi: unknown): void {
  if (!nomi || typeof nomi !== 'object') return;
  for (const [k, v] of Object.entries(nomi as Record<string, unknown>)) {
    const n = v as Partial<SplitName> | null;
    if (n && typeof n.nome === 'string' && typeof n.cognome === 'string' && n.nome && n.cognome) {
      registry.set(keyOf(k), { nome: n.nome, cognome: n.cognome });
    }
  }
}

/** Per i test. */
export function forgetNames(): void {
  registry.clear();
}

export function splitName(full: string | null | undefined): SplitName {
  const c = clean(full);
  const known = registry.get(keyOf(c));
  if (known) return { ...known };
  const comma = c.indexOf(',');
  if (comma >= 0) return { cognome: c.slice(0, comma).trim(), nome: c.slice(comma + 1).trim() };
  const words = c.split(' ').filter(Boolean);
  if (words.length < 2) return { nome: '', cognome: c };
  let start = words.length - 1;
  // Almeno una parola resta al nome: «De Luca» da solo è un cognome.
  while (start > 1 && PARTICLES.has(words[start - 1].toLowerCase().replace(/['’]$/, ''))) start -= 1;
  return { nome: words.slice(0, start).join(' '), cognome: words.slice(start).join(' ') };
}

/** «Mario Rossi» → «Rossi Mario»: come si mostra e come si ordina uno studente. */
export function surnameFirst(full: string | null | undefined): string {
  const { nome, cognome } = splitName(full);
  return nome ? `${cognome} ${nome}` : cognome;
}
