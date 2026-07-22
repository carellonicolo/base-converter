/**
 * Sincronizzazione dei progressi con il server (D1), solo per utenti loggati.
 *
 * Modello ibrido: localStorage è sempre la fonte immediata (funziona offline e
 * senza login); il server è la copia condivisa tra dispositivi. In caso di
 * divergenza si tiene il massimo di ogni metrica (vedi mergeProgress).
 */

import { authFetch } from './auth';
import { mergeProgress, type Progress } from './progress';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Progress | null = null;

/** Invia i progressi al server, accorpando le chiamate ravvicinate. */
export function pushProgress(p: Progress, delayMs = 1500): void {
  pending = p;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const payload = pending;
    pending = null;
    pushTimer = null;
    if (!payload) return;
    void authFetch('/api/student/progress', {
      method: 'PUT',
      body: JSON.stringify({ progress: payload }),
    });
  }, delayMs);
}

/** Scarica i progressi dal server e li fonde con quelli locali. */
export async function pullProgress(local: Progress): Promise<Progress> {
  const res = await authFetch<{ progress: Progress | null }>('/api/student/progress');
  if (!res.ok || !res.data?.progress) return local;
  return mergeProgress(local, res.data.progress);
}
