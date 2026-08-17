import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Home, List, Settings } from 'lucide-react';
import { listUsageMessageIds, fetchAndParseMessages, parseUsageEmail, DEFAULT_PARSE_LABELS } from './gmailSync';
import { CATEGORY_MAP, categorize, formatCurrency } from './lib/categories';
import { parseOneFile, readFileAsText } from './lib/csv';
import { callGemini, AI_PROMPT, applyAiResultsToData } from './lib/gemini';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_FILE_NAME } from './lib/googleConfig';
import { getSyncFile } from './lib/driveSync';
import MonthCalendarModal from './components/MonthCalendarModal';
import MonthSwitcher from './components/MonthSwitcher';
import Sidebar from './components/Sidebar';
import WelcomeView from './components/views/WelcomeView';
import HomeView from './components/views/HomeView';
import ListView from './components/views/ListView';
import SettingsView from './components/views/SettingsView';
import './index.css';

// ===== メインアプリ =====
export default function App() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [customRules, setCustomRules]         = useState({});
  const [geminiKey, setGeminiKey]             = useState('');
  const [googleUser, setGoogleUser]           = useState(null); // { email, name, picture }
  const [googleToken, setGoogleToken]         = useState('');
  const [gmailSenders, setGmailSenders]       = useState([]);
  const [senderInput, setSenderInput]         = useState('');
  const [parseLabels, setParseLabels]         = useState(DEFAULT_PARSE_LABELS); // {amount, date, merchant}
  const [labelInputs, setLabelInputs]         = useState({ amount: '', date: '', merchant: '' });
  const [gmailSyncStatus, setGmailSyncStatus] = useState('');
  const [needsReview, setNeedsReview]         = useState([]); // [{id, subject, bodyText}]
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [isAiLoading, setIsAiLoading]         = useState(false);
  const [aiAllMonthsLoading, setAiAllMonthsLoading] = useState(false);
  const [aiProgress, setAiProgress]           = useState('');
  const [syncStatus, setSyncStatus]           = useState('');
  const [showKey, setShowKey]                 = useState(false);
  const [showCalendar, setShowCalendar]       = useState(false);
  const [view, setView]                       = useState('home');
  const [targetMonth, setTargetMonth]         = useState('');
  const [expandedCat, setExpandedCat]         = useState(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem('kakeibo_data');   if (d) setAllTransactions(JSON.parse(d) || []);
      const r = localStorage.getItem('kakeibo_rules');  if (r) setCustomRules(JSON.parse(r) || {});
      const k = localStorage.getItem('kakeibo_aikey'); if (k) setGeminiKey(k);
      const senders = localStorage.getItem('kakeibo_gmail_senders'); if (senders) setGmailSenders(JSON.parse(senders) || []);
      const labels = localStorage.getItem('kakeibo_gmail_labels'); if (labels) setParseLabels(JSON.parse(labels));
      const review = localStorage.getItem('kakeibo_gmail_needs_review'); if (review) setNeedsReview(JSON.parse(review) || []);
      const u = localStorage.getItem('kakeibo_google_user'); if (u) setGoogleUser(JSON.parse(u));
      const t = localStorage.getItem('kakeibo_google_token');
      const exp = parseInt(localStorage.getItem('kakeibo_google_token_expiry') || '0', 10);
      if (t && exp > Date.now()) {
        // 有効なトークンが残っている → 起動時に自動でクラウド同期＋メールをキャッチアップ
        setGoogleToken(t);
        autoSyncCloud(t).then(() => runGmailSync(t));
      } else if (u) {
        // トークン切れ → サイレント再取得を試みる（失敗時はログインボタンのみ表示）
        trySilentGoogleLogin();
      }
    } catch(e) { console.error(e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableMonths = useMemo(() => {
    const s = new Set();
    allTransactions.forEach(t => {
      const p = t.date.split('/');
      if (p.length >= 2) s.add(`${p[0]}/${p[1]}`);
      else s.add('不明な日付');
    });
    return Array.from(s).sort().reverse();
  }, [allTransactions]);

  useEffect(() => {
    if (!targetMonth && availableMonths.length > 0) setTargetMonth(availableMonths[0]);
    else if (targetMonth && !availableMonths.includes(targetMonth) && availableMonths.length > 0)
      setTargetMonth(availableMonths[0]);
  }, [availableMonths, targetMonth]);

  // 月別合計（サイドバー用）
  const monthTotals = useMemo(() => {
    const totals = {};
    allTransactions.forEach(t => {
      const p = t.date.split('/');
      if (p.length >= 2) { const m = `${p[0]}/${p[1]}`; totals[m] = (totals[m] || 0) + t.amount; }
    });
    return totals;
  }, [allTransactions]);

  const { filteredTx, summary, chartData, groupedTxs } = useMemo(() => {
    let filtered = allTransactions;
    if (targetMonth) {
      filtered = allTransactions.filter(t =>
        t.date.startsWith(targetMonth) || (targetMonth === '不明な日付' && !t.date.includes('/'))
      );
    }
    filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    let totalExp = 0;
    const catTotals = {};
    const groups = {};
    filtered.forEach(tx => {
      totalExp += tx.amount;
      catTotals[tx.catKey] = (catTotals[tx.catKey] || 0) + tx.amount;
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });

    const cData = Object.keys(catTotals).map(k => ({
      name: CATEGORY_MAP[k].name, value: catTotals[k], color: CATEGORY_MAP[k].color, key: k
    })).sort((a, b) => b.value - a.value);

    const gTx = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(d => ({ date: d, items: groups[d] }));
    return { filteredTx: filtered, summary: totalExp, chartData: cData, groupedTxs: gTx };
  }, [allTransactions, targetMonth]);

  const prevMonthData = useMemo(() => {
    if (!targetMonth || targetMonth === '不明な日付') return null;
    const idx = availableMonths.indexOf(targetMonth);
    if (idx === -1 || idx >= availableMonths.length - 1) return null;
    const prevMonth = availableMonths[idx + 1];
    const prevTx = allTransactions.filter(t => t.date.startsWith(prevMonth));
    let total = 0; const catTotals = {};
    prevTx.forEach(tx => { total += tx.amount; catTotals[tx.catKey] = (catTotals[tx.catKey] || 0) + tx.amount; });
    return { month: prevMonth, total, catTotals };
  }, [allTransactions, targetMonth, availableMonths]);

  const allMonthsSummary = useMemo(() =>
    availableMonths.slice().reverse().map(m => {
      const total = allTransactions.filter(t => t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
      const label = m.replace(/^20(\d{2})\/0?(\d+)$/, `'$1/$2`);
      return { month: m, label, total };
    }), [allTransactions, availableMonths]);

  const changeMonth = (delta) => {
    const idx = availableMonths.indexOf(targetMonth);
    if (idx === -1) return;
    const ni = idx + delta;
    if (ni >= 0 && ni < availableMonths.length) setTargetMonth(availableMonths[ni]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    let db = [...allTransactions]; let total = 0;
    for (const file of files) {
      const text = await readFileAsText(file);
      const res = await parseOneFile(text, db, customRules);
      db = res.db; total += res.count;
    }
    setAllTransactions(db);
    localStorage.setItem('kakeibo_data', JSON.stringify(db));
    touchLocalModified();
    if (files.length > 1) alert(`${files.length}件のCSVをまとめてインポートしました！\n合計 ${total}件追加。`);
    setView('home');
    e.target.value = '';
  };

  const updateCategory = (txId, newCatKey) => {
    const tx = allTransactions.find(t => t.id === txId); if (!tx) return;
    const newRules = { ...customRules, [tx.desc]: newCatKey };
    setCustomRules(newRules); localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));
    const updated = allTransactions.map(t => t.desc === tx.desc ? { ...t, catKey: newCatKey } : t);
    setAllTransactions(updated); localStorage.setItem('kakeibo_data', JSON.stringify(updated));
    touchLocalModified();
  };

  const applyAiResults = (aiResults, baseTxs, baseRules) => {
    const { newRules, updatedTxs, learnedCount } = applyAiResultsToData(aiResults, baseTxs, baseRules);
    setCustomRules(newRules); localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));
    setAllTransactions(updatedTxs); localStorage.setItem('kakeibo_data', JSON.stringify(updatedTxs));
    touchLocalModified();
    return learnedCount;
  };

  const runAiCategorization = async () => {
    if (!geminiKey) return alert('設定でGeminiのAPIキーを入力してください！');
    const others = filteredTx.filter(t => t.catKey === 'Others');
    if (others.length === 0) return alert('この月の「その他」はありません ✨');
    setIsAiLoading(true);
    try {
      const aiResults = await callGemini(AI_PROMPT([...new Set(others.map(t => t.desc))]), geminiKey);
      const n = applyAiResults(aiResults, allTransactions, customRules);
      alert(`${n}件をAIが仕分け・学習しました！✨`);
    } catch(err) { alert('AIエラー: ' + err.message); }
    finally { setIsAiLoading(false); }
  };

  const runAiCategorizationAllMonths = async () => {
    if (!geminiKey) return alert('設定でGeminiのAPIキーを入力してください！');
    const others = allTransactions.filter(t => t.catKey === 'Others');
    if (others.length === 0) return alert('全月で未分類はありません ✨');
    if (!window.confirm(`全月合計 ${others.length}件を一括AI解析します。実行しますか？`)) return;

    const uniqueDescs = [...new Set(others.map(t => t.desc))];
    setAiAllMonthsLoading(true);
    setAiProgress(`💭 ${uniqueDescs.length}種類の決済名をAIに送信中...`);
    try {
      const BATCH = 50;
      const allAiResults = {};
      const batches = Array.from({ length: Math.ceil(uniqueDescs.length / BATCH) }, (_, i) => uniqueDescs.slice(i * BATCH, (i + 1) * BATCH));
      for (let bi = 0; bi < batches.length; bi++) {
        setAiProgress(`🤖 AI解析中... (${bi + 1}/${batches.length}バッチ)`);
        const res = await callGemini(AI_PROMPT(batches[bi]), geminiKey);
        Object.assign(allAiResults, res);
        if (bi < batches.length - 1) await new Promise(r => setTimeout(r, 500));
      }
      setAiProgress('💾 学習データを保存中...');
      const n = applyAiResults(allAiResults, allTransactions, customRules);
      setAiProgress(`✅ 完了！${n}種類をAIが仕分け・学習しました！`);
      setTimeout(() => setAiProgress(''), 4000);
    } catch(err) {
      setAiProgress(`❌ エラー: ${err.message}`);
      setTimeout(() => setAiProgress(''), 5000);
    } finally { setAiAllMonthsLoading(false); }
  };

  // ----- Google ログイン（Identity Services トークンクライアント） -----
  // ※ Google Cloud ConsoleでOAuthクライアントID（ウェブアプリケーション）を作成し、下記に設定する。
  // クライアントIDは非機密情報のためソースへの直書きで問題ない（client_secretは一切使用しない）。
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

  // ----- Google Drive (appDataFolder) クラウド同期 -----
  // ローカルの変更時刻を記録し、クラウド(Driveのファイル更新時刻)と比べて
  // 新しい方に揃える単純な自動同期（Dropbox的な「最後に更新された方が勝つ」方式）に使う。
  const touchLocalModified = () => localStorage.setItem('kakeibo_local_modified', String(Date.now()));

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

  // ----- Gmail 利用速報メールの自動取込 -----
  const addGmailSender = () => {
    const v = senderInput.trim();
    if (!v || gmailSenders.includes(v)) { setSenderInput(''); return; }
    const next = [...gmailSenders, v];
    setGmailSenders(next);
    localStorage.setItem('kakeibo_gmail_senders', JSON.stringify(next));
    setSenderInput('');
  };

  const removeGmailSender = (value) => {
    const next = gmailSenders.filter(s => s !== value);
    setGmailSenders(next);
    localStorage.setItem('kakeibo_gmail_senders', JSON.stringify(next));
  };

  // メール解析キーワード（金額/日付/利用先）の追加・削除
  const addParseLabel = (category) => {
    const v = labelInputs[category].trim();
    if (!v || parseLabels[category].includes(v)) { setLabelInputs({ ...labelInputs, [category]: '' }); return; }
    const next = { ...parseLabels, [category]: [...parseLabels[category], v] };
    setParseLabels(next);
    localStorage.setItem('kakeibo_gmail_labels', JSON.stringify(next));
    setLabelInputs({ ...labelInputs, [category]: '' });
  };

  const removeParseLabel = (category, value) => {
    const next = { ...parseLabels, [category]: parseLabels[category].filter(v => v !== value) };
    setParseLabels(next);
    localStorage.setItem('kakeibo_gmail_labels', JSON.stringify(next));
  };

  const saveNeedsReview = (list) => {
    setNeedsReview(list);
    localStorage.setItem('kakeibo_gmail_needs_review', JSON.stringify(list));
  };

  const addTransactionFromParsed = (db, rules, result, msgId) => {
    db.push({
      id: Math.random().toString(36).substr(2, 9),
      date: result.date,
      desc: result.desc || '利用先不明',
      amount: result.amount,
      catKey: categorize(result.desc || '', rules),
      source: 'gmail',
      gmailMsgId: msgId,
    });
    return db;
  };

  // 「要確認」の1件を、現在保存済みのキーワードで再解析する（メール本文はキャッシュ済み）
  const retryParseReview = (item) => {
    const labels = JSON.parse(localStorage.getItem('kakeibo_gmail_labels') || 'null') || DEFAULT_PARSE_LABELS;
    const result = parseUsageEmail(item.bodyText, labels);
    if (!result) { alert('まだ抽出できませんでした。キーワードを見直してください。'); return; }

    const rules = JSON.parse(localStorage.getItem('kakeibo_rules') || '{}');
    const db = addTransactionFromParsed(JSON.parse(localStorage.getItem('kakeibo_data') || '[]'), rules, result, item.id);
    setAllTransactions(db);
    localStorage.setItem('kakeibo_data', JSON.stringify(db));
    touchLocalModified();
    saveNeedsReview(needsReview.filter(r => r.id !== item.id));
  };

  // localStorageから直接読み書きすることで、呼び出しタイミング（起動直後のstate反映前など）に
  // 依存せず安全にマージできるようにしている。
  // 「要確認」で保留中のメールは日時での絞り込みに関係なく毎回ローカルで再解析し直すため、
  // 一度取りこぼした古いメールもキーワードを直せば拾い直せる。
  const runGmailSync = async (tokenArg) => {
    const token = tokenArg || googleToken;
    if (!token) return;
    const senders = JSON.parse(localStorage.getItem('kakeibo_gmail_senders') || '[]');
    if (senders.length === 0) { setGmailSyncStatus('設定で送信元メールアドレスを追加してください'); return; }
    try {
      const labels = JSON.parse(localStorage.getItem('kakeibo_gmail_labels') || 'null') || DEFAULT_PARSE_LABELS;
      const rules = JSON.parse(localStorage.getItem('kakeibo_rules') || '{}');
      let db = JSON.parse(localStorage.getItem('kakeibo_data') || '[]');
      let pending = JSON.parse(localStorage.getItem('kakeibo_gmail_needs_review') || '[]');
      let resolvedCount = 0;

      // 1. 保留中の「要確認」メールを、現在のキーワードでまずローカル再解析（API呼び出し不要）
      if (pending.length > 0) {
        setGmailSyncStatus(`🔁 保留中の${pending.length}件を再解析中...`);
        const stillPending = [];
        pending.forEach(item => {
          const result = item.bodyText ? parseUsageEmail(item.bodyText, labels) : null;
          if (result) { db = addTransactionFromParsed(db, rules, result, item.id); resolvedCount++; }
          else stillPending.push(item);
        });
        pending = stillPending;
      }

      // 2. 新着メールを検索（前回同期以降。初回は過去90日分）
      setGmailSyncStatus('🔍 新着メールを検索中...');
      const lastSyncStr = localStorage.getItem('kakeibo_gmail_last_sync');
      const sinceTs = lastSyncStr
        ? Math.floor(new Date(lastSyncStr).getTime() / 1000)
        : Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
      const ids = await listUsageMessageIds(token, senders, sinceTs);
      const knownIds = new Set([
        ...db.filter(t => t.gmailMsgId).map(t => t.gmailMsgId),
        ...pending.map(r => r.id),
      ]);
      const newIds = ids.filter(id => !knownIds.has(id));

      if (newIds.length > 0) {
        const { parsed, needsReview: nr } = await fetchAndParseMessages(token, newIds, labels, (done, total) =>
          setGmailSyncStatus(`📧 ${total}件中 ${done}件処理中...`)
        );
        parsed.forEach(p => { db = addTransactionFromParsed(db, rules, p, p.id); });
        resolvedCount += parsed.length;
        pending = [...pending, ...nr];
      }

      setAllTransactions(db);
      localStorage.setItem('kakeibo_data', JSON.stringify(db));
      if (resolvedCount > 0) touchLocalModified();
      saveNeedsReview(pending);
      localStorage.setItem('kakeibo_gmail_last_sync', new Date().toISOString());
      setGmailSyncStatus(`✅ ${resolvedCount}件の明細を取り込みました${pending.length ? `（${pending.length}件は要確認のまま）` : ''}`);
    } catch(err) { setGmailSyncStatus(`❌ エラー: ${err.message}`); }
  };

  const clearData = () => {
    if (window.confirm('全データを完全削除しますか？（クラウドは消えません）')) {
      setAllTransactions([]); setCustomRules({});
      localStorage.removeItem('kakeibo_data'); localStorage.removeItem('kakeibo_rules');
      setView('home');
    }
  };

  // ===== 計算値 =====
  const othersCount        = allTransactions.filter(t => t.catKey === 'Others').length;
  const currentOthersCount = filteredTx.filter(t => t.catKey === 'Others').length;
  const diffAmount = prevMonthData ? summary - prevMonthData.total : null;
  const diffPct    = prevMonthData && prevMonthData.total > 0 ? ((diffAmount / prevMonthData.total) * 100).toFixed(1) : null;


  // ===== メインレンダー =====
  return (
    <div id="app-root">

      {/* ===== PC サイドバー ===== */}
      <Sidebar
        view={view}
        onSelectView={setView}
        hasData={allTransactions.length > 0}
        targetMonth={targetMonth}
        availableMonths={availableMonths}
        monthTotals={monthTotals}
        onChangeMonth={changeMonth}
        onOpenCalendar={() => setShowCalendar(true)}
        onSelectMonth={setTargetMonth}
        onFileUpload={handleFileUpload}
      />

      {/* ===== メインエリア ===== */}
      <div className="main-wrapper">
        {/* モバイル専用ヘッダー */}
        <div className="app-header mobile-only">
          <div className="app-title">スマート明細</div>
          <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredTx.length}件</div>
        </div>

        {/* PC 専用トップバー */}
        <div className="desktop-topbar desktop-only">
          <div className="desktop-topbar-left">
            <div className="desktop-topbar-title">
              {view === 'home' && `${targetMonth} のサマリー`}
              {view === 'list' && `${targetMonth} の明細一覧`}
              {view === 'settings' && '設定'}
            </div>
            {(view === 'home' || view === 'list') && (
              <div className="desktop-topbar-sub">{filteredTx.length}件 | {formatCurrency(summary)}</div>
            )}
          </div>
          {(view === 'home' || view === 'list') && (
            <label className="desktop-upload-btn">
              <Plus size={16} />CSVを追加
              <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {/* モバイル専用月切り替え */}
        {(view === 'home' || view === 'list') && (
          <MonthSwitcher
            className="mobile-only"
            targetMonth={targetMonth}
            availableMonths={availableMonths}
            onChangeMonth={changeMonth}
            onOpenCalendar={() => setShowCalendar(true)}
          />
        )}

        {/* コンテンツ */}
        <div className="content-area">
          {view === 'settings' ? (
            <SettingsView
              ai={{
                geminiKey,
                onGeminiKeyChange: (v) => { setGeminiKey(v); localStorage.setItem('kakeibo_aikey', v); },
                showKey,
                onToggleShowKey: () => setShowKey(!showKey),
                othersCount,
                aiProgress,
                aiAllMonthsLoading,
                onRunAiAllMonths: runAiCategorizationAllMonths,
              }}
              google={{
                googleUser,
                onLogout: handleGoogleLogout,
                onUpload: () => uploadToCloud(),
                onLogin: handleGoogleLogin,
                syncStatus,
              }}
              gmail={{
                senderInput,
                setSenderInput,
                onAddSender: addGmailSender,
                senders: gmailSenders,
                onRemoveSender: removeGmailSender,
                labelInputs,
                setLabelInputs,
                onAddParseLabel: addParseLabel,
                parseLabels,
                onRemoveParseLabel: removeParseLabel,
                onRunSync: () => runGmailSync(),
                syncStatus: gmailSyncStatus,
                needsReview,
                expandedReviewId,
                setExpandedReviewId,
                onRetryReview: retryParseReview,
              }}
              onClearData={clearData}
            />
          ) : allTransactions.length === 0 ? (
            <WelcomeView onFileUpload={handleFileUpload} />
          ) : view === 'home' ? (
            <HomeView
              summary={summary}
              prevMonthData={prevMonthData}
              diffAmount={diffAmount}
              diffPct={diffPct}
              othersCount={othersCount}
              currentOthersCount={currentOthersCount}
              isAiLoading={isAiLoading}
              geminiKey={geminiKey}
              onRunAiCategorization={runAiCategorization}
              allMonthsSummary={allMonthsSummary}
              targetMonth={targetMonth}
              onSelectMonth={setTargetMonth}
              chartData={chartData}
              filteredTx={filteredTx}
              expandedCat={expandedCat}
              onToggleCategory={setExpandedCat}
            />
          ) : view === 'list' ? (
            <ListView
              filteredTx={filteredTx}
              groupedTxs={groupedTxs}
              summary={summary}
              onUpdateCategory={updateCategory}
            />
          ) : null}
        </div>
      </div>

      {/* モバイル FAB */}
      {view !== 'settings' && (
        <label className="fab mobile-only">
          <Plus size={28} />
          <input type="file" accept=".csv" multiple onChange={handleFileUpload} />
        </label>
      )}

      {/* モバイル ボトムナビ */}
      <div className="bottom-nav mobile-only">
        {[
          { id: 'home', icon: <Home size={22} />, label: 'ホーム', disabled: allTransactions.length === 0 },
          { id: 'list', icon: <List size={22} />, label: '明細', disabled: allTransactions.length === 0 },
          { id: 'settings', icon: <Settings size={22} />, label: '設定', disabled: false },
        ].map(({ id, icon, label, disabled }) => (
          <div key={id} className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => !disabled && setView(id)}
            style={{ opacity: disabled ? 0.4 : 1 }}>
            {icon}<span className="nav-label">{label}</span>
          </div>
        ))}
      </div>

      {/* カレンダーモーダル */}
      {showCalendar && (
        <MonthCalendarModal
          availableMonths={availableMonths}
          targetMonth={targetMonth}
          onSelect={m => setTargetMonth(m)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
