const REFRESH_MARGIN_MS = 10 * 60 * 1000;

let cachedSession = {
  authenticated: false,
  user: null,
  accessToken: '',
  expiresAt: 0,
};
let pendingRequest = null;

const clearLegacyBrowserTokens = () => {
  localStorage.removeItem('kakeibo_google_token');
  localStorage.removeItem('kakeibo_google_token_expiry');
};

export const clearGoogleSessionCache = () => {
  cachedSession = { authenticated: false, user: null, accessToken: '', expiresAt: 0 };
  clearLegacyBrowserTokens();
};

export const getGoogleSession = async ({ force = false } = {}) => {
  if (!force && cachedSession.authenticated && cachedSession.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cachedSession;
  }
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 401) {
      throw new Error(body.reason === 'server_configuration'
        ? 'Google認証のサーバー設定が完了していません。'
        : 'ログイン状態を確認できませんでした。');
    }
    if (!body.authenticated || !body.accessToken || !body.user) {
      clearGoogleSessionCache();
      return cachedSession;
    }
    clearLegacyBrowserTokens();
    cachedSession = {
      authenticated: true,
      user: body.user,
      accessToken: body.accessToken,
      expiresAt: Date.now() + (Number(body.expiresIn) || 3600) * 1000,
    };
    return cachedSession;
  })().finally(() => { pendingRequest = null; });

  return pendingRequest;
};

export const getGoogleAccessToken = async () => {
  const session = await getGoogleSession();
  return session.accessToken || '';
};

export const startGoogleLogin = () => {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
};

export const logoutGoogleSession = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('ログアウトできませんでした。通信状態を確認してください。');
  clearGoogleSessionCache();
};
