/**
 * GET /api/teacher/live — le prove in corso, per «Sessioni live».
 *
 * Prima consegna le prove abbandonate oltre la scadenza (lo farebbe comunque
 * la prossima lettura dello studente): così l'elenco non tiene per sempre
 * una prova di un computer spento. Per ogni prova: avanzamento, tempo
 * residuo, ultimo segnale, distrazioni, uscite dallo schermo intero,
 * ammonizioni.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { finalizeAbandoned, listInProgress } from '../../_lib/examdb';
import { answeredCount, attemptView } from '../../_lib/views';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  try {
    await finalizeAbandoned(env);
    const rows = await listInProgress(env);
    return jsonOk({
      live: rows.map((r) => ({ ...attemptView(r), ...answeredCount(r) })),
      now: new Date().toISOString(),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
