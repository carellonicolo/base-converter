/**
 * GET  /api/student/progress — progressi salvati dell'utente.
 * PUT  /api/student/progress — salva/aggiorna i progressi.
 *
 * Basta un account valido (anche in attesa di approvazione): i progressi della
 * palestra sono personali e non danno accesso alle verifiche.
 */
import { jsonOk, jsonError, requireUser, type Env } from '../../_lib/shared';

interface Body {
  progress?: unknown;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireUser(request);
  if (access instanceof Response) return access;

  try {
    const row = await env.DB.prepare(`SELECT data FROM bc_progress WHERE user_id = ?`)
      .bind(access.identity.userId)
      .first<{ data: string }>();
    if (!row) return jsonOk({ progress: null });
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      parsed = null;
    }
    return jsonOk({ progress: parsed });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireUser(request);
  if (access instanceof Response) return access;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }
  if (!body.progress || typeof body.progress !== 'object') {
    return jsonError(400, 'Campo "progress" mancante.');
  }

  const serialized = JSON.stringify(body.progress);
  // Limite di sicurezza: i progressi sono un oggetto piccolo.
  if (serialized.length > 20000) return jsonError(413, 'Progressi troppo grandi.');

  try {
    await env.DB.prepare(
      `INSERT INTO bc_progress (user_id, email, full_name, data, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         data = excluded.data,
         email = excluded.email,
         full_name = excluded.full_name,
         updated_at = excluded.updated_at`
    )
      .bind(access.identity.userId, access.identity.email, access.identity.name, serialized, new Date().toISOString())
      .run();
    return jsonOk({ saved: true });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
