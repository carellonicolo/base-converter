/**
 * GET /api/me — identità SSO grezza (endpoint standard delle app consumer,
 * previsto dalla guida di integrazione dell'IdP).
 */
import { verifySession } from '../_lib/sso';
import type { Env } from '../_lib/shared';

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const identity = await verifySession(request);
  if (!identity) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ authenticated: true, user: identity }), {
    headers: { 'content-type': 'application/json' },
  });
};
