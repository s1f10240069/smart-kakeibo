import { useState, useMemo, useEffect, useRef } from 'react';
import { CATEGORY_MAP } from '../lib/categories';
import { parseOneFile, readFileAsText } from '../lib/csv';
import { applyAiResultsToData } from '../lib/gemini';
import { getTransactionMonth, normalizeTransactions } from '../lib/dates';

// 取引データ・カスタムルール・派生値・CRUDを一元管理するフック
export function useTransactions() {
  const [allTransactions, setAllTransactions] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('kakeibo_data') || '[]');
      const normalized = normalizeTransactions(stored);
      if (normalized.some((transaction, index) => transaction !== stored[index])) {
        localStorage.setItem('kakeibo_data', JSON.stringify(normalized));
        localStorage.setItem('kakeibo_local_modified', String(Date.now()));
      }
      return normalized;
    } catch { return []; }
  });
  const [customRules, setCustomRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kakeibo_rules') || '{}'); } catch { return {}; }
  });
  const [targetMonth, setTargetMonth] = useState('');
  const [localModifiedTick, setLocalModifiedTick] = useState(0);

  const availableMonths = useMemo(() => {
    const s = new Set();
    allTransactions.forEach(t => {
      s.add(getTransactionMonth(t.date) || '不明な日付');
    });
    return Array.from(s).sort((a, b) => {
      if (a === '不明な日付') return 1;
      if (b === '不明な日付') return -1;
      return b.localeCompare(a);
    });
  }, [allTransactions]);

  // 同期によって新しい月が追加されたとき、もともと最新月を見ていた場合は新しい最新月へ進める。
  // 過去月を明示的に見ている場合は、その選択を維持する。
  const previousLatestMonthRef = useRef('');
  useEffect(() => {
    const latestMonth = availableMonths[0] || '';
    setTargetMonth(current => {
      if (!latestMonth) return '';
      if (!current || !availableMonths.includes(current)) return latestMonth;
      if (previousLatestMonthRef.current && current === previousLatestMonthRef.current) return latestMonth;
      return current;
    });
    previousLatestMonthRef.current = latestMonth;
  }, [availableMonths]);

  const monthTotals = useMemo(() => {
    const totals = {};
    allTransactions.forEach(t => {
      const month = getTransactionMonth(t.date);
      if (month) totals[month] = (totals[month] || 0) + t.amount;
    });
    return totals;
  }, [allTransactions]);

  const { filteredTx, summary, chartData, groupedTxs } = useMemo(() => {
    let filtered = allTransactions;
    if (targetMonth) {
      filtered = allTransactions.filter(t =>
        getTransactionMonth(t.date) === targetMonth || (targetMonth === '不明な日付' && !getTransactionMonth(t.date))
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
    const prevTx = allTransactions.filter(t => getTransactionMonth(t.date) === prevMonth);
    let total = 0; const catTotals = {};
    prevTx.forEach(tx => { total += tx.amount; catTotals[tx.catKey] = (catTotals[tx.catKey] || 0) + tx.amount; });
    return { month: prevMonth, total, catTotals };
  }, [allTransactions, targetMonth, availableMonths]);

  const allMonthsSummary = useMemo(() =>
    availableMonths.slice().reverse().map(m => {
      const total = allTransactions.filter(t => getTransactionMonth(t.date) === m).reduce((s, t) => s + t.amount, 0);
      const label = m.replace(/^20(\d{2})\/0?(\d+)$/, `'$1/$2`);
      return { month: m, label, total };
    }), [allTransactions, availableMonths]);

  // localStorageのタイムスタンプ更新に加えてtickをインクリメントし、
  // useGoogleAuth側でこの呼び出しだけを厳密に検知して自動アップロードのトリガーにできるようにする
  const touchLocalModified = () => {
    localStorage.setItem('kakeibo_local_modified', String(Date.now()));
    setLocalModifiedTick(t => t + 1);
  };

  const changeMonth = (delta) => {
    const idx = availableMonths.indexOf(targetMonth);
    if (idx === -1) return;
    const ni = idx + delta;
    if (ni >= 0 && ni < availableMonths.length) setTargetMonth(availableMonths[ni]);
  };

  // ファイル取込（完了後の「ホームへ遷移」は呼び出し元で行う）
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

  const othersCount = allTransactions.filter(t => t.catKey === 'Others').length;
  const currentOthersCount = filteredTx.filter(t => t.catKey === 'Others').length;
  const diffAmount = prevMonthData ? summary - prevMonthData.total : null;
  const diffPct = prevMonthData && prevMonthData.total > 0 ? ((diffAmount / prevMonthData.total) * 100).toFixed(1) : null;

  return {
    allTransactions, setAllTransactions,
    customRules, setCustomRules,
    targetMonth, setTargetMonth,
    availableMonths, monthTotals,
    filteredTx, summary, chartData, groupedTxs,
    prevMonthData, allMonthsSummary,
    othersCount, currentOthersCount, diffAmount, diffPct,
    touchLocalModified, localModifiedTick,
    changeMonth, handleFileUpload, updateCategory, applyAiResults,
  };
}
