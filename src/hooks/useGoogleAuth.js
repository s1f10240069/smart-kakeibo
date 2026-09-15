import { useState, useEffect, useRef } from 'react';
import { DRIVE_FILE_NAME } from '../lib/googleConfig';
import { createDriveResponseError, getSyncFile } from '../lib/driveSync';
import { LAST_SYNCED_CLOUD_MODIFIED_KEY, mergeCloudData } from '../lib/cloudSync';
import { normalizeTransactions } from '../lib/dates';
import {
  clearGoogleSessionCache,
  getGoogleAccessToken,
  getGoogleSession,
  logoutGoogleSession,
  startGoogleLogin,
} from '../lib/googleSession';

const AUTO_UPLOAD_DEBOUNCE_MS = 2500;
const PERIODIC_RESYNC_MS = 5 * 60 * 1000;
const FOCUS_RESYNC_THROTTLE_MS = 60 * 1000;

// Google OAuth ログインと Drive (appDataFolder) クラウド同期を管理するフック
export function useGoogleAuth({
  allTransactions, customRules, setAllTransactions, setCustomRules,
  needsReview, setNeedsReview, runGmailSync, localModifiedTick, cloudSettings, restoreCloudSettings,
}) {
  const [googleUser, setGoogleUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('ログイン状態を確認中...');
  // 'idle' | 'checking' | 'syncing' | 'synced' | 'error' | 'needsLogin'
  const [syncPhase, setSyncPhase] = useState('checking');
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

  const uploadToCloud = async (tokenArg, dataArg, existingArg) => {
    const token = tokenArg || await getGoogleAccessToken();
    if (!token) { alert('Googleでログインしてください'); return false; }
    if (syncLockRef.current) { setSyncStatus('⏳ 別の同期処理が進行中です。少し待って再試行してください'); return false; }
    syncLockRef.current = true;
    setSyncPhase('syncing');
    const uploadedLocalModified = localStorage.getItem('kakeibo_local_modified');
    try {
      setSyncStatus('📡 アップロード中...');
      const exportObj = dataArg || {
        version: 2,
        transactions: allTransactions,
        rules: customRules,
        needsReview,
        settings: cloudSettings,
        timestamp: new Date().toISOString(),
      };
      const existing = existingArg || await getSyncFile(token);
      let res;
      if (existing) {
        res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,modifiedTime`, {
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
        res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        });
      }
      if (!res.ok) throw createDriveResponseError(res, 'クラウドへの保存');
      const savedFile = await res.json();
      const savedModified = new Date(savedFile.modifiedTime).getTime();
      if (Number.isFinite(savedModified)) {
        localStorage.setItem(LAST_SYNCED_CLOUD_MODIFIED_KEY, String(savedModified));
        // 保存中に追加の編集がなかった場合だけ、ローカルも同期済みの時刻へ揃える。
        if (localStorage.getItem('kakeibo_local_modified') === uploadedLocalModified) {
          localStorage.setItem('kakeibo_local_modified', String(savedModified));
        }
      }
      setSyncStatus('✅ データをGoogle Driveに保存しました');
      setSyncPhase('synced');
      return true;
    } catch(err) { showSyncError(err, '保存'); return false; }
    finally { syncLockRef.current = false; }
  };

  // existingを渡すとファイル検索を再実行せずに済む（自動同期からの呼び出し用）
  const downloadFromCloud = async (tokenArg, existingArg) => {
    const token = tokenArg || await getGoogleAccessToken();
    if (!token) { alert('Googleでログインしてください'); return false; }
    if (syncLockRef.current) { setSyncStatus('⏳ 別の同期処理が進行中です。少し待って再試行してください'); return false; }
    syncLockRef.current = true;
    setSyncPhase('syncing');
    try {
      setSyncStatus('📡 読み込み中...');
      const existing = existingArg || await getSyncFile(token);
      if (!existing) { setSyncStatus('❌ クラウドにデータが見つかりません。'); setSyncPhase('error'); return false; }
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
      const settings = obj?.settings;
      const gmailSettings = settings?.gmail;
      const hasValidSettings = settings === undefined || (
        settings !== null
        && typeof settings === 'object'
        && !Array.isArray(settings)
        && (settings.geminiApiKey === undefined || typeof settings.geminiApiKey === 'string')
        && (gmailSettings === undefined || (
          gmailSettings !== null
          && typeof gmailSettings === 'object'
          && !Array.isArray(gmailSettings)
          && (gmailSettings.senders === undefined || (
            Array.isArray(gmailSettings.senders) && gmailSettings.senders.every(v => typeof v === 'string')
          ))
          && (gmailSettings.parseLabels === undefined || (
            gmailSettings.parseLabels !== null
            && typeof gmailSettings.parseLabels === 'object'
            && ['amount', 'date', 'merchant'].every(key => (
              Array.isArray(gmailSettings.parseLabels[key])
              && gmailSettings.parseLabels[key].every(v => typeof v === 'string')
            ))
          ))
        ))
      );
      if (!obj || !Array.isArray(obj.transactions) || !hasValidRules || !hasValidReview || !hasValidSettings) {
        throw new Error('クラウドの保存データの形式が正しくありません。端末のデータは変更していません。');
      }

      // 全項目の検証後にだけ端末データを更新し、途中まで上書きされた状態を防ぐ。
      const restoredRules = obj.rules ?? {};
      const restoredReview = obj.needsReview ?? [];
      const restoredTransactions = normalizeTransactions(obj.transactions);
      setAllTransactions(restoredTransactions);
      localStorage.setItem('kakeibo_data', JSON.stringify(restoredTransactions));
      setCustomRules(restoredRules);
      localStorage.setItem('kakeibo_rules', JSON.stringify(restoredRules));
      setNeedsReview(restoredReview);
      if (settings !== undefined) restoreCloudSettings(settings);
      // ダウンロード直後はローカル=クラウドの状態なので、クラウドの更新時刻に揃えておく
      // （Date.now()にすると「ローカルの方が新しい」と誤判定して次回すぐ再アップロードしてしまう）
      localStorage.setItem('kakeibo_local_modified', String(new Date(existing.modifiedTime).getTime()));
      localStorage.setItem(LAST_SYNCED_CLOUD_MODIFIED_KEY, String(new Date(existing.modifiedTime).getTime()));
      setSyncStatus('✅ データを復元・同期しました！');
      setSyncPhase('synced');
      return true;
    } catch(err) { showSyncError(err, '復元'); return false; }
    finally { syncLockRef.current = false; }
  };
  // ログイン時・アプリ起動時・定期同期時に呼ばれる自動同期。クラウドとローカルの更新時刻を比較し、
  // 新しい方に揃える（古いクラウドデータでローカルの新しい変更を上書きしないため）。
  const autoSyncCloud = async (tokenArg) => {
    const token = tokenArg || await getGoogleAccessToken();
    if (!token) return false;
    try {
      setSyncPhase('checking');
      setSyncStatus('🔎 最新のデータを確認中...');
      const existing = await getSyncFile(token);
      if (!existing) return await uploadToCloud(token);
      const cloudModified = new Date(existing.modifiedTime).getTime();
      const localModified = parseInt(localStorage.getItem('kakeibo_local_modified') || '0', 10);
      const lastSyncedCloudModified = parseInt(localStorage.getItem(LAST_SYNCED_CLOUD_MODIFIED_KEY) || '0', 10);
      const mergeAndUpload = async () => {
        setSyncStatus('🔄 端末とクラウドの変更を統合中...');
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw createDriveResponseError(res, 'クラウドからの読み込み');
        const cloudData = await res.json();
        const hasValidRules = cloudData?.rules === undefined
          || (cloudData.rules !== null && typeof cloudData.rules === 'object' && !Array.isArray(cloudData.rules));
        const hasValidReview = cloudData?.needsReview === undefined || Array.isArray(cloudData.needsReview);
        if (!cloudData || !Array.isArray(cloudData.transactions) || !hasValidRules || !hasValidReview) {
          throw new Error('クラウドの保存データの形式が正しくありません。端末のデータは変更していません。');
        }
        const localData = {
          transactions: allTransactions,
          rules: customRules,
          needsReview,
          settings: cloudSettings,
        };
        const merged = mergeCloudData(localData, cloudData, localModified >= cloudModified);
        setAllTransactions(merged.transactions);
        localStorage.setItem('kakeibo_data', JSON.stringify(merged.transactions));
        setCustomRules(merged.rules);
        localStorage.setItem('kakeibo_rules', JSON.stringify(merged.rules));
        setNeedsReview(merged.needsReview);
        if (merged.settings) restoreCloudSettings(merged.settings);
        return await uploadToCloud(token, merged, existing);
      };

      // 新しい同期方式へ移行する初回は共通の同期点が分からないため、
      // 時刻だけで片方を捨てずに両方の明細を統合する。
      if (!lastSyncedCloudModified) {
        if (!localModified || allTransactions.length === 0) {
          return await downloadFromCloud(token, existing);
        } else if (Math.abs(cloudModified - localModified) <= 1000) {
          localStorage.setItem(LAST_SYNCED_CLOUD_MODIFIED_KEY, String(cloudModified));
          setSyncStatus('✅ 最新の状態です');
          setSyncPhase('synced');
          return true;
        } else {
          return await mergeAndUpload();
        }
      }

      const cloudChanged = cloudModified > lastSyncedCloudModified + 1000;
      const localChanged = localModified > lastSyncedCloudModified + 1000;
      if (cloudChanged && localChanged) {
        return await mergeAndUpload();
      } else if (cloudChanged) {
        return await downloadFromCloud(token, existing);
      } else if (localChanged) {
        return await uploadToCloud(token, undefined, existing);
      } else {
        localStorage.setItem(LAST_SYNCED_CLOUD_MODIFIED_KEY, String(cloudModified));
        setSyncStatus('✅ 最新の状態です');
        setSyncPhase('synced');
        return true;
      }
    } catch(err) { showSyncError(err, '同期'); return false; }
  };

  // 起動・画面復帰・画面遷移から同時に呼ばれても、最新確認は常に1本だけ実行する。
  // Gmailで新着が見つかった場合は、Reactの再描画を待たずlocalStorageの最新値を即時保存する。
  const latestCheckPromiseRef = useRef(null);
  const ensureLatest = (tokenArg) => {
    if (latestCheckPromiseRef.current) return latestCheckPromiseRef.current;

    const task = (async () => {
      const token = tokenArg || await getGoogleAccessToken();
      if (!token) return { ok: false };
      const cloudOk = await autoSyncCloud(token);
      if (!cloudOk) return { ok: false };
      setSyncPhase('checking');
      setSyncStatus('🔎 Gmailの新着明細を確認中...');
      const gmailResult = await runGmailSync(token);
      if (gmailResult?.error) {
        showSyncError(gmailResult.error, 'Gmail確認');
        return { ok: false };
      }
      if (gmailResult?.changed) {
        const snapshot = {
          version: 2,
          transactions: JSON.parse(localStorage.getItem('kakeibo_data') || '[]'),
          rules: JSON.parse(localStorage.getItem('kakeibo_rules') || '{}'),
          needsReview: JSON.parse(localStorage.getItem('kakeibo_gmail_needs_review') || '[]'),
          settings: {
            geminiApiKey: localStorage.getItem('kakeibo_aikey') || '',
            gmail: {
              senders: JSON.parse(localStorage.getItem('kakeibo_gmail_senders') || '[]'),
              parseLabels: JSON.parse(localStorage.getItem('kakeibo_gmail_labels') || 'null') || cloudSettings.gmail.parseLabels,
            },
          },
          timestamp: new Date().toISOString(),
        };
        const uploadOk = await uploadToCloud(token, snapshot);
        return { ok: uploadOk, changed: true };
      } else {
        setSyncStatus('✅ 最新の状態です');
        setSyncPhase('synced');
        return { ok: true, changed: false };
      }
    })().catch(err => showSyncError(err, '最新確認'));
    latestCheckPromiseRef.current = task;
    task.finally(() => {
      if (latestCheckPromiseRef.current === task) latestCheckPromiseRef.current = null;
    });
    return task;
  };

  const handleGoogleLogin = () => {
    setSyncStatus('🔄 Googleに接続中...');
    startGoogleLogin();
  };

  const refreshServerSession = async () => {
    const session = await getGoogleSession({ force: true });
    setGoogleUser(session.user);
    if (session.authenticated) {
      localStorage.setItem('kakeibo_google_user', JSON.stringify(session.user));
      setReLoginNeeded(false);
      return session;
    }
    localStorage.removeItem('kakeibo_google_user');
    return session;
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogleSession();
      setGoogleUser(null);
      localStorage.removeItem('kakeibo_google_user');
      setReLoginNeeded(false);
      setSyncPhase('idle');
      setSyncStatus('ログアウトしました。');
    } catch (error) {
      setSyncPhase('error');
      setSyncStatus(`❌ ${error.message}`);
    }
  };

  const runGmailSyncWithAuth = async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      setReLoginNeeded(true);
      setSyncPhase('needsLogin');
      setSyncStatus('⚠️ 再ログインが必要です');
      return { changed: false };
    }
    return runGmailSync(token);
  };

  // タイマー/インターバルのコールバックは登録時点のクロージャに固定されがちなので、
  // 常に最新の関数を呼べるようrefに逃がしておく（古いallTransactions/customRulesで
  // 上書きアップロードしてしまう事故を防ぐ）
  const latestRef = useRef({});
  useEffect(() => {
    latestRef.current = { uploadToCloud, autoSyncCloud, ensureLatest, runGmailSyncWithAuth, refreshServerSession };
  });

  // 起動時はHttpOnly Cookieのサーバーセッションを確認し、成功した場合だけ同期を開始する。
  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const authResult = params.get('auth');
        if (authResult) {
          params.delete('auth');
          const nextUrl = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`;
          window.history.replaceState(null, '', nextUrl);
        }

        const session = await getGoogleSession({ force: true });
        if (cancelled) return;
        setGoogleUser(session.user);
        setAuthReady(true);
        if (!session.authenticated) {
          localStorage.removeItem('kakeibo_google_user');
          setSyncPhase('idle');
          setSyncStatus(authResult && authResult !== 'success'
            ? '❌ Googleログインを完了できませんでした。もう一度お試しください。'
            : '');
          return;
        }
        localStorage.setItem('kakeibo_google_user', JSON.stringify(session.user));
        setSyncStatus(authResult === 'success'
          ? `✅ ${session.user.email} としてログインしました！`
          : '🔎 最新のデータを確認中...');
        latestRef.current.ensureLatest(session.accessToken);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        clearGoogleSessionCache();
        setGoogleUser(null);
        setAuthReady(true);
        setSyncPhase('error');
        setSyncStatus(`❌ ${error.message}`);
      }
    };
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // 1) ローカル変更後のデバウンス自動アップロード
  const isFirstTick = useRef(true);
  useEffect(() => {
    if (isFirstTick.current) { isFirstTick.current = false; return; }
    if (!googleUser) return;
    const timerId = setTimeout(() => { latestRef.current.uploadToCloud(); }, AUTO_UPLOAD_DEBOUNCE_MS);
    return () => clearTimeout(timerId);
  }, [localModifiedTick, googleUser]);

  // 2) 定期・タブ復帰時の再同期（他デバイス・他タブでの変更を拾う）
  useEffect(() => {
    if (!googleUser) return;
    let resyncRunning = false;
    const doResync = async () => {
      if (resyncRunning) return;
      resyncRunning = true;
      try {
        await latestRef.current.ensureLatest();
      } finally {
        resyncRunning = false;
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

  return {
    googleUser,
    authReady,
    isAuthenticated: Boolean(googleUser),
    syncStatus, syncPhase, reLoginNeeded,
    handleGoogleLogin, handleGoogleLogout,
    runGmailSync: runGmailSyncWithAuth,
    uploadToCloud, downloadFromCloud, autoSyncCloud, ensureLatest,
  };
}
