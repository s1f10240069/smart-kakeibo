import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { UploadCloud, Plus, Home, List, Settings, ChevronLeft, ChevronRight, Edit3, ShieldAlert } from 'lucide-react';
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
  if (/(ﾏｸﾄﾞﾅﾙﾄﾞ|FAMILYMART|ﾌｱﾐﾘ-ﾏ-ﾄ|ﾛ-ｿﾝ|ｾﾌﾞﾝ|ﾏﾂﾔ|ﾔﾖｲｹﾝ|ｾﾝﾀ-ﾋﾞ-ﾌ|ﾀﾝﾔ|ｱﾀﾐﾌﾟﾘﾝ|ｺﾞ-ｺﾞ-ｶﾚ-|ｶﾌｪ|ﾚｽﾄﾗﾝ|ｺ-ﾋ-|ｽﾀﾊﾞ|ﾄﾞﾄ-ﾙ|ｲｻﾞｶﾔ|ｳ-ﾊﾞ-|UBER|WOLT|ﾃﾞﾘﾊﾞﾘ-|ｽｼ|焼肉|食堂|KFC|ｻｲｾﾞﾘﾔ|ｶﾞｽﾄ|すき家|吉野家|モスバーガー)/.test(d)) return 'Food';
  if (/(MAXVALU|ﾏｯｸｽﾊﾞﾘｭ|ﾒｶﾞﾄﾞﾝｷ|ﾄﾞﾝｷﾎ-ﾃ|CANDO|ﾀﾞｲｿ-|DAISO|ｾﾘｱ|ｲｵﾝ|AEON|ｽ-ﾊﾟ-|ﾏﾙｴﾂ|ｲﾄ-ﾖ-ｶﾄﾞ-|ｾｲﾕｳ|SEIYU|ｵｵｾﾞｷ|ﾗｲﾌ|ｵ-ｹ-|ﾏﾂﾓﾄｷﾖｼ|薬|ﾄﾞﾗｯｸﾞ|ｳｴﾙｼｱ|ｽｷﾞﾔｯｷｮｸ|ｺｺｶﾗﾌｧｲﾝ|ｻﾝﾄﾞﾗｯｸﾞ)/.test(d)) return 'Daily';
  if (/(AMAZON|ｱﾏｿﾞﾝ|YAMADA|ﾋﾞｯｸｶﾒﾗ|ﾖﾄﾞﾊﾞｼ|ﾆﾄﾘ|IKEA|無印|ﾑｼﾞﾙｼ|UNIQLO|ﾕﾆｸﾛ|GU|ｼﾏﾑﾗ|ZOZOTOWN|楽天|ﾗｸﾃﾝ|YAHOO|ﾏﾙｲ|ﾙﾐﾈ|百貨店)/.test(d)) return 'Shopping';
  if (/(STEAM|NINTENDO|YOUTUB|HOSHIMACHI|ﾋﾒﾋﾅ|ﾂﾀﾔ|ｸﾞｯｽﾞ|ﾏﾙｸ|NETFLIX|PRIME|DISNEY|SPOTIFY|APPLE|GOOGLE|DMM|FANZA|PIXIV|ｺﾐｯｸ|ｹﾞ-ﾑ|ｶﾗｵｹ|映画|ｼﾈﾏ|TICKET|ﾁｹｯﾄ|ｲﾍﾞﾝﾄ|TOHO|本|書店)/.test(d)) return 'Entertainment';
  if (/(HELLO CYCLING|仙台|ﾀｸｼ-|ﾎﾟｳﾞｫ|POVO|ﾁｬｰｼﾞｽﾎﾟｯﾄ|JR|SUICA|PASMO|ｸﾘｱﾊﾟｽ|携帯|ﾄﾞｺﾓ|DOCOMO|AU|SOFTBANK|UQ|Y!MOBILE|LINEMO|BIGLOBE|NIFTY|通信|ｲﾝﾀ-ﾈｯﾄ|WIFI|ETC|高速|ｶﾞｿﾘﾝ|ENEOS|出光|ﾊﾞｽ|航空|ANA|JAL|PEACH|PARKING|駐輪|駐車)/.test(d)) return 'Transport';
  if (/(ｶﾂﾄｼﾞﾕﾝ|ｱｵﾔﾏﾌ-ﾁﾝ|美容|ｻﾛﾝ|ﾈｲﾙ|ｸﾘﾆｯｸ|病院|歯科|眼科|ﾒﾃﾞｨｶﾙ|ﾍｱ-|ﾏｯｻ-ｼﾞ)/.test(d)) return 'Beauty';
  if (/(HOTEL|ﾌﾞｯｷﾝｸﾞ|BOOKING|AGODA|EXPEDIA|JTB|HIS|旅行|旅館|ﾎﾃﾙ|ﾘｿﾞ-ﾄ|AIRBNB|ﾄﾗﾍﾞﾙ)/.test(d)) return 'Travel';
  if (/(ガス|水道|電気|ﾃﾞﾝｷ|保険|税金|NHK|年金|電力|ｴﾈﾙｷﾞ-|東京瓦斯|TEPCO|家賃|ｱﾊﾟﾏﾝ)/.test(d)) return 'Fixed';
  return 'Others';
};

const formatCurrency = (val) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);

