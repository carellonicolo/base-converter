/**
 * GET  /api/teacher/config — elenco configurazioni per classe + master switch.
 * PUT  /api/teacher/config — salva la configurazione di una classe.
 * DELETE /api/teacher/config?class=X — rimuove la configurazione di una classe.
 *
 * Solo docente (isTeacher || isSuperAdmin).
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listClassConfigs, upsertClassConfig, deleteClassConfig, getExamsEnabled, setSetting } from '../../_lib/examdb';
import { parseConfig, DEFAULT_CONFIG, DEFAULT_CLASS } from '../../../shared/exam/config';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;
  try {
    const [classes, enabled] = await Promise.all([listClassConfigs(env), getExamsEnabled(env)]);
    return jsonOk({ classes, examsEnabled: enabled, defaults: DEFAULT_CONFIG, defaultClass: DEFAULT_CLASS });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

interface PutBody {
  class?: string;
  config?: unknown;
  examsEnabled?: boolean;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }

  try {
    // Master-switch globale (indipendente dalle classi).
    if (typeof body.examsEnabled === 'boolean') {
      await setSetting(env, 'exams_enabled', body.examsEnabled ? 'true' : 'false');
    }
    if (body.class !== undefined && body.config !== undefined) {
      const cls = String(body.class).trim() || DEFAULT_CLASS;
      if (cls.length > 40) return jsonError(400, 'Nome classe troppo lungo.');
      await upsertClassConfig(env, cls, parseConfig(body.config), access.identity.email);
    }
    const classes = await listClassConfigs(env);
    return jsonOk({ saved: true, classes, examsEnabled: await getExamsEnabled(env) });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;
  const cls = new URL(request.url).searchParams.get('class');
  if (!cls) return jsonError(400, 'Parametro "class" mancante.');
  try {
    await deleteClassConfig(env, cls);
    return jsonOk({ deleted: true, classes: await listClassConfigs(env) });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
