import { useState } from 'react';
import { listUsageMessageIds, fetchAndParseMessages, parseUsageEmail, DEFAULT_PARSE_LABELS } from '../gmailSync';
import { categorize } from '../lib/categories';

// Gmail 利用速報メールの自動取込（送信元・解析キーワード・要確認）を管理するフック
export function useGmailSync({ setAllTransactions, touchLocalModified }) {
  const [gmailSenders, setGmailSenders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kakeibo_gmail_senders') || '[]'); } catch { return []; }
  });
  const [senderInput, setSenderInput] = useState('');
  const [parseLabels, setParseLabels] = useState(() => {
    const l = localStorage.getItem('kakeibo_gmail_labels');
    try { return l ? JSON.parse(l) : DEFAULT_PARSE_LABELS; } catch { return DEFAULT_PARSE_LABELS; }
  });
  const [labelInputs, setLabelInputs] = useState({ amount: '', date: '', merchant: '' });
  const [gmailSyncStatus, setGmailSyncStatus] = useState('');
  const [needsReview, setNeedsReview] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kakeibo_gmail_needs_review') || '[]'); } catch { return []; }
  });
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  const addGmailSender = () => {
    const v = senderInput.trim();
    if (!v || gmailSenders.includes(v)) { setSenderInput(''); return; }
    const next = [...gmailSenders, v];
    setGmailSenders(next);
    localStorage.setItem('kakeibo_gmail_senders', JSON.stringify(next));
    touchLocalModified();
    setSenderInput('');
  };

  const removeGmailSender = (value) => {
    const next = gmailSenders.filter(s => s !== value);
    setGmailSenders(next);
    localStorage.setItem('kakeibo_gmail_senders', JSON.stringify(next));
    touchLocalModified();
  };

  const addParseLabel = (category) => {
    const v = labelInputs[category].trim();
    if (!v || parseLabels[category].includes(v)) { setLabelInputs({ ...labelInputs, [category]: '' }); return; }
    const next = { ...parseLabels, [category]: [...parseLabels[category], v] };
    setParseLabels(next);
    localStorage.setItem('kakeibo_gmail_labels', JSON.stringify(next));
    touchLocalModified();
    setLabelInputs({ ...labelInputs, [category]: '' });
  };

  const removeParseLabel = (category, value) => {
    const next = { ...parseLabels, [category]: parseLabels[category].filter(v => v !== value) };
    setParseLabels(next);
    localStorage.setItem('kakeibo_gmail_labels', JSON.stringify(next));
    touchLocalModified();
  };

  // クラウド復元では変更通知を発生させず、復元した更新時刻をそのまま維持する。
  const restoreGmailSettings = (settings) => {
    if (settings.senders !== undefined) {
      setGmailSenders(settings.senders);
      localStorage.setItem('kakeibo_gmail_senders', JSON.stringify(settings.senders));
    }
    if (settings.parseLabels !== undefined) {
      setParseLabels(settings.parseLabels);
      localStorage.setItem('kakeibo_gmail_labels', JSON.stringify(settings.parseLabels));
    }
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
    // トークンは「googleToken state」ではなく localStorage＋有効期限で判定（useGoogleAuth との循環参照を避ける）
    let token = tokenArg;
    if (!token) {
      const t = localStorage.getItem('kakeibo_google_token');
      const exp = parseInt(localStorage.getItem('kakeibo_google_token_expiry') || '0', 10);
      token = (t && exp > Date.now()) ? t : '';
    }
    if (!token) return;
    const senders = JSON.parse(localStorage.getItem('kakeibo_gmail_senders') || '[]');
    if (senders.length === 0) { setGmailSyncStatus('設定で送信元メールアドレスを追加してください'); return; }
    try {
      const labels = JSON.parse(localStorage.getItem('kakeibo_gmail_labels') || 'null') || DEFAULT_PARSE_LABELS;
      const rules = JSON.parse(localStorage.getItem('kakeibo_rules') || '{}');
      let db = JSON.parse(localStorage.getItem('kakeibo_data') || '[]');
      let pending = JSON.parse(localStorage.getItem('kakeibo_gmail_needs_review') || '[]');
      const initialPendingCount = pending.length;
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
      if (resolvedCount > 0 || pending.length !== initialPendingCount) touchLocalModified();
      saveNeedsReview(pending);
      localStorage.setItem('kakeibo_gmail_last_sync', new Date().toISOString());
      setGmailSyncStatus(`✅ ${resolvedCount}件の明細を取り込みました${pending.length ? `（${pending.length}件は要確認のまま）` : ''}`);
    } catch(err) { setGmailSyncStatus(`❌ エラー: ${err.message}`); }
  };

  return {
    gmailSenders, senderInput, setSenderInput,
    parseLabels, labelInputs, setLabelInputs,
    gmailSyncStatus, needsReview, expandedReviewId, setExpandedReviewId,
    addGmailSender, removeGmailSender, addParseLabel, removeParseLabel,
    retryParseReview, runGmailSync, saveNeedsReview, restoreGmailSettings,
  };
}
