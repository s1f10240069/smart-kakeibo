import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  UploadCloud, Plus, Home, List, Settings, ChevronLeft, ChevronRight,
  Edit3, ShieldAlert, Sparkles, Key, Upload, Download, Eye, EyeOff,
  CalendarDays, TrendingUp, TrendingDown, Minus, BarChart2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { listUsageMessageIds, fetchAndParseMessages, parseUsageEmail, DEFAULT_PARSE_LABELS } from './gmailSync';
import './index.css';

const CATEGORY_MAP = {
  Food:          { name: '食費・飲食',     color: '#f43f5e', icon: '🍔' },
  Daily:         { name: '日用品・スーパー', color: '#10b981', icon: '🛒' },
  Shopping:      { name: 'ショッピング',    color: '#34d399', icon: '🛍️' },
  Entertainment: { name: 'エンタメ・趣味',  color: '#a855f7', icon: '🎮' },
  Transport:     { name: '交通・通信',      color: '#3b82f6', icon: '🚃' },
  Beauty:        { name: '美容・医療',      color: '#ec4899', icon: '✂️' },
  Travel:        { name: '旅行・宿泊',      color: '#f59e0b', icon: '🏨' },
  Fixed:         { name: '固定費・税金',    color: '#0ea5e9', icon: '📄' },
  Others:        { name: 'その他',          color: '#94a3b8', icon: '💳' },
};

