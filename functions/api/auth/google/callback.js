import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STATE_MAX_AGE_SECONDS,
  appendQuery,
  clearCookie,
  exchangeAuthorizationCode,
  fetchGoogleProfile,
  getConfig,
  parseCookies,
  safeReturnPath,
  seal,
  serializeCookie,
  unseal,
} from '../../../../server/googleOAuth.js';

const redirectWithResult = (config, path, result, request, sessionCookie) => {
  const headers = new Headers({
    Location: `${config.appOrigin}${appendQuery(path, 'auth', result)}`,
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE, request));
  if (sessionCookie) headers.append('Set-Cookie', sessionCookie);
  return new Response(null, { status: 302, headers });
};

export async function onRequestGet({ request, env }) {
  let config;
  try {
    config = getConfig(env);
    const url = new URL(request.url);
    const cookies = parseCookies(request);
    const savedState = await unseal(cookies[OAUTH_STATE_COOKIE], config.sessionSecret);
    const returnTo = safeReturnPath(savedState?.returnTo);

    if (url.searchParams.get('error')) {
      return redirectWithResult(config, returnTo, 'cancelled', request);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const stateIsFresh = savedState?.createdAt > Date.now() - STATE_MAX_AGE_SECONDS * 1000;
    if (!code || !state || state !== savedState?.state || !savedState?.codeVerifier || !stateIsFresh) {
      return redirectWithResult(config, returnTo, 'invalid-state', request);
    }

    const tokens = await exchangeAuthorizationCode(config, code, savedState.codeVerifier);
    if (!tokens.refresh_token || !tokens.access_token) {
      console.error('OAuth callback did not return the required tokens');
      return redirectWithResult(config, returnTo, 'missing-refresh-token', request);
    }

    const user = await fetchGoogleProfile(tokens.access_token);
    if (user.email.toLowerCase() !== config.allowedEmail) {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: tokens.refresh_token }),
      }).catch(error => console.error('Unauthorized account token revocation failed', error));
      return redirectWithResult(config, returnTo, 'account-not-allowed', request);
    }
    const sealedSession = await seal({
      version: 1,
      refreshToken: tokens.refresh_token,
      user,
      createdAt: Date.now(),
    }, config.sessionSecret);
    const sessionCookie = serializeCookie(SESSION_COOKIE, sealedSession, request, {
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return redirectWithResult(config, returnTo, 'success', request, sessionCookie);
  } catch (error) {
    console.error('OAuth callback failed', error);
    if (!config) {
      return new Response('Google認証の設定が完了していません。', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    return redirectWithResult(config, '/', 'error', request);
  }
}
