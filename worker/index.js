import { onRequestGet as startGoogleOAuth } from '../functions/api/auth/google/start.js';
import { onRequestGet as finishGoogleOAuth } from '../functions/api/auth/google/callback.js';
import { onRequestGet as getGoogleSession } from '../functions/api/auth/session.js';
import { onRequestPost as logoutGoogleSession } from '../functions/api/auth/logout.js';
import { jsonResponse } from '../server/googleOAuth.js';

const routes = new Map([
  ['GET /api/auth/google/start', startGoogleOAuth],
  ['GET /api/auth/google/callback', finishGoogleOAuth],
  ['GET /api/auth/session', getGoogleSession],
  ['POST /api/auth/logout', logoutGoogleSession],
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const routeKey = `${request.method} ${url.pathname.replace(/\/$/u, '') || '/'}`;
    const handler = routes.get(routeKey);
    if (handler) return handler({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });

    if (url.pathname.startsWith('/api/auth/')) {
      return jsonResponse({ error: 'not_found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
