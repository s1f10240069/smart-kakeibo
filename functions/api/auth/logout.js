import {
  SESSION_COOKIE,
  clearCookie,
  getConfig,
  isAllowedOrigin,
  jsonResponse,
  parseCookies,
  unseal,
} from '../../../server/googleOAuth.js';

export async function onRequestPost({ request, env }) {
  try {
    const config = getConfig(env);
    if (!isAllowedOrigin(request, config.appOrigin)) {
      return jsonResponse({ ok: false }, { status: 403 });
    }

    const cookies = parseCookies(request);
    const session = await unseal(cookies[SESSION_COOKIE], config.sessionSecret);
    if (session?.refreshToken) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: session.refreshToken }),
        });
      } catch (error) {
        console.error('Google token revocation failed', error.code || error);
      }
    }

    return jsonResponse({ ok: true }, {
      headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE, request) },
    });
  } catch (error) {
    console.error('Logout failed', error);
    return jsonResponse({ ok: false }, {
      status: 500,
      headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE, request) },
    });
  }
}
