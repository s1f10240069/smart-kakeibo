import { CATEGORY_MAP } from './categories';

export const callGemini = async (prompt, apiKey) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'AI Error');
  return JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
};

export const AI_PROMPT = (descs) =>
  `あなたは家計簿の仕分けAIです。以下のクレジットカード決済名リストを、指定カテゴリーのいずれかに分類しJSONで返してください。
【カテゴリーリスト】: Food, Daily, Shopping, Entertainment, Transport, Beauty, Travel, Fixed, Others
【決済名リスト】:\n${JSON.stringify(descs)}
要件:\n- 必ずJSONのみで返す。\n- 例: {"ｳ-ﾊﾞ-ｲ-ﾂ": "Food"}`;

// AI結果を取引とルールへ反映した結果を「計算」だけして返す（setState/localStorage は呼び出し元で行う）
export const applyAiResultsToData = (aiResults, baseTxs, baseRules) => {
  const newRules = { ...baseRules };
  for (const [desc, cat] of Object.entries(aiResults))
    if (CATEGORY_MAP[cat] && cat !== 'Others') newRules[desc] = cat;
  const updatedTxs = baseTxs.map(t =>
    aiResults[t.desc] && aiResults[t.desc] !== 'Others' && CATEGORY_MAP[aiResults[t.desc]]
      ? { ...t, catKey: aiResults[t.desc] } : t
  );
  return { newRules, updatedTxs, learnedCount: Object.keys(newRules).length - Object.keys(baseRules).length };
};
