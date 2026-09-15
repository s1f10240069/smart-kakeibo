import test from 'node:test';
import assert from 'node:assert/strict';

import {
  safeReturnPath,
  seal,
  unseal,
} from '../server/googleOAuth.js';
import { onRequestGet as startOAuth } from '../functions/api/auth/google/start.js';
import { onRequestGet as finishOAuth } from '../functions/api/auth/google/callback.js';
import { onRequestGet as getSession } from '../functions/api/auth/session.js';

const env = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-characters',
  APP_ORIGIN: 'https://example.pages.dev',
  GOOGLE_ALLOWED_EMAIL: 'me@example.com',
};

test('sealed session round-trips and rejects the wrong key', async () => {
  const value = { refreshToken: 'secret', user: { email: 'me@example.com' } };
  const sealed = await seal(value, env.SESSION_SECRET);
  assert.deepEqual(await unseal(sealed, env.SESSION_SECRET), value);
  assert.equal(await unseal(sealed, 'another-key-that-is-at-least-32-characters'), null);
});

test('return path validation rejects open redirects', () => {
  assert.equal(safeReturnPath('/settings?tab=google'), '/settings?tab=google');
  assert.equal(safeReturnPath('//evil.example'), '/');
  assert.equal(safeReturnPath('/\\evil.example'), '/');
});

test('anonymous session is reported without contacting Google', async () => {
  const response = await getSession({
    request: new Request(`${env.APP_ORIGIN}/api/auth/session`),
    env,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: false });
});

test('authorization callback creates a refreshable session', async () => {
  const startResponse = await startOAuth({
    request: new Request(`${env.APP_ORIGIN}/api/auth/google/start?returnTo=%2Fsettings`),
    env,
  });
  assert.equal(startResponse.status, 302);
  const authorizationUrl = new URL(startResponse.headers.get('Location'));
  assert.equal(authorizationUrl.searchParams.get('access_type'), 'offline');
  assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256');

  const stateCookie = startResponse.headers.get('Set-Cookie').split(';')[0];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/token')) {
      return Response.json({ access_token: 'initial-access', refresh_token: 'refresh-token', expires_in: 3600 });
    }
    if (url.includes('/userinfo')) {
      return Response.json({ sub: '123', email: 'me@example.com', name: 'Me', picture: '' });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const callbackUrl = new URL(`${env.APP_ORIGIN}/api/auth/google/callback`);
    callbackUrl.searchParams.set('code', 'authorization-code');
    callbackUrl.searchParams.set('state', authorizationUrl.searchParams.get('state'));
    const callbackResponse = await finishOAuth({
      request: new Request(callbackUrl, { headers: { Cookie: stateCookie } }),
      env,
    });
    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get('Location'), `${env.APP_ORIGIN}/settings?auth=success`);

    const sessionMatch = callbackResponse.headers.get('Set-Cookie').match(/smart_kakeibo_session=([^;,]+)/u);
    assert.ok(sessionMatch);
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/token')) return Response.json({ access_token: 'refreshed-access', expires_in: 3600 });
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const sessionResponse = await getSession({
      request: new Request(`${env.APP_ORIGIN}/api/auth/session`, {
        headers: { Cookie: `smart_kakeibo_session=${sessionMatch[1]}` },
      }),
      env,
    });
    const session = await sessionResponse.json();
    assert.equal(session.authenticated, true);
    assert.equal(session.accessToken, 'refreshed-access');
    assert.equal(session.user.email, 'me@example.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
