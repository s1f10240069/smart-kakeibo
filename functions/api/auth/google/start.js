import {
  GOOGLE_SCOPES,
  OAUTH_STATE_COOKIE,
  STATE_MAX_AGE_SECONDS,
  createCodeChallenge,
  getConfig,
  randomUrlSafeValue,
  safeReturnPath,
  seal,
  serializeCookie,
} from '../../../../server/googleOAuth.js';

export async function onRequestGet({ request, env }) {
  try {
    const config = getConfig(env);
    const requestUrl = new URL(request.url);
    const state = randomUrlSafeValue();
    const codeVerifier = randomUrlSafeValue(64);
    const stateCookie = await seal({
      state,
      codeVerifier,
      returnTo: safeReturnPath(requestUrl.searchParams.get('returnTo')),
      createdAt: Date.now(),
    }, config.sessionSecret);

    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
      code_challenge: await createCodeChallenge(codeVerifier),
      code_challenge_method: 'S256',
    }).toString();

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl.toString(),
        'Set-Cookie': serializeCookie(OAUTH_STATE_COOKIE, stateCookie, request, {
          maxAge: STATE_MAX_AGE_SECONDS,
        }),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('OAuth start failed', error);
    return new Response('Google認証の設定が完了していません。管理者に連絡してください。', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
