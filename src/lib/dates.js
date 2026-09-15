// CSVごとの「2026/9/1」「2026/09/01」「2026-9-1」という表記ゆれを
// 画面・同期で共通利用する YYYY/MM/DD に揃える。
export const normalizeTransactionDate = (value) => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return text;

  const [, year, month, day] = match;
  return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
};

export const normalizeTransactions = (transactions) => (
  transactions.map(transaction => {
    const date = normalizeTransactionDate(transaction.date);
    return date === transaction.date ? transaction : { ...transaction, date };
  })
);

export const getTransactionMonth = (date) => {
  const normalized = normalizeTransactionDate(date);
  const match = normalized.match(/^(\d{4}\/\d{2})\/\d{2}$/);
  return match?.[1] || null;
};
