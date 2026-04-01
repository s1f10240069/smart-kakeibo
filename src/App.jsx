import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { UploadCloud, AlertCircle, BarChart3, ListFilter, Trash2, Smartphone, Calendar, ChevronDown, Edit3 } from 'lucide-react';
import './index.css';

const CATEGORY_MAP = {
  Food: { name: '食費・飲食', color: '#f43f5e', icon: '🍔' },
  Daily: { name: '日・スーパー', color: '#10b981', icon: '🛒' },
  Shopping: { name: 'ショッピング', color: '#34d399', icon: '🛍️' },
  Entertainment: { name: 'エンタメ・趣味', color: '#a855f7', icon: '🎮' },
  Transport: { name: '交通・通信', color: '#3b82f6', icon: '🚃' },
  Beauty: { name: '美容・被服・医療', color: '#ec4899', icon: '✂️' },
  Travel: { name: '旅行・宿泊', color: '#f59e0b', icon: '🏨' },
  Fixed: { name: '固定費・税金', color: '#0ea5e9', icon: '📄' },
  Others: { name: 'その他', color: '#94a3b8', icon: '💳' },
};

const categorize = (desc, customRules = {}) => {
  const d = desc.toUpperCase();

  // 1. Check user custom rules first (Learning AI Feature)
  // We check if the transaction description contains the rule keyword.
  for (const [ruleKeyword, ruleCat] of Object.entries(customRules)) {
    if (d.includes(ruleKeyword.toUpperCase())) return ruleCat;
  }

  // 2. Comprehensive heuristics based on common Japanese credit card specs
  if (/(ﾏｸﾄﾞﾅﾙﾄﾞ|FAMILYMART|ﾌｱﾐﾘ-ﾏ-ﾄ|ﾛ-ｿﾝ|ｾﾌﾞﾝ|ﾏﾂﾔ|ﾔﾖｲｹﾝ|ｾﾝﾀ-ﾋﾞ-ﾌ|ﾀﾝﾔ|ｱﾀﾐﾌﾟﾘﾝ|ｺﾞ-ｺﾞ-ｶﾚ-|ｶﾌｪ|ﾚｽﾄﾗﾝ|ｺ-ﾋ-|ｽﾀﾊﾞ|ﾄﾞﾄ-ﾙ|ｲｻﾞｶﾔ|ｳ-ﾊﾞ-|UBER|WOLT|ﾃﾞﾘﾊﾞﾘ-|ｽｼ|焼肉|食堂|KFC|ｻｲｾﾞﾘﾔ|ｶﾞｽﾄ|すき家|吉野家|モスバーガー)/.test(d)) return 'Food';
  
  if (/(MAXVALU|ﾏｯｸｽﾊﾞﾘｭ|ﾒｶﾞﾄﾞﾝｷ|ﾄﾞﾝｷﾎ-ﾃ|CANDO|ﾀﾞｲｿ-|DAISO|ｾﾘｱ|ｲｵﾝ|AEON|ｽ-ﾊﾟ-|ﾏﾙｴﾂ|ｲﾄ-ﾖ-ｶﾄﾞ-|ｾｲﾕｳ|SEIYU|ｵｵｾﾞｷ|ﾗｲﾌ|ｵ-ｹ-|ﾏﾂﾓﾄｷﾖｼ|薬|ﾄﾞﾗｯｸﾞ|ｳｴﾙｼｱ|ｽｷﾞﾔｯｷｮｸ|ｺｺｶﾗﾌｧｲﾝ|ｻﾝﾄﾞﾗｯｸﾞ)/.test(d)) return 'Daily';
  
  if (/(AMAZON|ｱﾏｿﾞﾝ|YAMADA|ﾋﾞｯｸｶﾒﾗ|ﾖﾄﾞﾊﾞｼ|ﾆﾄﾘ|IKEA|無印|ﾑｼﾞﾙｼ|UNIQLO|ﾕﾆｸﾛ|GU|ｼﾏﾑﾗ|ZOZOTOWN|楽天|ﾗｸﾃﾝ|YAHOO|ﾏﾙｲ|ﾙﾐﾈ|百貨店)/.test(d)) return 'Shopping';

  if (/(STEAM|NINTENDO|YOUTUB|HOSHIMACHI|ﾋﾒﾋﾅ|ﾂﾀﾔ|ｸﾞｯｽﾞ|ﾏﾙｸ|NETFLIX|PRIME|DISNEY|SPOTIFY|APPLE COM|GOOGLE|DMM|FANZA|PIXIV|ｺﾐｯｸ|ｹﾞ-ﾑ|ｶﾗｵｹ|映画|ｼﾈﾏ|TICKET|ﾁｹｯﾄ|ｲﾍﾞﾝﾄ|TOHO|本|書店)/.test(d)) return 'Entertainment';

  if (/(HELLO CYCLING|仙台|ﾀｸｼ-|ﾎﾟｳﾞｫ|POVO|ﾁｬｰｼﾞｽﾎﾟｯﾄ|JR|SUICA|PASMO|ｸﾘｱﾊﾟｽ|携帯|ﾄﾞｺﾓ|DOCOMO|AU|SOFTBANK|UQ|Y!MOBILE|LINEMO|BIGLOBE|NIFTY|通信|ｲﾝﾀ-ﾈｯﾄ|WIFI|ETC|高速|ｶﾞｿﾘﾝ|ENEOS|出光|ﾊﾞｽ|航空|ANA|JAL|PEACH|PARKING|駐輪|駐車)/.test(d)) return 'Transport';

  if (/(ｶﾂﾄｼﾞﾕﾝ|ｱｵﾔﾏﾌ-ﾁﾝ|美容|ｻﾛﾝ|ﾈｲﾙ|ｸﾘﾆｯｸ|病院|歯科|眼科|ﾒﾃﾞｨｶﾙ|ﾍｱ-|ﾏｯｻ-ｼﾞ)/.test(d)) return 'Beauty';

  if (/(HOTEL|ﾌﾞｯｷﾝｸﾞ|BOOKING|AGODA|EXPEDIA|JTB|HIS|旅行|旅館|ﾎﾃﾙ|ﾘｿﾞ-ﾄ|AIRBNB|ﾄﾗﾍﾞﾙ)/.test(d)) return 'Travel';

  if (/(ガス|水道|電気|ﾃﾞﾝｷ|保険|税金|NHK|年金|電力|ｴﾈﾙｷﾞ-|東京瓦斯|TEPCO|家賃|ｱﾊﾟﾏﾝ)/.test(d)) return 'Fixed';

  return 'Others';
};

