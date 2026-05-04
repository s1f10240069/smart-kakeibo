import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  UploadCloud, Plus, Home, List, Settings, ChevronLeft, ChevronRight,
  Edit3, ShieldAlert, Sparkles, Key, Upload, Download, Eye, EyeOff,
  CalendarDays, TrendingUp, TrendingDown, Minus, BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
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
  const [githubToken, setGithubToken]         = useState('');
  const [githubUser, setGithubUser]           = useState(null); // { login, avatar_url }
  const [deviceFlow, setDeviceFlow]           = useState(null); // { user_code, verification_uri, device_code, interval }
  const [devicePolling, setDevicePolling]     = useState(false);
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
      const g = localStorage.getItem('kakeibo_github_token'); if (g) {
        setGithubToken(g);
        // 保存済みトークンでユーザー情報を取得
        fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${g}`, Accept: 'application/vnd.github+json' } })
          .then(res => res.ok ? res.json() : null)
          .then(u => { if (u) setGithubUser({ login: u.login, avatar_url: u.avatar_url }); })
          .catch(() => {});
      }
    } catch(e) { console.error(e); }
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
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
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

  // ----- GitHub Device Flow -----
  // ※ GitHub OAuth App の client_id が必要。パブリックAppとして登録したものを使用。
  // Device Flow は client_secret 不要でフロントエンドから安全に使用可能。
  const GH_CLIENT_ID = 'Ov23lieqJW6a6kugNYGs';
  // 開発: Viteプロキシ(/github-auth) / 本番: 環境変数 VITE_GH_PROXY_URL にCloudflare Worker等のURLを設定
  const GH_PROXY = import.meta.env.VITE_GH_PROXY_URL || '/github-auth';

  const startDeviceFlow = async () => {
    try {
      setSyncStatus('🔄 GitHubに接続中...');
      const res = await fetch(`${GH_PROXY}/login/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: GH_CLIENT_ID, scope: 'gist' }),
      });
      if (!res.ok) throw new Error(`Device Flow開始エラー (${res.status})`);
      const data = await res.json();
      setDeviceFlow({ user_code: data.user_code, verification_uri: data.verification_uri, device_code: data.device_code, interval: data.interval || 5 });
      setSyncStatus('');
      // ブラウザでGitHub認証ページを開く
      window.open(data.verification_uri, '_blank');
      // ポーリング開始
      pollForToken(data.device_code, data.interval || 5);
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
  };

  const pollForToken = (device_code, interval) => {
    setDevicePolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 最大5分
    const timer = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) { clearInterval(timer); setDevicePolling(false); setSyncStatus('❌ タイムアウトしました。再度お試しください。'); return; }
      try {
        const res = await fetch(`${GH_PROXY}/login/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: GH_CLIENT_ID, device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
        });
        const data = await res.json();
        if (data.access_token) {
          clearInterval(timer);
          setDevicePolling(false);
          const token = data.access_token;
          setGithubToken(token);
          localStorage.setItem('kakeibo_github_token', token);
          // ユーザー情報取得
          const uRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
          const u = await uRes.json();
          setGithubUser({ login: u.login, avatar_url: u.avatar_url });
          setDeviceFlow(null);
          setSyncStatus(`✅ ${u.login} としてログインしました！`);
        }
        // slow_down / authorization_pending は無視して継続
      } catch(e) { /* ネットワークエラーは無視 */ }
    }, interval * 1000);
  };

  const logoutGithub = () => {
    setGithubToken('');
    setGithubUser(null);
    setDeviceFlow(null);
    localStorage.removeItem('kakeibo_github_token');
    setSyncStatus('ログアウトしました。');
  };

  // ----- GitHub Gist Sync -----
  const makeGhHeaders = (token) => ({
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  });

  const getSyncGist = async (token) => {
    const res = await fetch('https://api.github.com/gists', { headers: makeGhHeaders(token) });
    if (res.status === 401) throw new Error('トークンが無効です。');
    if (!res.ok) throw new Error(`GitHub APIエラー (${res.status})`);
    const gists = await res.json();
    return gists.find(g => g.description === 'smart-kakeibo-cloud-sync');
  };

  const uploadToCloud = async () => {
    if (!githubToken) return alert('GitHubのトークンを入力してください');
    try {
      setSyncStatus('📡 アップロード中...');
      // ⚠️ APIキーはGitHubのシークレットスキャン対象になるためGistには保存しない
      const exportObj = { transactions: allTransactions, rules: customRules, timestamp: new Date().toISOString() };
      const gistData = { description: 'smart-kakeibo-cloud-sync', public: false, files: { 'smart-kakeibo.json': { content: JSON.stringify(exportObj) } } };
      const existing = await getSyncGist(githubToken);
      const url = existing ? `https://api.github.com/gists/${existing.id}` : 'https://api.github.com/gists';
      const res = await fetch(url, { method: existing ? 'PATCH' : 'POST', headers: makeGhHeaders(githubToken), body: JSON.stringify(gistData) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `失敗(${res.status})`); }
      localStorage.setItem('kakeibo_github_token', githubToken.trim());
      setSyncStatus('✅ データをGitHubクラウドに保存しました');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
  };

  const downloadFromCloud = async () => {
    if (!githubToken) return alert('GitHubのトークンを入力してください');
    try {
      setSyncStatus('📡 読み込み中...');
      const existing = await getSyncGist(githubToken);
      if (!existing) { setSyncStatus('❌ クラウドにデータが見つかりません。'); return; }
      const res = await fetch(`https://api.github.com/gists/${existing.id}`, { headers: makeGhHeaders(githubToken) });
      if (!res.ok) throw new Error(`ダウンロード失敗 (${res.status})`);
      const detail = await res.json();
      const content = detail.files['smart-kakeibo.json']?.content;
      if (!content) throw new Error('ファイル内容が見つかりません。');
      const obj = JSON.parse(content);
      if (obj.transactions) { setAllTransactions(obj.transactions); localStorage.setItem('kakeibo_data', JSON.stringify(obj.transactions)); }
      if (obj.rules) { setCustomRules(obj.rules); localStorage.setItem('kakeibo_rules', JSON.stringify(obj.rules)); }
      // APIキーはGistに保存していないためダウンロードでは復元しない（端末ローカルで管理）
      localStorage.setItem('kakeibo_github_token', githubToken.trim());
      setSyncStatus('✅ データを復元・同期しました！'); setView('home');
    } catch(err) { setSyncStatus(`❌ エラー: ${err.message}`); }
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
                    {tx.desc}
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
                    <div className="tx-desc" title={tx.desc}>{tx.desc}</div>
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

        {/* クラウド同期 */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Sparkles color="var(--text-primary)" /><span style={{ fontWeight: '700', fontSize: '16px' }}>クラウド同期 (GitHub)</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            GitHubアカウントでログインしてプライベートGistに安全に同期します。
          </p>

          {/* ログイン済み */}
          {githubUser ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <img src={githubUser.avatar_url} alt={githubUser.login} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{githubUser.login}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GitHubアカウントで認証済み</div>
                </div>
                <button onClick={logoutGithub} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>ログアウト</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <button onClick={uploadToCloud} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  <Upload size={16} /> クラウドへ保存
                </button>
                <button onClick={downloadFromCloud} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  <Download size={16} /> データを読み込む
                </button>
              </div>
            </div>
          ) : deviceFlow ? (
            /* Device Flow 認証待ち */
            <div style={{ padding: '20px', background: 'rgba(99,102,241,0.06)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>GitHubで下記のコードを入力してください</div>
              <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '6px', color: 'var(--primary-color)', fontFamily: 'monospace', marginBottom: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '10px', border: '2px solid var(--primary-color)' }}>
                {deviceFlow.user_code}
              </div>
              <a href={deviceFlow.verification_uri} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', marginBottom: '16px', fontSize: '13px', color: 'var(--primary-color)', textDecoration: 'underline' }}>
                {deviceFlow.verification_uri} を開く
              </a>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {devicePolling && <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite' }} />}
                {devicePolling ? '認証を待機中...' : '処理中...'}
              </div>
              <button onClick={() => { setDeviceFlow(null); setDevicePolling(false); }} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          ) : (
            /* 未ログイン */
            <button onClick={startDeviceFlow}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', border: 'none', background: '#24292e', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="white"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
              GitHubでログイン
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
    <div id="root">

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