const categorize = (desc, customRules = {}) => {
  const d = desc.toUpperCase();
  for (const [k, v] of Object.entries(customRules)) {
    if (d.includes(k.toUpperCase())) return v;
  }
  if (/(ﾃﾝ|店|食堂|ｶﾌｴ|ｶﾌｪ|居酒屋|ﾚｽﾄﾗﾝ|ﾀﾞｲﾆﾝｸﾞ|ﾍﾞ-ｶﾘ-|ﾊﾟﾝﾔ|ﾏｸﾄﾞﾅﾙﾄﾞ|ﾏｯｸ|FAMILYMART|ﾌｱﾐﾘ-ﾏ-ﾄ|ﾛ-ｿﾝ|LAWSON|ｾﾌﾞﾝ|ﾏﾂﾔ|ﾔﾖｲｹﾝ|ｽｷﾔ|ﾖｼﾉﾔ|ｳﾄﾞﾝ|ｿﾊﾞ|ﾗ-ﾒﾝ|ｽｼ|ﾔｷﾆｸ|焼肉|ﾊﾞ-|BAR|ｺ-ﾋ-|ｽﾀﾊﾞ|ﾄﾞﾄ-ﾙ|ｳ-ﾊﾞ-|UBER|WOLT|ﾃﾞﾘﾊﾞﾘ-|KFC|ｻｲｾﾞﾘﾔ|ｶﾞｽﾄ|すき家|吉野家|モスバーガー)/.test(d)) return 'Food';
  if (/(ｽ-ﾊﾟ-|ｺﾝﾋﾞﾆ|ﾏ-ﾄ|MAXVALU|ﾒｶﾞﾄﾞﾝｷ|ﾄﾞﾝｷ|ｲｵﾝ|AEON|ｲﾄ-ﾖ-ｶﾄﾞ-|ｾｲﾕｳ|SEIYU|ﾏﾙｴﾂ|ｻﾐｯﾄ|ｲﾅｹﾞﾔ|ﾏﾂﾓﾄｷﾖｼ|ﾏﾂｷﾖ|薬|ﾄﾞﾗｯｸﾞ|ｳｴﾙｼｱ|ｽｷﾞ|DAISO|ﾀﾞｲｿ-|ｾﾘｱ|CANDO|ｷｬﾝﾄﾞｩ)/.test(d)) return 'Daily';
  if (/(AMAZON|ｱﾏｿﾞﾝ|YAMADA|ﾔﾏﾀﾞ|ﾋﾞｯｸｶﾒﾗ|ﾖﾄﾞﾊﾞｼ|ﾆﾄﾘ|IKEA|無印|UNIQLO|ﾕﾆｸﾛ|GU|ZOZO|楽天|YAHOO|ﾏﾙｲ|ﾙﾐﾈ|ﾊﾟﾙｺ|ｲｾﾀﾝ|ﾀｶｼﾏﾔ|ﾐﾂｺｼ|ｼｮｯﾌﾟ|SHOP|STORE|ｽﾄｱ|MALL|PAYPAY|ﾍﾟｲﾍﾟｲ|SQ\*|BASE)/.test(d)) return 'Shopping';
  if (/(STEAM|NINTENDO|任天堂|PLAYSTATION|SONY|YOUTUB|NETFLIX|PRIME|DISNEY|HULU|U-NEXT|SPOTIFY|APPLE|GOOGLE|DMM|PIXIV|ｹﾞ-ﾑ|ｶﾗｵｹ|映画|ｼﾈﾏ|TOHO|TICKET|ﾁｹｯﾄ|ｲﾍﾞﾝﾄ|ﾗｲﾌﾞ|本|書店|BOOK|TSUTAYA|GEO|ｹﾞｵ)/.test(d)) return 'Entertainment';
  if (/(SUICA|PASMO|ICOCA|JR|地下鉄|ﾒﾄﾛ|METRO|交通|ﾀｸｼ-|ﾊﾞｽ|航空|ANA|JAL|PEACH|PARKING|駐車|TIMES|ﾄﾞｺﾓ|DOCOMO|AU|SOFTBANK|UQ|Y!MOBILE|LINEMO|POVO|通信|ETC|高速|ｶﾞｿﾘﾝ|ENEOS)/.test(d)) return 'Transport';
  if (/(美容|ｻﾛﾝ|ﾈｲﾙ|ｴｽﾃ|ﾏﾂｴｸ|ﾍｱ-|ｶｯﾄ|ｸﾘﾆｯｸ|病院|歯科|眼科|薬局|ﾏｯｻ-ｼﾞ|整体)/.test(d)) return 'Beauty';
  if (/(HOTEL|BOOKING|AGODA|EXPEDIA|JTB|HIS|旅行|旅館|ﾎﾃﾙ|AIRBNB|TRIP|TOUR)/.test(d)) return 'Travel';
  if (/(ガス|水道|電気|ﾃﾞﾝｷ|保険|税金|NHK|年金|電力|東京瓦斯|TEPCO|家賃|ｱﾊﾟﾏﾝ)/.test(d)) return 'Fixed';
  return 'Others';
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);

