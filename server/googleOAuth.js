// Shared only by Cloudflare Pages Functions; this file is not a public route.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE = 'smart_kakeibo_session';
export const OAUTH_STATE_COOKIE = 'smart_kakeibo_oauth_state';
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const STATE_MAX_AGE_SECONDS = 10 * 60;

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');

const base64UrlEncode = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const base64UrlDecode = (value) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const getEncryptionKey = async (secret) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const seal = async (value, secret) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey(secret);
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('smart-kakeibo-auth-v1') },
    key,
    plaintext,
  );
  return `${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
};

export const unseal = async (value, secret) => {
  if (!value || !value.includes('.')) return null;
  try {
    const [ivValue, ciphertextValue] = value.split('.', 2);
    const key = await getEncryptionKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlDecode(ivValue),
        additionalData: encoder.encode('smart-kakeibo-auth-v1'),
      },
      key,
      base64UrlDecode(ciphertextValue),
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
};

export const randomUrlSafeValue = (size = 32) => (
  base64UrlEncode(crypto.getRandomValues(new Uint8Array(size)))
);

export const createCodeChallenge = async (verifier) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
};

export const parseCookies = (request) => {
  const header = request.headers.get('Cookie') || '';
  return Object.fromEntries(header.split(';').map(part => {
    const separator = part.indexOf('=');
    if (separator < 0) return [part.trim(), ''];
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
};

export const serializeCookie = (name, value, request, { maxAge, path = '/api/auth' } = {}) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const age = Number.isFinite(maxAge) ? `; Max-Age=${Math.max(0, Math.floor(maxAge))}` : '';
  return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax${secure}${age}`;
};

export const clearCookie = (name, request, path = '/api/auth') => (
  serializeCookie(name, '', request, { maxAge: 0, path })
);

export const getConfig = (env) => {
  const config = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET,
    appOrigin: String(env.APP_ORIGIN || '').replace(/\/$/u, ''),
    allowedEmail: String(env.GOOGLE_ALLOWED_EMAIL || '').trim().toLowerCase(),
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing auth configuration: ${missing.join(', ')}`);
  if (config.sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const appUrl = new URL(config.appOrigin);
  const localDevelopment = appUrl.hostname === 'localhost' || appUrl.hostname === '127.0.0.1';
  if (appUrl.origin !== config.appOrigin || (!localDevelopment && appUrl.protocol !== 'https:')) {
    throw new Error('APP_ORIGIN must be an HTTPS origin without a path');
  }
  return {
    ...config,
    redirectUri: `${config.appOrigin}/api/auth/google/callback`,
  };
};

const tokenRequest = async (params) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('Google token request failed');
    error.code = body.error || 'token_request_failed';
    error.status = error.code === 'invalid_grant' ? 401 : 502;
    throw error;
  }
  return body;
};

export const exchangeAuthorizationCode = (config, code, codeVerifier) => tokenRequest({
  client_id: config.clientId,
  client_secret: config.clientSecret,
  code,
  code_verifier: codeVerifier,
  grant_type: 'authorization_code',
  redirect_uri: config.redirectUri,
});

export const refreshAccessToken = (config, refreshToken) => tokenRequest({
  client_id: config.clientId,
  client_secret: config.clientSecret,
  refresh_token: refreshToken,
  grant_type: 'refresh_token',
});

export const fetchGoogleProfile = async (accessToken) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Google profile request failed');
  const profile = await response.json();
  return {
    id: String(profile.sub || '').slice(0, 128),
    email: String(profile.email || '').slice(0, 320),
    name: String(profile.name || '').slice(0, 200),
    picture: String(profile.picture || '').slice(0, 2048),
  };
};

export const jsonResponse = (body, init = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
};

export const safeReturnPath = (value) => (
  typeof value === 'string'
    && value.length <= 2048
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !Array.from(value).some(char => char.charCodeAt(0) < 32)
    ? value
    : '/'
);

export const appendQuery = (path, key, value) => {
  const url = new URL(path, 'https://local.invalid');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
};

export const isAllowedOrigin = (request, appOrigin) => {
  const origin = request.headers.get('Origin');
  return !origin || origin === appOrigin;
};