export default function App() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [customRules, setCustomRules] = useState({});
  const [view, setView] = useState('home'); // 'home', 'list', 'settings'
  const [targetMonth, setTargetMonth] = useState('');
  
  // Robust Loading from LocalStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('kakeibo_data');
      if (savedData) setAllTransactions(JSON.parse(savedData) || []);
      
      const savedRules = localStorage.getItem('kakeibo_rules');
      if (savedRules) setCustomRules(JSON.parse(savedRules) || {});
    } catch (e) {
      console.error("Local storage parsing error", e);
    }
  }, []);

  // Compute available months uniquely sorting descending
  const availableMonths = useMemo(() => {
    const s = new Set();
    allTransactions.forEach(t => {
      const parts = t.date.split('/');
      if (parts.length >= 2) s.add(`${parts[0]}/${parts[1]}`);
      else s.add('不明な日付');
    });
    return Array.from(s).sort().reverse();
  }, [allTransactions]);

  // Set default target month if none is selected
  useEffect(() => {
    if (!targetMonth && availableMonths.length > 0) {
      setTargetMonth(availableMonths[0]);
    } else if (targetMonth && !availableMonths.includes(targetMonth) && availableMonths.length > 0) {
      setTargetMonth(availableMonths[0]);
    }
  }, [availableMonths, targetMonth]);

  // Filtered operations
  const { filteredTx, summary, chartData, groupedTxs } = useMemo(() => {
    let filtered = allTransactions;
    if (targetMonth) {
      filtered = allTransactions.filter(t => t.date.startsWith(targetMonth) || (targetMonth === '不明な日付' && !t.date.includes('/')));
    }
    // Sort descending by date
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

    // Array of {date: "2026/03/31", items: [...]}
    const gTx = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(d => ({
      date: d, items: groups[d]
    }));

    return { filteredTx: filtered, summary: totalExp, chartData: cData, groupedTxs: gTx };
  }, [allTransactions, targetMonth]);

  // Handle Month Switcher
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

          // Pre-process Cancellations (Negative matches positive -> both dropped)
          const negativeTxs = rawTxs.filter(t => t.amount < 0);
          const positiveTxs = rawTxs.filter(t => t.amount >= 0);
          let validTxsInFile = [];
          negativeTxs.forEach(neg => {
            const matchIdx = positiveTxs.findIndex(pos => pos.desc === neg.desc && pos.amount === Math.abs(neg.amount));
            if (matchIdx !== -1) positiveTxs.splice(matchIdx, 1);
            else validTxsInFile.push(neg);
          });
          validTxsInFile = [...validTxsInFile, ...positiveTxs];

          // Merge with Local DB
          let updatedDB = [...allTransactions];
          validTxsInFile.forEach(newTx => {
            if (newTx.amount < 0) {
               // Retroactive cancellation against existing history
               const hIdx = updatedDB.findIndex(h => h.desc === newTx.desc && h.amount === Math.abs(newTx.amount));
               if (hIdx !== -1) updatedDB.splice(hIdx, 1);
               return; 
            }
            const isDup = updatedDB.some(u => u.date === newTx.date && u.desc === newTx.desc && u.amount === newTx.amount);
            if (!isDup) updatedDB.push(newTx);
          });

          setAllTransactions(updatedDB);
          localStorage.setItem('kakeibo_data', JSON.stringify(updatedDB));
          
          // Switch view back to home to see imports
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

  const clearData = () => {
    if (window.confirm("これまでの記録をすべて完全に削除しますか？\n（この操作は取り消せません）")) {
      setAllTransactions([]);
      localStorage.removeItem('kakeibo_data');
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
          <p style={{color:'var(--text-secondary)', fontSize:'14px', marginTop:'8px'}}>
             スマホでエクスポートしたクレジットカードのCSVを読み込むだけで、自動で分類・学習されます！<br/><br/>
             💡 ページをリロードしてもデータは残ります
          </p>
          <label className="welcome-upload">
            <UploadCloud size={48} color="var(--primary-color)" style={{marginBottom: '16px'}} />
            <div style={{fontWeight: '700', fontSize:'18px', color:'var(--primary-color)'}}>CSVファイルを選択</div>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div id="root">
      {/* Header */}
      <div className="app-header">
         <div className="app-title">スマート明細</div>
         <div style={{fontWeight: '600', color: 'var(--text-secondary)', fontSize:'14px'}}>{filteredTx.length}件</div>
      </div>

      <div className="content-area">
         
         {/* Switcher common across both Home and List */}
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
               <div className="chart-wrapper">
                 <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                    <ShieldAlert color="var(--danger-color)" /> 
                    <span style={{fontWeight:'700', fontSize:'16px'}}>データのリセット</span>
                 </div>
                 <p style={{fontSize:'13px', color:'var(--text-secondary)', marginBottom:'20px'}}>
                   アプリ内に保存されているすべての明細データと、あなたが手動で学習させたカテゴリー分類ルールの記録を完全に消去します。
                 </p>
                 <button className="settings-btn" onClick={clearData}>全データを削除する</button>
               </div>
            </div>
         )}

      </div>

      {/* Floating Action Button (Shows when not in settings) */}
      {view !== 'settings' && (
        <label className="fab">
           <Plus size={28} />
           <input type="file" accept=".csv" onChange={handleFileUpload} />
        </label>
      )}

      {/* Bottom Nav */}
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
