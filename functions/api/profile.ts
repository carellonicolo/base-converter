/**
 * GET /api/profile — profilo dell'utente loggato (identità + ruolo + classi).
 *
 * Ritorna 401 se non c'è sessione: è la condizione NORMALE dell'app in
 * modalità libera, il frontend la gestisce senza mostrare errori.
 */
import { verifySession, fetchUserInfo } from '../_lib/sso';
import { jsonOk, jsonError, type Env } from '../_lib/shared';

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const identity = await verifySession(request);
  if (!identity) return jsonError(401, 'Nessuna sessione attiva.', 'unauthenticated');

  const info = await fetchUserInfo(request);
  const isTeacher = !!(info?.user.isTeacher || info?.user.isSuperAdmin);
  const classes = (info?.approvedClasses ?? []).map((c) => c.classe).filter(Boolean);

  return jsonOk({
    user: {
      id: identity.userId,
      email: identity.email,
      name: identity.name,
      status: info?.user.status ?? identity.status,
      isTeacher,
      isSuperAdmin: !!info?.user.isSuperAdmin,
      classes,
    },
  });
};