const formatCurrency = (val) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);

export default function App() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]); // Filtered
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'list'
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  
  // Custom Learning Rules
  const [customRules, setCustomRules] = useState({});

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kakeibo_data');
    if (saved) {
      try {
         setAllTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local kakeibo data", e);
      }
    }
    
    const savedRules = localStorage.getItem('kakeibo_rules');
    if (savedRules) {
      try {
         setCustomRules(JSON.parse(savedRules));
      } catch (e) {
         console.error(e);
      }
    }
  }, []);

  // Compute month list and filter transactions when data or selected month changes
  useEffect(() => {
    if (allTransactions.length === 0) {
      setTransactions([]);
      setSummary({ totalExp: 0, chartData: [] });
      setAvailableMonths([]);
      return;
    }

    // Extract unique months (e.g. "2026/03")
    const monthsSet = new Set();
    allTransactions.forEach(t => {
      const p = t.date.split('/');
      if (p.length >= 2) monthsSet.add(`${p[0]}/${p[1]}`);
      else monthsSet.add('不明な日付');
    });
    
    const months = Array.from(monthsSet).sort().reverse();
    setAvailableMonths(months);

    // Default to the most recent month if not selected
    let targetMonth = selectedMonth;
    if (!months.includes(selectedMonth)) {
      targetMonth = months[0];
      setSelectedMonth(months[0]);
    }

    // Filter by month
    let filtered = allTransactions.filter(t => {
      if (targetMonth === 'ALL') return true;
      if (targetMonth === '不明な日付' && !t.date.includes('/')) return true;
      return t.date.startsWith(targetMonth);
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary calculation
    let totalExp = 0;
    const catTotals = {};

    filtered.forEach(tx => {
      totalExp += tx.amount;
      catTotals[tx.catKey] = (catTotals[tx.catKey] || 0) + tx.amount;
    });

    const chartData = Object.keys(catTotals).map(k => ({
      name: CATEGORY_MAP[k].name,
      value: catTotals[k],
      color: CATEGORY_MAP[k].color,
      key: k
    })).sort((a, b) => b.value - a.value);

    setTransactions(filtered);
    setSummary({ totalExp, chartData });
  }, [allTransactions, selectedMonth]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      
      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: (results) => {
          const rawTxs = [];
          
          results.data.forEach(row => {
            if (row[0] === '2' || (row.length >= 5 && !isNaN(parseFloat(row[4])))) {
              let date = row[1] ? row[1].trim() : "不明な日付";
              if (date === "") date = "日付なし";
              const desc = row[2] ? row[2].trim() : "不明な取引";
              const amount = parseFloat(row[4]) || 0;
              // Categorize with custom rules!
              const catKey = categorize(desc, customRules);
              rawTxs.push({ id: Math.random().toString(36).substr(2, 9), date, desc, amount, catKey });
            }
          });

          // Pre-process: Handle refunds/cancellations automatically
          const negativeTxs = rawTxs.filter(t => t.amount < 0);
          const positiveTxs = rawTxs.filter(t => t.amount >= 0);

          let validTxsInFile = [];
          
          negativeTxs.forEach(neg => {
            const matchIndex = positiveTxs.findIndex(pos => pos.desc === neg.desc && pos.amount === Math.abs(neg.amount));
            if (matchIndex !== -1) {
              positiveTxs.splice(matchIndex, 1);
            } else {
              validTxsInFile.push(neg);
            }
          });
          validTxsInFile = [...validTxsInFile, ...positiveTxs];

          // Merge with Local DB
          let updatedDB = [...allTransactions];
          
          validTxsInFile.forEach(newTx => {
            if (newTx.amount < 0) {
               const hMatchIdx = updatedDB.findIndex(h => h.desc === newTx.desc && h.amount === Math.abs(newTx.amount));
               if (hMatchIdx !== -1) {
                 updatedDB.splice(hMatchIdx, 1);
                 return;
               }
               return; 
            }

            const isDup = updatedDB.some(u => u.date === newTx.date && u.desc === newTx.desc && u.amount === newTx.amount);
            if (!isDup) {
              updatedDB.push(newTx);
            }
          });

          setAllTransactions(updatedDB);
          localStorage.setItem('kakeibo_data', JSON.stringify(updatedDB));
        }
      });
    };
    reader.readAsText(file, 'shift-jis');
    e.target.value = ''; // reset
  };
  
  const updateCategory = (txId, newCatKey) => {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;

    // 1. Save rule to automatically apply to identical descriptions in the future
    const newRules = { ...customRules, [tx.desc]: newCatKey };
    setCustomRules(newRules);
    localStorage.setItem('kakeibo_rules', JSON.stringify(newRules));

    // 2. Retroactively apply this new rule to ALL existing transactions with the same description!
    const updatedTxs = allTransactions.map(t => {
      if (t.desc === tx.desc) {
        return { ...t, catKey: newCatKey };
      }
      return t;
    });
    setAllTransactions(updatedTxs);
    localStorage.setItem('kakeibo_data', JSON.stringify(updatedTxs));
  };

  const clearData = () => {
    if (window.confirm("これまでの記録をすべて削除しますか？")) {
      setAllTransactions([]);
      localStorage.removeItem('kakeibo_data');
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>スマート明細</h1>
        <p>自動判定＆学習機能つき家計簿🤖✨</p>
      </div>

      {allTransactions.length === 0 ? (
        <div className="animate-fade-in">
          <label className="uploader">
            <UploadCloud size={48} />
            <div className="upload-title">CSVファイルを選択</div>
            <div className="upload-desc">タップしてスマホから明細CSVをアップロードしてください。過去のデータもずっと記録されます。</div>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
          </label>

          <div className="info-box glass-card">
            <div className="info-title"><AlertCircle size={18} /> スゴイ自動判定＆学習！</div>
            <div className="info-text">
              ほとんどのお店を自動で判別しますが、もし間違っていたり「その他」になってしまった場合は、<br/>
              <b>明細リストでカテゴリーを直接変更</b>してください。アプリがそのルールを学習し、次回から自動で分類します！
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          
          <div className="glass-card" style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
              <div style={{position: 'relative'}}>
                <select 
                  className="month-selector"
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                >
                  <option value="ALL">すべて表示</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div style={{position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none', color: '#6366f1'}}>
                   <ChevronDown size={14} />
                </div>
              </div>
              <label className="btn-upload-small" style={{cursor:'pointer', fontSize:'13px', background:'rgba(99, 102, 241, 0.2)', padding:'8px 12px', borderRadius:'8px', display:'flex', alignItems:'center', gap:'4px'}}>
                <UploadCloud size={14}/> 追加読込
                <input type="file" accept=".csv" onChange={handleFileUpload} style={{display:'none'}} />
              </label>
            </div>
            
            <div className="summary-label">支出合計</div>
            <div className="summary-balance">{summary && formatCurrency(summary.totalExp)}</div>
            <div className="summary-period" style={{color: '#10b981'}}>AI自動学習・キャンセル自動相殺が有効です</div>
          </div>

          <div className="tabs">
            <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              <BarChart3 size={16} style={{display:'inline', marginBottom:'-3px', marginRight:'6px'}}/>サマリー
            </div>
            <div className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
              <ListFilter size={16} style={{display:'inline', marginBottom:'-3px', marginRight:'6px'}}/>明細 ({transactions.length}件)
            </div>
          </div>

          {activeTab === 'summary' && summary?.chartData?.length > 0 && (
            <div className="glass-card animate-fade-in">
              <h3 style={{fontSize:'16px', fontWeight:'700', marginBottom:'16px'}}>カテゴリ別支出</h3>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {summary.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ background: 'rgba(30, 33, 48, 0.9)', border: 'none', borderRadius: '12px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{marginTop: '20px'}}>
                {summary.chartData.map(cat => (
                   <div key={cat.key} className="category-item">
                     <div className="cat-info">
                       <div className="cat-color" style={{backgroundColor: cat.color}}></div>
                       <span className="cat-name">{cat.name}</span>
                     </div>
                     <div style={{display:'flex', alignItems:'center'}}>
                       <span className="cat-amount">{formatCurrency(cat.value)}</span>
                       <span className="cat-percent">
                         {Math.round((cat.value / summary.totalExp) * 100)}%
                       </span>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'summary' && summary?.chartData?.length === 0 && (
             <div className="glass-card animate-fade-in" style={{textAlign: 'center', color: '#94a3b8', padding: '40px 20px'}}>
                この期間のデータはありません
             </div>
          )}

          {activeTab === 'list' && (
            <div className="transaction-list animate-fade-in">
              <div style={{fontSize:'12px', color:'#94a3b8', textAlign:'center', marginBottom:'10px'}}>
                💡 カテゴリ名（右側）をタップすると自由に分類を変更＆学習させられます
              </div>
              {transactions.length > 0 ? transactions.map(tx => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-icon">
                    {CATEGORY_MAP[tx.catKey].icon}
                  </div>
                  <div className="tx-details">
                     <div className="tx-name" title={tx.desc}>{tx.desc}</div>
                     <div className="tx-meta" style={{alignItems: 'center'}}>
                       <div>{tx.date}</div>
                       <div style={{display:'flex', alignItems:'center', background:'rgba(255,255,255,0.08)', padding:'2px 8px', borderRadius:'10px', marginLeft:'6px'}}>
                         <select 
                           value={tx.catKey} 
                           onChange={e => updateCategory(tx.id, e.target.value)}
                           style={{ background: 'transparent', color: '#818cf8', border: 'none', fontSize: '11px', outline: 'none', cursor: 'pointer', padding: 0, fontWeight: '600' }}
                         >
                           {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k} style={{color: '#000'}}>{CATEGORY_MAP[k].name}</option>)}
                         </select>
                         <Edit3 size={10} style={{marginLeft:'4px', color:'#818cf8'}} />
                       </div>
                     </div>
                  </div>
                  <div className="tx-amount expense">
                     {formatCurrency(tx.amount)}
                  </div>
                </div>
              )) : (
                 <div style={{textAlign: 'center', color: '#94a3b8', padding: '40px 20px'}}>データがありません</div>
              )}
            </div>
          )}
          
          <button className="btn-secondary" onClick={clearData} style={{color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)'}}>
             <Trash2 size={16} style={{display:'inline', marginBottom:'-3px', marginRight:'6px'}}/> 全データをリセット
          </button>

        </div>
      )}
    </div>
  );
}
