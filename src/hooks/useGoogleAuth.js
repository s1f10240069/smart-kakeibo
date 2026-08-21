import { useState, useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_FILE_NAME } from '../lib/googleConfig';
import { createDriveResponseError, getSyncFile } from '../lib/driveSync';

const AUTO_UPLOAD_DEBOUNCE_MS = 2500;
const PERIODIC_RESYNC_MS = 5 * 60 * 1000;
const FOCUS_RESYNC_THROTTLE_MS = 60 * 1000;
const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const MAX_SILENT_RETRIES = 4;
const SILENT_RETRY_BASE_MS = 30 * 1000;
const SILENT_RETRY_MAX_MS = 5 * 60 * 1000;

// Google OAuth ログインと Drive (appDataFolder) クラウド同期を管理するフック
export function useGoogleAuth({
  allTransactions, customRules, setAllTransactions, setCustomRules,
  needsReview, setNeedsReview, runGmailSync, localModifiedTick,
}) {
  const [googleUser, setGoogleUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kakeibo_google_user') || 'null'); } catch { return null; }
  });
  const [googleToken, setGoogleToken] = useState(() => localStorage.getItem('kakeibo_google_token') || '');
  const [syncStatus, setSyncStatus] = useState('');
  // 'idle' | 'syncing' | 'synced' | 'error' | 'needsLogin' — インジケーター表示用の粗い状態
  const [syncPhase, setSyncPhase] = useState('idle');
  const [reLoginNeeded, setReLoginNeeded] = useState(false);

  // uploadToCloud/downloadFromCloudが同時に走ってDriveへの書き込みが競合しないようにするロック
  const syncLockRef = useRef(false);

  const showSyncError = (err, action) => {
    const needsLogin = err?.status === 401 || err?.status === 403;
    const isNetworkError = err instanceof TypeError;
    const message = isNetworkError
      ? '通信できませんでした。ネット接続を確認して、もう一度お試しください。'
      : (err?.message || '不明なエラーが発生しました。');

    setSyncStatus(`❌ ${action}エラー: ${message}`);
    setSyncPhase(needsLogin ? 'needsLogin' : 'error');
    if (needsLogin) setReLoginNeeded(true);
  };

  const uploadToCloud = async (tokenArg) => {
    const token = tokenArg || googleToken;
    if (!token) return alert('Googleでログインしてください');
    if (syncLockRef.current) { setSyncStatus('⏳ 別の同期処理が進行中です。少し待って再試行してください'); return; }
    syncLockRef.current = true;
    setSyncPhase('syncing');
    try {
      setSyncStatus('📡 アップロード中...');
      const exportObj = { transactions: allTransactions, rules: customRules, needsReview, timestamp: new Date().toISOString() };
      const existing = await getSyncFile(token);
      let res;
      if (existing) {
        res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(exportObj),
        });
      } else {
        const boundary = 'kakeibo_boundary_' + Math.random().toString(36).slice(2);
        const metadata = { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
        const body =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(exportObj)}\r\n--${boundary}--`;
        res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        });
      }
      if (!res.ok) throw createDriveResponseError(res, 'クラウドへの保存');
      setSyncStatus('✅ データをGoogle Driveに保存しました');
      setSyncPhase('synced');
    } catch(err) { showSyncError(err, '保存'); }
    finally { syncLockRef.current = false; }
  };

  // existingを渡すとファイル検索を再実行せずに済む（自動同期からの呼び出し用）
  const downloadFromCloud = async (tokenArg, existingArg) => {
    const token = tokenArg || googleToken;
    if (!token) return alert('Googleでログインしてください');
    if (syncLockRef.current) { setSyncStatus('⏳ 別の同期処理が進行中です。少し待って再試行してください'); return; }
    syncLockRef.current = true;
    setSyncPhase('syncing');
    try {
      setSyncStatus('📡 読み込み中...');
      const existing = existingArg || await getSyncFile(token);
      if (!existing) { setSyncStatus('❌ クラウドにデータが見つかりません。'); setSyncPhase('error'); return; }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw createDriveResponseError(res, 'クラウドからの読み込み');

      const raw = await res.text();
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch {
        throw new Error('クラウドの保存データが壊れているため読み込めません。端末のデータは変更していません。');
      }
      const hasValidRules = obj?.rules === undefined
        || (obj.rules !== null && typeof obj.rules === 'object' && !Array.isArray(obj.rules));
      const hasValidReview = obj?.needsReview === undefined || Array.isArray(obj.needsReview);
      if (!obj || !Array.isArray(obj.transactions) || !hasValidRules || !hasValidReview) {
        throw new Error('クラウドの保存データの形式が正しくありません。端末のデータは変更していません。');
      }

      // 全項目の検証後にだけ端末データを更新し、途中まで上書きされた状態を防ぐ。
      const restoredRules = obj.rules ?? {};
      const restoredReview = obj.needsReview ?? [];
      setAllTransactions(obj.transactions);
      localStorage.setItem('kakeibo_data', JSON.stringify(obj.transactions));
      setCustomRules(restoredRules);
      localStorage.setItem('kakeibo_rules', JSON.stringify(restoredRules));
      setNeedsReview(restoredReview);
      // ダウンロード直後はローカル=クラウドの状態なので、クラウドの更新時刻に揃えておく
      // （Date.now()にすると「ローカルの方が新しい」と誤判定して次回すぐ再アップロードしてしまう）
      localStorage.setItem('kakeibo_local_modified', String(new Date(existing.modifiedTime).getTime()));
      setSyncStatus('✅ データを復元・同期しました！');
      setSyncPhase('synced');
    } catch(err) { showSyncError(err, '復元'); }
    finally { syncLockRef.current = false; }
  };
  // ログイン時・アプリ起動時・定期同期時に呼ばれる自動同期。クラウドとローカルの更新時刻を比較し、
  // 新しい方に揃える（古いクラウドデータでローカルの新しい変更を上書きしないため）。
  const autoSyncCloud = async (tokenArg) => {
    const token = tokenArg || googleToken;
    if (!token) return;
    try {
      const existing = await getSyncFile(token);
      if (!existing) { await uploadToCloud(token); return; }
      const cloudModified = new Date(existing.modifiedTime).getTime();
      const localModified = parseInt(localStorage.getItem('kakeibo_local_modified') || '0', 10);
      if (cloudModified > localModified + 1000) {
        await downloadFromCloud(token, existing);
      } else if (localModified > cloudModified + 1000) {
        await uploadToCloud(token);
      } else {
        setSyncStatus('✅ 最新の状態です');
        setSyncPhase('synced');
      }
    } catch(err) { showSyncError(err, '同期'); }
  };

  const onGoogleTokenReceived = async (token, expiresIn) => {
    const expiry = Date.now() + expiresIn * 1000;
    setGoogleToken(token);
    localStorage.setItem('kakeibo_google_token', token);
    localStorage.setItem('kakeibo_google_token_expiry', String(expiry));
    silentFailureCountRef.current = 0;
    setReLoginNeeded(false);
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const u = await res.json();
        const profile = { email: u.email, name: u.name, picture: u.picture };
        setGoogleUser(profile);
        localStorage.setItem('kakeibo_google_user', JSON.stringify(profile));
        setSyncStatus(`✅ ${u.email} としてログインしました！`);
      }
    } catch(e) { console.error(e); }
    await autoSyncCloud(token);
    runGmailSync(token);
  };

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.oauth2) { setSyncStatus('❌ Google連携を読み込み中です。数秒待って再度お試しください。'); return; }
    setSyncStatus('🔄 Googleに接続中...');
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (resp.error) { setSyncStatus(`❌ エラー: ${resp.error}`); return; }
        onGoogleTokenReceived(resp.access_token, resp.expires_in);
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  };

  // サイレント再ログインの連続失敗回数。setTimeoutチェーンをまたいで参照するのでrefで保持。
  const silentFailureCountRef = useRef(0);

  const trySilentGoogleLogin = (attempt = 0) => {
    if (!window.google?.accounts?.oauth2) {
      if (attempt > 20) return; // ~6秒待って読み込まれなければ諦める（手動ログインボタンから再試行可能）
      setTimeout(() => trySilentGoogleLogin(attempt + 1), 300);
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (!resp.error) { onGoogleTokenReceived(resp.access_token, resp.expires_in); return; }
        silentFailureCountRef.current += 1;
        if (silentFailureCountRef.current > MAX_SILENT_RETRIES) {
          // 何度もサイレント再認証に失敗する場合のみユーザーに再ログインを促す
          // （Cookie制限・同意の取り消し・明示ログアウトなど）
          setReLoginNeeded(true);
          setSyncPhase('needsLogin');
          setSyncStatus('⚠️ 再ログインが必要です');
          return;
        }
        const backoffMs = Math.min(SILENT_RETRY_BASE_MS * 2 ** (silentFailureCountRef.current - 1), SILENT_RETRY_MAX_MS);
        setTimeout(() => trySilentGoogleLogin(), backoffMs);
      },
    });
    client.requestAccessToken({ prompt: '' });
  };

  const handleGoogleLogout = () => {
    if (googleToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(googleToken, () => {});
    }
    setGoogleUser(null); setGoogleToken('');
    localStorage.removeItem('kakeibo_google_user');
    localStorage.removeItem('kakeibo_google_token');
    localStorage.removeItem('kakeibo_google_token_expiry');
    silentFailureCountRef.current = 0;
    setReLoginNeeded(false);
    setSyncPhase('idle');
    setSyncStatus('ログアウトしました。');
  };

  // タイマー/インターバルのコールバックは登録時点のクロージャに固定されがちなので、
  // 常に最新の関数を呼べるようrefに逃がしておく（古いallTransactions/customRulesで
  // 上書きアップロードしてしまう事故を防ぐ）
  const latestRef = useRef({});
  useEffect(() => {
    latestRef.current = { uploadToCloud, autoSyncCloud, runGmailSync, trySilentGoogleLogin };
  });

  // 1) ローカル変更後のデバウンス自動アップロード
  const isFirstTick = useRef(true);
  useEffect(() => {
    if (isFirstTick.current) { isFirstTick.current = false; return; }
    if (!googleToken) return;
    const timerId = setTimeout(() => { latestRef.current.uploadToCloud(); }, AUTO_UPLOAD_DEBOUNCE_MS);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localModifiedTick]);

  // 2) 定期・タブ復帰時の再同期（他デバイス・他タブでの変更を拾う）
  useEffect(() => {
    if (!googleUser) return;
    const doResync = () => {
      const t = localStorage.getItem('kakeibo_google_token');
      const exp = parseInt(localStorage.getItem('kakeibo_google_token_expiry') || '0', 10);
      if (t && exp > Date.now()) {
        latestRef.current.autoSyncCloud(t);
        latestRef.current.runGmailSync(t);
      }
    };
    const intervalId = setInterval(doResync, PERIODIC_RESYNC_MS);

    let lastVisTrigger = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastVisTrigger < FOCUS_RESYNC_THROTTLE_MS) return;
      lastVisTrigger = Date.now();
      doResync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [googleUser]);

  // 3) トークン失効前の先行サイレント更新（開きっぱなしのタブでも失効パスに入らないようにする）
  useEffect(() => {
    if (!googleToken) return;
    const exp = parseInt(localStorage.getItem('kakeibo_google_token_expiry') || '0', 10);
    if (!exp) return;
    const delay = (exp - TOKEN_REFRESH_MARGIN_MS) - Date.now();
    if (delay <= 0) { latestRef.current.trySilentGoogleLogin(); return; }
    const timerId = setTimeout(() => latestRef.current.trySilentGoogleLogin(), delay);
    return () => clearTimeout(timerId);
  }, [googleToken]);

  return {
    googleUser, syncStatus, syncPhase, reLoginNeeded,
    handleGoogleLogin, handleGoogleLogout, trySilentGoogleLogin,
    uploadToCloud, downloadFromCloud, autoSyncCloud,
  };
}
