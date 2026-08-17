import { useState } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_FILE_NAME } from '../lib/googleConfig';
import { getSyncFile } from '../lib/driveSync';

// Google OAuth ログインと Drive (appDataFolder) クラウド同期を管理するフック
export function useGoogleAuth({ allTransactions, customRules, setAllTransactions, setCustomRules, runGmailSync }) {
  const [googleUser, setGoogleUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kakeibo_google_user') || 'null'); } catch { return null; }
  });
  const [googleToken, setGoogleToken] = useState(() => localStorage.getItem('kakeibo_google_token') || '');
  const [syncStatus, setSyncStatus] = useState('');

  const uploadToCloud = async (tokenArg) => {
    const token = tokenArg || googleToken;
    if (!token) return alert('Googleでログインしてください');
    try {
      setSyncStatus('📡 アップロード中...');
      const exportObj = { transactions: allTransactions, rules: customRules, timestamp: new Date().toISOString() };
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
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `失敗(${res.status})`); }
      setSyncStatus('✅ データをGoogle Driveに保存しました');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
  };

  // existingを渡すとファイル検索を再実行せずに済む（自動同期からの呼び出し用）
  const downloadFromCloud = async (tokenArg, existingArg) => {
    const token = tokenArg || googleToken;
    if (!token) return alert('Googleでログインしてください');
    try {
      setSyncStatus('📡 読み込み中...');
      const existing = existingArg || await getSyncFile(token);
      if (!existing) { setSyncStatus('❌ クラウドにデータが見つかりません。'); return; }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`ダウンロード失敗 (${res.status})`);
      const obj = await res.json();
      if (obj.transactions) { setAllTransactions(obj.transactions); localStorage.setItem('kakeibo_data', JSON.stringify(obj.transactions)); }
      if (obj.rules) { setCustomRules(obj.rules); localStorage.setItem('kakeibo_rules', JSON.stringify(obj.rules)); }
      // ダウンロード直後はローカル=クラウドの状態なので、クラウドの更新時刻に揃えておく
      // （Date.now()にすると「ローカルの方が新しい」と誤判定して次回すぐ再アップロードしてしまう）
      localStorage.setItem('kakeibo_local_modified', String(new Date(existing.modifiedTime).getTime()));
      setSyncStatus('✅ データを復元・同期しました！');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
  };
  // ログイン時・アプリ起動時に呼ばれる自動同期。クラウドとローカルの更新時刻を比較し、
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
      }
    } catch(err) { setSyncStatus(`❌ 同期エラー: ${err.message}`); }
  };

  const onGoogleTokenReceived = async (token, expiresIn) => {
    const expiry = Date.now() + expiresIn * 1000;
    setGoogleToken(token);
    localStorage.setItem('kakeibo_google_token', token);
    localStorage.setItem('kakeibo_google_token_expiry', String(expiry));
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

  const trySilentGoogleLogin = (attempt = 0) => {
    if (!window.google?.accounts?.oauth2) {
      if (attempt > 20) return; // ~6秒待って読み込まれなければ諦める（手動ログインボタンから再試行可能）
      setTimeout(() => trySilentGoogleLogin(attempt + 1), 300);
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => { if (!resp.error) onGoogleTokenReceived(resp.access_token, resp.expires_in); },
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
    setSyncStatus('ログアウトしました。');
  };

  return {
    googleUser, syncStatus,
    handleGoogleLogin, handleGoogleLogout, trySilentGoogleLogin,
    uploadToCloud, downloadFromCloud, autoSyncCloud,
  };
}