// ===== カレンダーモーダル =====
const MonthCalendarModal = ({ availableMonths, targetMonth, onSelect, onClose }) => {
  const monthSet = new Set(availableMonths);
  const years = useMemo(() => {
    const ys = new Set(availableMonths.map(m => m.split('/')[0]));
    return Array.from(ys).sort().reverse();
  }, [availableMonths]);
  const [selectedYear, setSelectedYear] = useState(() =>
    targetMonth ? targetMonth.split('/')[0] : (years[0] || '')
  );
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const monthLabels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📅 月を選択</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="year-tabs">
          {years.map(y => (
            <button key={y} className={`year-tab ${selectedYear === y ? 'active' : ''}`} onClick={() => setSelectedYear(y)}>
              {y}年 <span className="year-badge">{availableMonths.filter(m => m.startsWith(y + '/')).length}</span>
            </button>
          ))}
        </div>
        <div className="month-grid">
          {months.map((m, i) => {
            const key = `${selectedYear}/${m}`;
            const hasData = monthSet.has(key);
            return (
              <button key={m} className={`month-cell ${hasData ? 'has-data' : 'no-data'} ${key === targetMonth ? 'active' : ''}`}
                disabled={!hasData} onClick={() => { onSelect(key); onClose(); }}>
                <span className="month-cell-num">{monthLabels[i]}</span>
                {hasData && <span className="month-cell-dot" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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
        // 有効なトークンが残っている → 起動時に自動でメールをキャッチアップ
        setGoogleToken(t);
        runGmailSync(t);
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

  const parseOneFile = (csvText, currentDB, rulesSnap) => new Promise(resolve => {
    Papa.parse(csvText, { skipEmptyLines: true, complete: (results) => {
      const rawTxs = [];
      results.data.forEach(row => {
        if (row[0] === '2' || (row.length >= 5 && !isNaN(parseFloat(row[4])))) {
          rawTxs.push({
            id: Math.random().toString(36).substr(2, 9),
            date:   row[1] ? row[1].trim() : '不明な日付',
            desc:   row[2] ? row[2].trim() : '不明な取引',
            amount: parseFloat(row[4]) || 0,
            catKey: categorize(row[2] ? row[2].trim() : '', rulesSnap)
          });
        }
      });
      const negatives = rawTxs.filter(t => t.amount < 0);
      const positives = rawTxs.filter(t => t.amount >= 0);
      let valid = [];
      negatives.forEach(neg => {
        const mi = positives.findIndex(p => p.desc === neg.desc && p.amount === Math.abs(neg.amount));
        if (mi !== -1) positives.splice(mi, 1); else valid.push(neg);
      });
      valid = [...valid, ...positives];
      let db = [...currentDB];
      valid.forEach(tx => {
        if (tx.amount < 0) { const hi = db.findIndex(h => h.desc === tx.desc && h.amount === Math.abs(tx.amount)); if (hi !== -1) db.splice(hi, 1); return; }
        if (!db.some(u => u.date === tx.date && u.desc === tx.desc && u.amount === tx.amount)) db.push(tx);
      });
      resolve({ db, count: valid.filter(t => t.amount >= 0).length });
    }});
  });

  const readFileAsText = (file) => new Promise(resolve => {
    const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsText(file, 'shift-jis');
  });

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
  };

  const callGemini = async (prompt) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'AI Error');
    return JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
  };

  const AI_PROMPT = (descs) =>
    `あなたは家計簿の仕分けAIです。以下のクレジットカード決済名リストを、指定カテゴリーのいずれかに分類しJSONで返してください。
【カテゴリーリスト】: Food, Daily, Shopping, Entertainment, Transport, Beauty, Travel, Fixed, Others
【決済名リスト】:\n${JSON.stringify(descs)}
要件:\n- 必ずJSONのみで返す。\n- 例: {"ｳ-ﾊﾞ-ｲ-ﾂ": "Food"}`;

  const applyAiResults = (aiResults, baseTxs, baseRules) => {
    const newRules = { ...baseRules };
    for (const [desc, cat] of Object.entries(aiResults))
      if (CATEGORY_MAP[cat] && cat !== 'Others') newRules[desc] = cat;
    const updatedTxs = baseTxs.map(t =>
      aiResults[t.desc] && aiResults[t.desc] !== 'Others' && CATEGORY_MAP[aiResults[t.desc]]
        ? { ...t, catKey: aiResults[t.desc] } : t
    );
    setCustomRules(newRules); localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));
    setAllTransactions(updatedTxs); localStorage.setItem('kakeibo_data', JSON.stringify(updatedTxs));
    return Object.keys(newRules).length - Object.keys(baseRules).length;
  };

  const runAiCategorization = async () => {
    if (!geminiKey) return alert('設定でGeminiのAPIキーを入力してください！');
    const others = filteredTx.filter(t => t.catKey === 'Others');
    if (others.length === 0) return alert('この月の「その他」はありません ✨');
    setIsAiLoading(true);
    try {
      const aiResults = await callGemini(AI_PROMPT([...new Set(others.map(t => t.desc))]));
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
        const res = await callGemini(AI_PROMPT(batches[bi]));
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
  const GOOGLE_CLIENT_ID = '709403348848-p3cmbc9g5l1kr4c8u7voorvolt5tcft3.apps.googleusercontent.com';
  const GOOGLE_SCOPES = [
    'openid', 'email', 'profile',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/gmail.readonly',
  ].join(' ');
  const DRIVE_FILE_NAME = 'smart-kakeibo.json';

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
  const getSyncFile = async (token) => {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${DRIVE_FILE_NAME}'`)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401) throw new Error('トークンが無効です。再ログインしてください。');
    if (!res.ok) throw new Error(`Drive APIエラー (${res.status})`);
    const data = await res.json();
    return data.files?.[0] || null;
  };

  const uploadToCloud = async () => {
    if (!googleToken) return alert('Googleでログインしてください');
    try {
      setSyncStatus('📡 アップロード中...');
      const exportObj = { transactions: allTransactions, rules: customRules, timestamp: new Date().toISOString() };
      const existing = await getSyncFile(googleToken);
      let res;
      if (existing) {
        res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
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
          headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        });
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `失敗(${res.status})`); }
      setSyncStatus('✅ データをGoogle Driveに保存しました');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
  };

  const downloadFromCloud = async () => {
    if (!googleToken) return alert('Googleでログインしてください');
    try {
      setSyncStatus('📡 読み込み中...');
      const existing = await getSyncFile(googleToken);
      if (!existing) { setSyncStatus('❌ クラウドにデータが見つかりません。'); return; }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, { headers: { Authorization: `Bearer ${googleToken}` } });
      if (!res.ok) throw new Error(`ダウンロード失敗 (${res.status})`);
      const obj = await res.json();
      if (obj.transactions) { setAllTransactions(obj.transactions); localStorage.setItem('kakeibo_data', JSON.stringify(obj.transactions)); }
      if (obj.rules) { setCustomRules(obj.rules); localStorage.setItem('kakeibo_rules', JSON.stringify(obj.rules)); }
      setSyncStatus('✅ データを復元・同期しました！'); setView('home');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
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

  // ===== 月切り替えUI (共通) =====
  const MonthSwitcher = ({ className = '' }) => (
    <div className={`month-switcher ${className}`}>
      <button className="month-btn" onClick={() => changeMonth(1)} disabled={availableMonths.indexOf(targetMonth) >= availableMonths.length - 1}><ChevronLeft /></button>
      <button className="month-label-btn" onClick={() => setShowCalendar(true)}>
        <span className="month-label">{targetMonth}</span>
        <CalendarDays size={16} color="var(--primary-color)" style={{ marginLeft: '6px' }} />
      </button>
      <button className="month-btn" onClick={() => changeMonth(-1)} disabled={availableMonths.indexOf(targetMonth) <= 0}><ChevronRight /></button>
    </div>
  );

  // ===== ウェルカム画面コンテンツ（データなし時） =====
  const WelcomeContent = () => (
    <div className="welcome-container animate-fade">
      <h3>家計簿を始めましょう</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', lineHeight: '1.5' }}>
        CSVファイルを読み込むか、設定からクラウド同期を行ってください！
      </p>
      <label className="welcome-upload">
        <UploadCloud size={48} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
        <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--primary-color)' }}>CSVファイルを選択</div>
        <input type="file" accept=".csv" multiple onChange={handleFileUpload} />
      </label>
    </div>
  );

  // ===== HOME コンテンツ =====
  const HomeContent = () => (
    <div className="summary-container animate-fade">
      {/* サマリーカード群 */}
      <div className="desktop-kpi-row">
        <div className="total-card kpi-card">
          <div className="total-title">合計支出</div>
          <div className="total-amount">{formatCurrency(summary)}</div>
          {prevMonthData && diffAmount !== null && (
            <div className="diff-row">
              <span className="diff-prev">前月({prevMonthData.month}): {formatCurrency(prevMonthData.total)}</span>
              <span className={`diff-badge ${diffAmount > 0 ? 'diff-up' : diffAmount < 0 ? 'diff-down' : 'diff-flat'}`}>
                {diffAmount > 0 ? <TrendingUp size={13} /> : diffAmount < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                {diffAmount > 0 ? '+' : ''}{formatCurrency(diffAmount)}
                {diffPct !== null && <span className="diff-pct"> ({diffAmount > 0 ? '+' : ''}{diffPct}%)</span>}
              </span>
            </div>
          )}
        </div>
        {/* AI 仕分けカード（デスクトップKPIとして） */}
        <div className="kpi-card ai-kpi-card">
          <div className="total-title">未分類件数（全月）</div>
          <div className="total-amount" style={{ fontSize: '36px', color: othersCount > 0 ? '#a855f7' : 'var(--success-color)' }}>
            {othersCount}<span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '4px' }}>件</span>
          </div>
          <button
            onClick={runAiCategorization}
            disabled={isAiLoading || currentOthersCount === 0 || !geminiKey}
            className="ai-quick-btn"
            style={{ background: (!geminiKey || currentOthersCount === 0) ? '#e5e7eb' : 'linear-gradient(135deg,#a855f7,#6366f1)', color: (!geminiKey || currentOthersCount === 0) ? '#9ca3af' : '#fff' }}>
            <Sparkles size={14} />
            {isAiLoading ? '解析中...' : (!geminiKey ? 'APIキーを設定' : `この月の${currentOthersCount}件を整理`)}
          </button>
        </div>
      </div>

      {/* 2カラムレイアウト（PC）/ 縦積み（モバイル） */}
      <div className="home-desktop-grid">
        {/* 左列: グラフ */}
        <div className="home-col">
          {/* 月別推移 */}
          {allMonthsSummary.length > 1 && (
            <div className="chart-wrapper">
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="var(--primary-color)" />月別推移
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allMonthsSummary} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {allMonthsSummary.map((e, i) => (
                        <Cell key={i} fill={e.month === targetMonth ? 'var(--primary-color)' : 'var(--border-color)'} cursor="pointer" onClick={() => setTargetMonth(e.month)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>棒をクリックすると月を切り替え</p>
            </div>
          )}

          {/* 円グラフ */}
          {chartData.length > 0 && (
            <div className="chart-wrapper">
              <div className="chart-title">カテゴリー内訳</div>
              <div style={{ width: '100%', height: '220px', marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* 右列: カテゴリー一覧 */}
        <div className="home-col">
          {chartData.length > 0 ? (
            <div className="chart-wrapper" style={{ height: '100%' }}>
              <div className="chart-title">カテゴリー別金額</div>
              {chartData.map(cat => {
                const prevCatVal = prevMonthData?.catTotals?.[cat.key] || 0;
                const catDiff = cat.value - prevCatVal;
                const pct = Math.round((cat.value / summary) * 100);
                const isExpanded = expandedCat === cat.key;
                const catTxs = filteredTx.filter(t => t.catKey === cat.key);

                return (
                  <div key={cat.key} className="cat-accordion-group">
                    <div className="cat-list-item" onClick={() => setExpandedCat(isExpanded ? null : cat.key)} style={{ cursor: 'pointer', padding: '12px 8px', margin: '0 -8px', borderRadius: '8px' }}>
                      <div className="cat-dot" style={{ backgroundColor: cat.color }} />
                      <div className="cat-icon-label" style={{ maxWidth: 'calc(100% - 150px)' }}>
                        <span className="cat-icon">{CATEGORY_MAP[cat.key].icon}</span>
                        <span className="cat-name">{cat.name}</span>
                        <span className="cat-toggle-icon">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                      <div className="cat-bar-wrap">
                        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div className="cat-val">{formatCurrency(cat.value)}</div>
                        {prevMonthData && (
                          <div className={`cat-diff ${catDiff > 0 ? 'diff-up' : catDiff < 0 ? 'diff-down' : 'diff-flat'}`}>
                            {catDiff > 0 ? '▲' : catDiff < 0 ? '▼' : '－'}{formatCurrency(Math.abs(catDiff))}
                          </div>
                        )}
                      </div>
                      <div className="cat-pct">{pct}%</div>
                    </div>
                    {isExpanded && catTxs.length > 0 && (
                      <div className="cat-tx-list">
                        {catTxs.map(tx => (
                          <div key={tx.id} className="cat-tx-item">
                            <div className="cat-tx-date">{tx.date.split('/')[2]}日</div>
                            <div className="cat-tx-desc">{tx.desc}</div>
                            <div className="cat-tx-amount">{formatCurrency(tx.amount)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>この月のデータはありません</div>
          )}
        </div>
      </div>
    </div>
  );

  // ===== LIST コンテンツ =====
  const ListContent = () => (
    <div className="animate-fade">
      {/* PC: テーブル形式 */}
      <div className="tx-table-wrapper desktop-only">
        {filteredTx.length > 0 ? (
          <table className="tx-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>商品名・決済先</th>
                <th>カテゴリー</th>
                <th style={{ textAlign: 'right' }}>金額</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="tx-table-row">
                  <td className="tx-table-date">{tx.date}</td>
                  <td className="tx-table-desc">
                    <span className="tx-table-icon">{CATEGORY_MAP[tx.catKey].icon}</span>
                    {tx.desc}{tx.source === 'gmail' && <span title="メールから自動取込" style={{ marginLeft: '6px' }}>📧</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <select className="tx-cat-select" value={tx.catKey} onChange={e => updateCategory(tx.id, e.target.value)}>
                        {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k}>{CATEGORY_MAP[k].icon} {CATEGORY_MAP[k].name}</option>)}
                      </select>
                      <Edit3 size={11} color="var(--primary-color)" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="tx-amount">{formatCurrency(tx.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tx-table-foot">
                <td colSpan={3} style={{ fontWeight: 700, padding: '12px 16px' }}>合計 ({filteredTx.length}件)</td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', padding: '12px 16px', color: 'var(--primary-color)' }}>{formatCurrency(summary)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>この月の明細はありません</div>
        )}
      </div>

      {/* モバイル: グループリスト */}
      <div className="mobile-only">
        {groupedTxs.length > 0 ? groupedTxs.map(group => (
          <div key={group.date}>
            <div className="tx-group-date">{group.date}</div>
            <div className="tx-list">
              {group.items.map(tx => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-icon-wrapper">{CATEGORY_MAP[tx.catKey].icon}</div>
                  <div className="tx-details">
                    <div className="tx-desc" title={tx.desc}>{tx.desc}{tx.source === 'gmail' && <span style={{ marginLeft: '4px' }}>📧</span>}</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <select className="tx-cat-select" value={tx.catKey} onChange={e => updateCategory(tx.id, e.target.value)}>
                        {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k}>{CATEGORY_MAP[k].name}</option>)}
                      </select>
                      <Edit3 size={12} style={{ marginLeft: '4px', color: 'var(--primary-color)' }} />
                    </div>
                  </div>
                  <div className="tx-amount">{formatCurrency(tx.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>明細がありません</div>
        )}
      </div>
    </div>
  );

  // ===== SETTINGS コンテンツ =====
  const SettingsContent = () => (
    <div className="summary-container animate-fade">
      <h2 className="settings-title">設定</h2>
      <div className="settings-desktop-grid">
        {/* AI設定 */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sparkles color="#a855f7" /><span style={{ fontWeight: '700', fontSize: '16px' }}>Gemini AI 連携</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <Key size={18} color="var(--primary-color)" style={{ marginRight: '12px' }} />
            <input type={showKey ? 'text' : 'password'} placeholder="AIzaSy..." value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); localStorage.setItem('kakeibo_aikey', e.target.value); }}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', color: 'var(--text-primary)' }} />
            <div onClick={() => setShowKey(!showKey)} style={{ padding: '0 5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
          {/* 全月一括AI */}
          <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles color="var(--primary-color)" size={18} />
              <span style={{ fontWeight: '700', color: 'var(--primary-color)', fontSize: '14px' }}>全月一括AI解析</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
              全月合計 <b style={{ color: 'var(--text-primary)' }}>{othersCount}件</b> の未分類をまとめてAIで自動仕分けします。
            </p>
            {aiProgress && (
              <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(99,102,241,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
                {aiProgress}
              </div>
            )}
            <button onClick={runAiCategorizationAllMonths} disabled={aiAllMonthsLoading || othersCount === 0 || !geminiKey}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: (!geminiKey || othersCount === 0) ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#a855f7)', color: (!geminiKey || othersCount === 0) ? '#9ca3af' : '#fff', fontWeight: '700', fontSize: '13px', cursor: (!geminiKey || othersCount === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={15} />
              {aiAllMonthsLoading ? 'AI解析中...' : (!geminiKey ? 'APIキーを入力してください' : `全${othersCount}件を一括AIで整理する`)}
            </button>
          </div>
        </div>

        {/* Googleアカウント（ログイン・クラウド同期・メール自動取込） */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Sparkles color="var(--text-primary)" /><span style={{ fontWeight: '700', fontSize: '16px' }}>Googleアカウント</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            Googleでログインすると、クラウド同期とクレジットカード利用速報メールの自動取込が使えます。
          </p>

          {/* ログイン済み */}
          {googleUser ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <img src={googleUser.picture} alt={googleUser.email} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{googleUser.name || googleUser.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{googleUser.email}</div>
                </div>
                <button onClick={handleGoogleLogout} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>ログアウト</button>
              </div>

              {/* クラウド同期 */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={uploadToCloud} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  <Upload size={16} /> クラウドへ保存
                </button>
                <button onClick={downloadFromCloud} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  <Download size={16} /> データを読み込む
                </button>
              </div>

              {/* メール自動取込 */}
              <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>📧 メール自動取込</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.6' }}>
                  登録した送信元からの利用速報メールを検索し、金額・利用日が読み取れたものだけ明細に追加します。
                </p>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input type="text" placeholder="例: rakuten-card.co.jp" value={senderInput}
                    onChange={e => setSenderInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addGmailSender(); }}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                  <button onClick={addGmailSender} style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>追加</button>
                </div>

                {gmailSenders.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {gmailSenders.map(s => (
                      <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '999px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                        {s}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeGmailSender(s)} />
                      </span>
                    ))}
                  </div>
                )}

                {/* メール解析キーワード（カード会社ごとの言い回しの違いをUIで吸収する） */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>解析キーワード（メールの文言に合わせて調整）</div>
                  {[
                    { key: 'amount', label: '金額' },
                    { key: 'date', label: '日付' },
                    { key: 'merchant', label: '利用先' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}のキーワード</div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                        <input type="text" placeholder={`例: ${DEFAULT_PARSE_LABELS[key][0]}`} value={labelInputs[key]}
                          onChange={e => setLabelInputs({ ...labelInputs, [key]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addParseLabel(key); }}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                        <button onClick={() => addParseLabel(key)} style={{ padding: '0 12px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>追加</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {parseLabels[key].map(v => (
                          <span key={v} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '999px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                            {v}
                            <X size={10} style={{ cursor: 'pointer' }} onClick={() => removeParseLabel(key, v)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => runGmailSync()} disabled={gmailSenders.length === 0}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: gmailSenders.length === 0 ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#a855f7)', color: gmailSenders.length === 0 ? '#9ca3af' : '#fff', fontWeight: '700', fontSize: '13px', cursor: gmailSenders.length === 0 ? 'not-allowed' : 'pointer' }}>
                  今すぐメールを確認
                </button>

                {gmailSyncStatus && (
                  <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)' }}>{gmailSyncStatus}</div>
                )}

                {needsReview.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>要確認（自動で明細化されなかったメール、クリックで本文を確認）</div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      {needsReview.map(item => (
                        <div key={item.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: item.bodyText ? 'pointer' : 'default' }}
                            onClick={() => item.bodyText && setExpandedReviewId(expandedReviewId === item.id ? null : item.id)}>
                            {item.bodyText && (expandedReviewId === item.id ? <ChevronUp size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> : <ChevronDown size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />)}
                            {item.subject}
                          </div>
                          {expandedReviewId === item.id && item.bodyText && (
                            <div style={{ marginTop: '6px' }}>
                              <pre style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '11px', color: 'var(--text-primary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', margin: 0 }}>{item.bodyText}</pre>
                              <button onClick={() => retryParseReview(item)}
                                style={{ marginTop: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                                このメールを再解析
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 未ログイン */
            <button onClick={handleGoogleLogin}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#fff', color: '#3c4043', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.6l-6.6-5.4C29.7 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.3 35.9 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
              Googleでログイン
            </button>
          )}

          {syncStatus && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.05)', padding: '10px 12px', borderRadius: '8px', fontWeight: '600' }}>
              {syncStatus}
            </div>
          )}
        </div>

        {/* データリセット */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ShieldAlert color="var(--danger-color)" /><span style={{ fontWeight: '700', fontSize: '16px' }}>端末データリセット</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            この端末に保存されているすべての明細を完全に消去します。クラウドのデータは消えません。
          </p>
          <button className="settings-btn" onClick={clearData}>端末の全データを消去</button>
        </div>
      </div>
    </div>
  );

  // ===== メインレンダー =====
  return (
    <div id="app-root">

      {/* ===== PC サイドバー ===== */}
      <aside className="sidebar">
        <div className="sidebar-brand">🧾 スマート明細</div>

        <nav className="sidebar-nav">
          {[
            { id: 'home', icon: <Home size={18} />, label: 'ホーム', disabled: allTransactions.length === 0 },
            { id: 'list', icon: <List size={18} />, label: '明細一覧', disabled: allTransactions.length === 0 },
            { id: 'settings', icon: <Settings size={18} />, label: '設定', disabled: false },
          ].map(({ id, icon, label, disabled }) => (
            <button key={id} className={`sidebar-nav-item ${view === id ? 'active' : ''}`}
              onClick={() => !disabled && setView(id)}
              style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
              {icon}{label}
            </button>
          ))}
        </nav>

        {/* 月切り替え（サイドバー内） */}
        {(view === 'home' || view === 'list') && (
          <div className="sidebar-month-section">
            <div className="sidebar-section-title">表示月</div>
            <div className="sidebar-month-ctrl">
              <button className="month-btn" onClick={() => changeMonth(1)} disabled={availableMonths.indexOf(targetMonth) >= availableMonths.length - 1}><ChevronLeft size={16} /></button>
              <button className="sidebar-month-label-btn" onClick={() => setShowCalendar(true)}>
                {targetMonth} <CalendarDays size={13} />
              </button>
              <button className="month-btn" onClick={() => changeMonth(-1)} disabled={availableMonths.indexOf(targetMonth) <= 0}><ChevronRight size={16} /></button>
            </div>

            {/* 月リスト */}
            <div className="sidebar-month-list">
              {availableMonths.map(m => (
                <button key={m} className={`sidebar-month-item ${m === targetMonth ? 'active' : ''}`} onClick={() => setTargetMonth(m)}>
                  <span>{m}</span>
                  <span className="sidebar-month-total">{formatCurrency(monthTotals[m] || 0)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CSVアップロード */}
        <div className="sidebar-footer">
          <label className="sidebar-upload-btn">
            <Upload size={15} />CSVをインポート
            <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </aside>

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
        {(view === 'home' || view === 'list') && <MonthSwitcher className="mobile-only" />}

        {/* コンテンツ */}
        <div className="content-area">
          {view === 'settings' ? <SettingsContent /> :
           allTransactions.length === 0 ? <WelcomeContent /> :
           view === 'home' ? <HomeContent /> :
           view === 'list' ? <ListContent /> : null}
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
