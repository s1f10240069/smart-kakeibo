import { useState } from 'react';
import { callGemini, AI_PROMPT } from '../lib/gemini';

// Gemini APIによるカテゴリ自動仕分けを管理するフック
export function useAi({ allTransactions, customRules, filteredTx, applyAiResults }) {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('kakeibo_aikey') || '');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAllMonthsLoading, setAiAllMonthsLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState('');

  const handleGeminiKeyChange = (v) => { setGeminiKey(v); localStorage.setItem('kakeibo_aikey', v); };

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

  return {
    geminiKey, handleGeminiKeyChange,
    isAiLoading, aiAllMonthsLoading, aiProgress,
    runAiCategorization, runAiCategorizationAllMonths,
  };
}
