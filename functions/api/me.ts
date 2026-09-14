/**
 * GET /api/me — identità SSO grezza (endpoint standard delle app consumer,
 * previsto dalla guida di integrazione dell'IdP).
 *
 * 401 anche a chi è loggato ma non abilitato sull'IdP: per l'app è lo stesso.
 * Se l'IdP non risponde vale la firma: il cookie condiviso lo ha solo chi è
 * abilitato.
 */
import { requireAppAccess, verifySession } from '../_lib/sso';
import type { Env } from '../_lib/shared';

const unauthenticated = () =>
  new Response(JSON.stringify({ authenticated: false }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const gate = await requireAppAccess(request);
  if (!gate.ok && gate.reason !== 'idp_unreachable') return unauthenticated();
  const identity = await verifySession(request);
  if (!identity) return unauthenticated();
  return new Response(JSON.stringify({ authenticated: true, user: identity }), {
    headers: { 'content-type': 'application/json' },
  });
};
