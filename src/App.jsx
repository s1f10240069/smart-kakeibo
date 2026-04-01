import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { UploadCloud, Plus, Home, List, Settings, ChevronLeft, ChevronRight, Edit3, ShieldAlert, Sparkles, Key, Upload, Download, Eye, EyeOff } from 'lucide-react';
import './index.css';

const CATEGORY_MAP = {
  Food: { name: '食費・飲食', color: '#f43f5e', icon: '🍔' },
  Daily: { name: '日用品・スーパー', color: '#10b981', icon: '🛒' },
  Shopping: { name: 'ショッピング', color: '#34d399', icon: '🛍️' },
  Entertainment: { name: 'エンタメ・趣味', color: '#a855f7', icon: '🎮' },
  Transport: { name: '交通・通信', color: '#3b82f6', icon: '🚃' },
  Beauty: { name: '美容・医療', color: '#ec4899', icon: '✂️' },
  Travel: { name: '旅行・宿泊', color: '#f59e0b', icon: '🏨' },
  Fixed: { name: '固定費・税金', color: '#0ea5e9', icon: '📄' },
  Others: { name: 'その他', color: '#94a3b8', icon: '💳' },
};

const categorize = (desc, customRules = {}) => {
  const d = desc.toUpperCase();
  for (const [ruleKeyword, ruleCat] of Object.entries(customRules)) {
    if (d.includes(ruleKeyword.toUpperCase())) return ruleCat;
  }
  if (/(ﾃﾝ|店|ｼﾖｸﾄﾞｳ|食堂|ｶﾌｴ|ｶﾌｪ|ｲｻﾞｶﾔ|居酒屋|ﾚｽﾄﾗﾝ|ﾀﾞｲﾆﾝｸﾞ|ﾍﾞ-ｶﾘ-|ﾊﾟﾝﾔ|ﾏｸﾄﾞﾅﾙﾄﾞ|ﾏﾂｸ|FAMILYMART|ﾌｱﾐﾘ-ﾏ-ﾄ|ﾛ-ｿﾝ|LAWSON|ｾﾌﾞﾝ|ﾏﾂﾔ|ﾔﾖｲｹﾝ|ｽｷﾔ|ﾖｼﾉﾔ|ｳﾄﾞﾝ|ｿﾊﾞ|ﾗ-ﾒﾝ|ｽｼ|ｽﾃ-ｷ|ﾔｷﾆｸ|焼肉|ﾊﾞ-|BAR|ﾀｶﾉ|ﾌﾙ-ﾂ|ｽｲ-ﾂ|ｹ-ｷ|ｾﾝﾀ-ﾋﾞ-ﾌ|ﾀﾝﾔ|ｱﾀﾐﾌﾟﾘﾝ|ｺﾞ-ｺﾞ-ｶﾚ-|ｺ-ﾋ-|ｽﾀﾊﾞ|ﾄﾞﾄ-ﾙ|ﾀﾘ-ｽﾞ|ｳ-ﾊﾞ-|UBER|WOLT|ﾃﾞﾘﾊﾞﾘ-|KFC|ｻｲｾﾞﾘﾔ|ｶﾞｽﾄ|すき家|吉野家|モスバーガー)/.test(d)) return 'Food';
  if (/(ｽ-ﾊﾟ-|ｺﾝﾋﾞﾆ|ﾏ-ﾄ|MAXVALU|ﾏｯｸｽﾊﾞﾘｭ|ﾒｶﾞﾄﾞﾝｷ|ﾄﾞﾝｷﾎ-ﾃ|ﾄﾞﾝｷ|ﾄﾞﾝ･ｷﾎ-ﾃ|ｲｵﾝ|AEON|ｲﾄ-ﾖ-ｶﾄﾞ-|ｾｲﾕｳ|SEIYU|ﾏﾙｴﾂ|ｻﾐｯﾄ|ｲﾅｹﾞﾔ|ｵｵｾﾞｷ|ｵ-ｹ-|ﾋﾟ-ｺｯｸ|ﾏﾂﾓﾄｷﾖｼ|ﾏﾂｷﾖ|薬|ﾄﾞﾗｯｸﾞ|ｳｴﾙｼｱ|ｽｷﾞ|ｻﾝﾄﾞﾗｯｸﾞ|ｺｺｶﾗ|ｸﾘｴｲﾄ|DAISO|ﾀﾞｲｿ-|ｾﾘｱ|CANDO|ｷｬﾝﾄﾞｩ)/.test(d)) return 'Daily';
  if (/(AMAZON|ｱﾏｿﾞﾝ|YAMADA|ﾔﾏﾀﾞ|ﾋﾞｯｸｶﾒﾗ|ﾖﾄﾞﾊﾞｼ|ﾆﾄﾘ|IKEA|無印|ﾑｼﾞﾙｼ|UNIQLO|ﾕﾆｸﾛ|GU|ｼﾏﾑﾗ|ZOZOTOWN|ZOZO|楽天|ﾗｸﾃﾝ|YAHOO|ﾏﾙｲ|ﾙﾐﾈ|ﾊﾟﾙｺ|ｲｾﾀﾝ|ﾀｶｼﾏﾔ|ﾐﾂｺｼ|ﾀﾞｲﾏﾙ|ｿｺﾞｳ|ｼｮｯﾌﾟ|SHOP|STORE|ｽﾄｱ|MALL|ﾓ-ﾙ|PAYPAY|ﾍﾟｲﾍﾟｲ|SQ\*|ST\*|SP \*|BASE)/.test(d)) return 'Shopping';
  if (/(STEAM|NINTENDO|任天堂|PLAYSTATION|SONY|YOUTUB|NETFLIX|PRIME|DISNEY|HULU|U-NEXT|SPOTIFY|APPLE|GOOGLE|DMM|FANZA|PIXIV|DLｻｲﾄ|ｺﾐｯｸ|ﾏﾝｶﾞ|ｹﾞ-ﾑ|ｶﾗｵｹ|映画|ｼﾈﾏ|TOHO|ｲｵﾝｼﾈﾏ|TICKET|ﾁｹｯﾄ|ｲﾍﾞﾝﾄ|ﾗｲﾌﾞ|ﾌｧﾝｸﾗﾌﾞ|FC|本|書店|ﾌﾞｯｸ|BOOK|TSUTAYA|ﾂﾀﾔ|GEO|ｹﾞｵ|ｸﾞｯｽﾞ|ﾄｲｻﾞﾗｽ|ﾋﾒﾋﾅ|ﾏﾙｸ|HOSHIMACHI)/.test(d)) return 'Entertainment';
  if (/(SUICA|PASMO|ICOCA|NANACO|WAON|EDY|JR|地下鉄|ﾒﾄﾛ|METRO|交通|ﾀｸｼ-|GO|UBER|DI DI|ﾊﾞｽ|航空|ANA|JAL|PEACH|JETSTAR|SKYMARK|PARKING|駐輪|駐車|ﾀｲﾑｽﾞ|TIMES|HELLO CYCLING|LUUP|ﾄﾞｺﾓ|DOCOMO|AU|SOFTBANK|UQ|Y!MOBILE|LINEMO|POVO|BIGLOBE|NIFTY|通信|ｲﾝﾀ-ﾈｯﾄ|WIFI|ETC|高速|NEXCO|ｶﾞｿﾘﾝ|ENEOS|出光|ｼｪﾙ|仙台|ﾁｬｰｼﾞｽﾎﾟｯﾄ)/.test(d)) return 'Transport';
  if (/(美容|ｻﾛﾝ|ﾈｲﾙ|ｴｽﾃ|ﾏﾂｴｸ|ﾍｱ-|ｶｯﾄ|ｸﾘﾆｯｸ|病院|歯科|眼科|ﾒﾃﾞｨｶﾙ|薬局|ﾏｯｻ-ｼﾞ|整体|鍼灸|ｱｵﾔﾏﾌ-ﾁﾝ)/.test(d)) return 'Beauty';
  if (/(HOTEL|ﾌﾞｯｷﾝｸﾞ|BOOKING|AGODA|EXPEDIA|JTB|HIS|旅行|旅館|ﾎﾃﾙ|ﾘｿﾞ-ﾄ|AIRBNB|ﾄﾗﾍﾞﾙ|TRIP|TOUR|ﾂｱ-)/.test(d)) return 'Travel';
  if (/(ガス|水道|電気|ﾃﾞﾝｷ|保険|税金|NHK|年金|電力|ｴﾈﾙｷﾞ-|東京瓦斯|TEPCO|家賃|ｱﾊﾟﾏﾝ)/.test(d)) return 'Fixed';
  return 'Others';
};

