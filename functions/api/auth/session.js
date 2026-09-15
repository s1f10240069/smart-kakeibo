import {
  SESSION_COOKIE,
  clearCookie,
  getConfig,
  jsonResponse,
  parseCookies,
  refreshAccessToken,
  unseal,
} from '../../../server/googleOAuth.js';

export async function onRequestGet({ request, env }) {
  try {
    const config = getConfig(env);
    const cookies = parseCookies(request);
    const sealedSession = cookies[SESSION_COOKIE];
    if (!sealedSession) return jsonResponse({ authenticated: false });

    const session = await unseal(sealedSession, config.sessionSecret);
    if (!session?.refreshToken || !session?.user) {
      return jsonResponse({ authenticated: false }, {
        headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE, request) },
      });
    }

    try {
      const tokens = await refreshAccessToken(config, session.refreshToken);
      return jsonResponse({
        authenticated: true,
        user: session.user,
        accessToken: tokens.access_token,
        expiresIn: Number(tokens.expires_in) || 3600,
      });
    } catch (error) {
      console.error('Access token refresh failed', error.code || error);
      const expired = error.status === 401;
      return jsonResponse({
        authenticated: false,
        reason: expired ? 'session_expired' : 'refresh_failed',
      }, {
        status: expired ? 401 : 502,
        headers: expired ? { 'Set-Cookie': clearCookie(SESSION_COOKIE, request) } : undefined,
      });
    }
  } catch (error) {
    console.error('Session request failed', error);
    return jsonResponse({ authenticated: false, reason: 'server_configuration' }, { status: 500 });
  }
}
