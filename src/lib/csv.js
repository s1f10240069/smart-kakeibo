import Papa from 'papaparse';
import { categorize } from './categories';

export const parseOneFile = (csvText, currentDB, rulesSnap) => new Promise(resolve => {
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

export const readFileAsText = (file) => new Promise(resolve => {
  const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsText(file, 'shift-jis');
});