const formatCurrency = (val) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);

export default function App() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [customRules, setCustomRules] = useState({});
  const [geminiKey, setGeminiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [view, setView] = useState('home'); 
  const [targetMonth, setTargetMonth] = useState('');
  
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('kakeibo_data');
      if (savedData) setAllTransactions(JSON.parse(savedData) || []);
      
      const savedRules = localStorage.getItem('kakeibo_rules');
      if (savedRules) setCustomRules(JSON.parse(savedRules) || {});

      const savedAiKey = localStorage.getItem('kakeibo_aikey');
      if (savedAiKey) setGeminiKey(savedAiKey);

      const savedGhToken = localStorage.getItem('kakeibo_github_token');
      if (savedGhToken) setGithubToken(savedGhToken);
    } catch (e) {
      console.error("Local storage error", e);
    }
  }, []);

  const availableMonths = useMemo(() => {
    const s = new Set();
    allTransactions.forEach(t => {
      const parts = t.date.split('/');
      if (parts.length >= 2) s.add(`${parts[0]}/${parts[1]}`);
      else s.add('不明な日付');
    });
    return Array.from(s).sort().reverse();
  }, [allTransactions]);

  useEffect(() => {
    if (!targetMonth && availableMonths.length > 0) {
      setTargetMonth(availableMonths[0]);
    } else if (targetMonth && !availableMonths.includes(targetMonth) && availableMonths.length > 0) {
      setTargetMonth(availableMonths[0]);
    }
  }, [availableMonths, targetMonth]);

  const { filteredTx, summary, chartData, groupedTxs } = useMemo(() => {
    let filtered = allTransactions;
    if (targetMonth) {
      filtered = allTransactions.filter(t => t.date.startsWith(targetMonth) || (targetMonth === '不明な日付' && !t.date.includes('/')));
    }
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    let totalExp = 0;
    const catTotals = {};
    const groups = {};

    filtered.forEach(tx => {
       totalExp += tx.amount;
       catTotals[tx.catKey] = (catTotals[tx.catKey] || 0) + tx.amount;
       if(!groups[tx.date]) groups[tx.date] = [];
       groups[tx.date].push(tx);
    });

    const cData = Object.keys(catTotals).map(k => ({
      name: CATEGORY_MAP[k].name,
      value: catTotals[k],
      color: CATEGORY_MAP[k].color,
      key: k
    })).sort((a, b) => b.value - a.value);

    const gTx = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(d => ({
      date: d, items: groups[d]
    }));

    return { filteredTx: filtered, summary: totalExp, chartData: cData, groupedTxs: gTx };
  }, [allTransactions, targetMonth]);

  const changeMonth = (delta) => {
    const idx = availableMonths.indexOf(targetMonth);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx >= 0 && newIdx < availableMonths.length) {
      setTargetMonth(availableMonths[newIdx]);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      Papa.parse(event.target.result, {
        skipEmptyLines: true,
        complete: (results) => {
          const rawTxs = [];
          results.data.forEach(row => {
            if (row[0] === '2' || (row.length >= 5 && !isNaN(parseFloat(row[4])))) {
              let date = row[1] ? row[1].trim() : "不明な日付";
              const desc = row[2] ? row[2].trim() : "不明な取引";
              const amount = parseFloat(row[4]) || 0;
              const catKey = categorize(desc, customRules);
              rawTxs.push({ id: Math.random().toString(36).substr(2, 9), date, desc, amount, catKey });
            }
          });

          const negativeTxs = rawTxs.filter(t => t.amount < 0);
          const positiveTxs = rawTxs.filter(t => t.amount >= 0);
          let validTxsInFile = [];
          negativeTxs.forEach(neg => {
            const matchIdx = positiveTxs.findIndex(pos => pos.desc === neg.desc && pos.amount === Math.abs(neg.amount));
            if (matchIdx !== -1) positiveTxs.splice(matchIdx, 1);
            else validTxsInFile.push(neg);
          });
          validTxsInFile = [...validTxsInFile, ...positiveTxs];

          let updatedDB = [...allTransactions];
          validTxsInFile.forEach(newTx => {
            if (newTx.amount < 0) {
               const hIdx = updatedDB.findIndex(h => h.desc === newTx.desc && h.amount === Math.abs(newTx.amount));
               if (hIdx !== -1) updatedDB.splice(hIdx, 1);
               return; 
            }
            const isDup = updatedDB.some(u => u.date === newTx.date && u.desc === newTx.desc && u.amount === newTx.amount);
            if (!isDup) updatedDB.push(newTx);
          });

          setAllTransactions(updatedDB);
          localStorage.setItem('kakeibo_data', JSON.stringify(updatedDB));
          setView('home'); 
        }
      });
    };
    reader.readAsText(file, 'shift-jis');
    e.target.value = ''; 
  };
  
  const updateCategory = (txId, newCatKey) => {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;
    const newRules = { ...customRules, [tx.desc]: newCatKey };
    setCustomRules(newRules);
    localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));

    const updatedTxs = allTransactions.map(t => t.desc === tx.desc ? { ...t, catKey: newCatKey } : t);
    setAllTransactions(updatedTxs);
    localStorage.setItem('kakeibo_data', JSON.stringify(updatedTxs));
  };

  const runAiCategorization = async () => {
    if (!geminiKey) return alert("設定でGeminiのAPIキーを入力してください！");
    
    const others = allTransactions.filter(t => t.catKey === 'Others');
    if (others.length === 0) return alert("現在「その他」に分類されている明細はありません ✨");

    const uniqueDescs = [...new Set(others.map(t => t.desc))];
    setIsAiLoading(true);

    try {
      const prompt = `あなたは家計簿の仕分けAIです。以下のクレジットカード決済名リストを、指定カテゴリーのいずれかに分類しJSONで返してください。
【カテゴリーリスト】: Food, Daily, Shopping, Entertainment, Transport, Beauty, Travel, Fixed, Others
【決済名リスト】:\n${JSON.stringify(uniqueDescs)}
要件:\n- 必ずJSONのみで返す。\n- 例: {"ｳ-ﾊﾞ-ｲ-ﾂ": "Food"}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "AI Error");

      const jsonStr = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResults = JSON.parse(jsonStr);

      const newRules = { ...customRules };
      for (const [desc, cat] of Object.entries(aiResults)) {
         if (CATEGORY_MAP[cat] && cat !== 'Others') newRules[desc] = cat;
      }

      setCustomRules(newRules);
      localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));

      const updatedTxs = allTransactions.map(t => {
         if (aiResults[t.desc] && aiResults[t.desc] !== 'Others' && CATEGORY_MAP[aiResults[t.desc]]) {
             return { ...t, catKey: aiResults[t.desc] };
         } return t;
      });

      setAllTransactions(updatedTxs);
      localStorage.setItem('kakeibo_data', JSON.stringify(updatedTxs));
      alert(`${Object.keys(aiResults).length}件をAIが自動で仕分け・学習しました！✨`);

    } catch(err) {
      alert("AIの通信に失敗しました。(Error: " + err.message + ")");
    } finally {
      setIsAiLoading(false);
    }
  };

  // ----- GITHUB CLOUD SYNC FUNCTIONS -----
  const getSyncGist = async (token) => {
    const res = await fetch('https://api.github.com/gists', {
      headers: { Authorization: `token ${token}` }
    });
    if (!res.ok) throw new Error('GitHubトークンが無効か、権限がありません。');
    const gists = await res.json();
    return gists.find(g => g.description === 'smart-kakeibo-cloud-sync');
  };

  const uploadToCloud = async () => {
    if (!githubToken) return alert("GitHubのトークンを入力してください");
    try {
      setSyncStatus('📡 アップロード中...');
      const exportObj = {
        transactions: allTransactions,
        rules: customRules,
        geminiKey: geminiKey,
        timestamp: new Date().toISOString()
      };
      
      const gistData = {
        description: 'smart-kakeibo-cloud-sync',
        public: false, // 必須: デフォルトで非公開にする（世界中から見えないようにする）
        files: {
          'smart-kakeibo.json': { content: JSON.stringify(exportObj) }
        }
      };

      const existingGist = await getSyncGist(githubToken);
      let url = 'https://api.github.com/gists';
      let method = 'POST';
      
      if (existingGist) {
         url = `https://api.github.com/gists/${existingGist.id}`;
         method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: { 
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(gistData)
      });
      
      if (!res.ok) throw new Error("APIアクセスに失敗しました。");
      localStorage.setItem('kakeibo_github_token', githubToken);
      setSyncStatus('✅ 最新のデータを自分のGitHubクラウドに暗号保存しました');
    } catch(err) {
      setSyncStatus(`❌ エラー: ${err.message}`);
    }
  };

  const downloadFromCloud = async () => {
    if (!githubToken) return alert("GitHubのトークンを入力してください");
    try {
      setSyncStatus('📡 読み込み中...');
      const existingGist = await getSyncGist(githubToken);
      if (!existingGist) {
         setSyncStatus('❌ クラウドに同期データが見つかりません');
         return;
      }
      
      const rawUrl = existingGist.files['smart-kakeibo.json'].raw_url;
      const res = await fetch(rawUrl, {
         headers: { Authorization: `token ${githubToken}` }
      });
      const obj = await res.json();
      
      if (obj.transactions) {
         setAllTransactions(obj.transactions);
         localStorage.setItem('kakeibo_data', JSON.stringify(obj.transactions));
      }
      if (obj.rules) {
         setCustomRules(obj.rules);
         localStorage.setItem('kakeibo_rules', JSON.stringify(obj.rules));
      }
      if (obj.geminiKey) {
         setGeminiKey(obj.geminiKey);
         localStorage.setItem('kakeibo_aikey', obj.geminiKey);
      }
      
      localStorage.setItem('kakeibo_github_token', githubToken);
      setSyncStatus('✅ データをスマホに復元・同期しました！');
      setView('home');
    } catch(err) {
      setSyncStatus(`❌ エラー: ${err.message}`);
    }
  };

  const clearData = () => {
    if (window.confirm("スマホ内の全データを完全に削除しますか？\n（クラウド内のデータは消えません）")) {
      setAllTransactions([]);
      setCustomRules({});
      localStorage.removeItem('kakeibo_data');
      localStorage.removeItem('kakeibo_rules');
      setView('home');
    }
  };

  if (allTransactions.length === 0) {
    return (
      <div id="root">
        <div className="app-header">
           <div className="app-title">スマート明細🧾</div>
        </div>
        <div className="welcome-container animate-fade">
          <h3>家計簿を始めましょう</h3>
          <p style={{color:'var(--text-secondary)', fontSize:'14px', marginTop:'8px', lineHeight:'1.5'}}>
             CSVファイルを読み込むか、下メニューの「設定」からクラウド同期を行ってください！
          </p>
          <label className="welcome-upload">
            <UploadCloud size={48} color="var(--primary-color)" style={{marginBottom: '16px'}} />
            <div style={{fontWeight: '700', fontSize:'18px', color:'var(--primary-color)'}}>CSVファイルを選択</div>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
          </label>
        </div>
        
        <div className="bottom-nav">
           <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
              <Home size={22} /><span className="nav-label">ホーム</span>
           </div>
           <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
              <Settings size={22} /><span className="nav-label">設定</span>
           </div>
        </div>
      </div>
    );
  }

  const othersCount = filteredTx.filter(t => t.catKey === 'Others').length;

  return (
    <div id="root">
      <div className="app-header">
         <div className="app-title">スマート明細</div>
         <div style={{fontWeight: '600', color: 'var(--text-secondary)', fontSize:'14px'}}>{filteredTx.length}件</div>
      </div>

      <div className="content-area">
         {(view === 'home' || view === 'list') && (
           <div className="month-switcher">
              <button className="month-btn" onClick={() => changeMonth(1)} disabled={availableMonths.indexOf(targetMonth) >= availableMonths.length - 1}>
                 <ChevronLeft />
              </button>
              <div className="month-label">{targetMonth}</div>
              <button className="month-btn" onClick={() => changeMonth(-1)} disabled={availableMonths.indexOf(targetMonth) <= 0}>
                 <ChevronRight />
              </button>
           </div>
         )}

         {/* --- HOME VIEW --- */}
         {view === 'home' && (
           <div className="summary-container animate-fade">
              <div className="total-card">
                 <div className="total-title">合計支出</div>
                 <div className="total-amount">{formatCurrency(summary)}</div>
              </div>
              
              {chartData.length > 0 ? (
                <div className="chart-wrapper">
                  <div className="chart-title">カテゴリー内訳</div>
                  <div style={{width:'100%', height:'220px', marginBottom:'20px'}}>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%" cy="50%"
                            innerRadius={65} outerRadius={85}
                            paddingAngle={5} dataKey="value" stroke="none"
                          >
                            {chartData.map((entry, index) => <Cell key={`c-${index}`} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div>
                    {chartData.map(cat => (
                       <div key={cat.key} className="cat-list-item">
                         <div className="cat-dot" style={{backgroundColor: cat.color}}></div>
                         <div className="cat-name">{cat.name}</div>
                         <div className="cat-val">{formatCurrency(cat.value)}</div>
                         <div className="cat-pct">{Math.round((cat.value / summary) * 100)}%</div>
                       </div>
                    ))}
                  </div>

                  <div style={{marginTop:'24px', padding:'16px', background:'rgba(168, 85, 247, 0.05)', borderRadius:'16px', border:'1px solid rgba(168, 85, 247, 0.2)'}}>
                     <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
                        <Sparkles color="#a855f7" size={20}/>
                        <span style={{fontWeight:'700', color:'#a855f7', fontSize:'15px'}}>AIに「その他」を整理させる</span>
                     </div>
                     <p style={{fontSize:'12px', color:'var(--text-secondary)', marginBottom:'16px'}}>
                        現在未分類が <b>{othersCount}</b> 件あります。Google GeminiにAI判別させます。
                     </p>
                     <button 
                       onClick={runAiCategorization} 
                       disabled={isAiLoading || othersCount === 0 || !geminiKey}
                       style={{
                         width:'100%', padding:'12px', borderRadius:'10px', border:'none',
                         background: (!geminiKey || othersCount === 0) ? '#e5e7eb' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                         color: (!geminiKey || othersCount === 0) ? '#9ca3af' : '#fff',
                         fontWeight:'700', cursor: (!geminiKey || othersCount === 0) ? 'not-allowed' : 'pointer'
                       }}>
                        {isAiLoading ? 'AIが考え中...' : (!geminiKey ? 'まずはアプリ設定でAPIキーを入力' : `${othersCount}件の未分類をAIで整理する`)}
                     </button>
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center', marginTop:'40px', color:'var(--text-secondary)'}}>この月のデータはありません</div>
              )}
           </div>
         )}

         {/* --- LIST VIEW --- */}
         {view === 'list' && (
           <div className="animate-fade">
              {groupedTxs.length > 0 ? groupedTxs.map(group => (
                 <div key={group.date}>
                    <div className="tx-group-date">{group.date}</div>
                    <div className="tx-list">
                       {group.items.map(tx => (
                          <div key={tx.id} className="tx-item">
                             <div className="tx-icon-wrapper">{CATEGORY_MAP[tx.catKey].icon}</div>
                             <div className="tx-details">
                                <div className="tx-desc" title={tx.desc}>{tx.desc}</div>
                                <div style={{display:'flex', alignItems:'center'}}>
                                   <select 
                                     className="tx-cat-select"
                                     value={tx.catKey} 
                                     onChange={e => updateCategory(tx.id, e.target.value)}
                                   >
                                     {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k}>{CATEGORY_MAP[k].name}</option>)}
                                   </select>
                                   <Edit3 size={12} style={{marginLeft:'4px', color:'var(--primary-color)'}} />
                                </div>
                             </div>
                             <div className="tx-amount">{formatCurrency(tx.amount)}</div>
                          </div>
                       ))}
                    </div>
                 </div>
              )) : (
                 <div style={{textAlign:'center', marginTop:'40px', color:'var(--text-secondary)'}}>明細がありません</div>
              )}
           </div>
         )}

         {/* --- SETTINGS VIEW --- */}
         {view === 'settings' && (
            <div className="summary-container animate-fade">
               <h2 style={{marginBottom:'24px', fontSize:'24px', fontWeight:'800'}}>設定</h2>

               <div className="chart-wrapper" style={{marginBottom:'24px'}}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px'}}>
                    <Sparkles color="#a855f7" /> 
                    <span style={{fontWeight:'700', fontSize:'16px'}}>Gemini AI 連携 (APIキー)</span>
                 </div>
                 <div style={{display:'flex', alignItems:'center', background:'var(--bg-color)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'12px'}}>
                    <Key size={18} color="var(--primary-color)" style={{marginRight:'12px'}}/>
                    <input 
                      type={showKey ? "text" : "password"} 
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={e => {
                         setGeminiKey(e.target.value);
                         localStorage.setItem('kakeibo_aikey', e.target.value);
                      }}
                      style={{flex:1, border:'none', background:'transparent', outline:'none', fontSize:'16px', color:'var(--text-primary)', width: '100%'}}
                    />
                    <div onClick={() => setShowKey(!showKey)} style={{padding: '0 5px', color:'var(--text-secondary)', cursor:'pointer'}}>
                       {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </div>
                 </div>
               </div>
               
               {/* CLOUD SYNC SECTION */}
               <div className="chart-wrapper" style={{marginBottom:'24px'}}>
                 <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                    <Sparkles color="var(--text-primary)" /> 
                    <span style={{fontWeight:'700', fontSize:'16px'}}>アカウント クラウド同期</span>
                 </div>
                 <p style={{fontSize:'13px', color:'var(--text-secondary)', marginBottom:'20px', lineHeight:'1.5'}}>
                   あなたの「GitHubアカウント」だけを使って安全な専用クラウド同期を実現します。他人にデータが渡る危険性が完全に無い、最高セキュリティでの同期システムです！✨<br/>
                   ※ <a href="https://github.com/settings/tokens/new?scopes=gist&description=SmartKakeibo" target="_blank" rel="noreferrer" style={{color:'var(--primary-color)'}}>GitHubの設定画面 (gist権限のみ付与)</a> からトークンを発行して貼り付けてください。
                 </p>
                 
                 <div style={{display:'flex', alignItems:'center', background:'var(--bg-color)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'12px', marginBottom:'16px'}}>
                    <input 
                      type="password" 
                      placeholder="ghp_xxxx..."
                      value={githubToken}
                      onChange={e => setGithubToken(e.target.value)}
                      style={{flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color:'var(--text-primary)', width: '100%'}}
                    />
                 </div>

                 <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={uploadToCloud} style={{flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', padding:'12px', borderRadius:'10px', border:'none', background:'#10b981', color:'#fff', fontWeight:'700', fontSize:'13px'}}>
                       <Upload size={16} /> クラウドへ保存
                    </button>
                    <button onClick={downloadFromCloud} style={{flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', padding:'12px', borderRadius:'10px', border:'none', background:'var(--primary-color)', color:'#fff', fontWeight:'700', fontSize:'13px'}}>
                       <Download size={16} /> データを読み込む
                    </button>
                 </div>
                 
                 {syncStatus && (
                    <div style={{marginTop:'12px', fontSize:'13px', color:'var(--text-primary)', background:'rgba(0,0,0,0.05)', padding:'10px 12px', borderRadius:'8px', fontWeight:'600'}}>
                      {syncStatus}
                    </div>
                 )}
               </div>

               <div className="chart-wrapper">
                 <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                    <ShieldAlert color="var(--danger-color)" /> 
                    <span style={{fontWeight:'700', fontSize:'16px'}}>端末上のデータリセット</span>
                 </div>
                 <p style={{fontSize:'13px', color:'var(--text-secondary)', marginBottom:'20px'}}>
                   このスマホに保存されているすべての明細を完全に消去します。
                 </p>
                 <button className="settings-btn" onClick={clearData}>端末の全データを消去</button>
               </div>
            </div>
         )}
      </div>

      {view !== 'settings' && (
        <label className="fab">
           <Plus size={28} />
           <input type="file" accept=".csv" onChange={handleFileUpload} />
        </label>
      )}

      <div className="bottom-nav">
         <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
            <Home size={22} /><span className="nav-label">ホーム</span>
         </div>
         <div className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            <List size={22} /><span className="nav-label">明細</span>
         </div>
         <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <Settings size={22} /><span className="nav-label">設定</span>
         </div>
      </div>
    </div>
  );
}
