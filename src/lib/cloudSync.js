import { normalizeTransactionDate, normalizeTransactions } from './dates';

export const LAST_SYNCED_CLOUD_MODIFIED_KEY = 'kakeibo_last_synced_cloud_modified';

const transactionKey = (transaction) => {
  if (transaction.gmailMsgId) return `gmail:${transaction.gmailMsgId}`;
  if (transaction.id) return `id:${transaction.id}`;
  return `legacy:${normalizeTransactionDate(transaction.date)}|${transaction.desc}|${transaction.amount}`;
};

const mergeByKey = (olderItems, newerItems, getKey) => {
  const merged = new Map();
  olderItems.forEach(item => merged.set(getKey(item), item));
  newerItems.forEach(item => merged.set(getKey(item), item));
  return Array.from(merged.values());
};

// 端末とクラウドの両方が更新されていた場合も、片方にしかない明細を失わないように統合する。
// 同じ明細・ルールが両方にある場合は、全体の更新時刻が新しい側を採用する。
export const mergeCloudData = (localData, cloudData, preferLocal) => {
  const older = preferLocal ? cloudData : localData;
  const newer = preferLocal ? localData : cloudData;
  const transactions = normalizeTransactions(mergeByKey(
    older.transactions || [],
    newer.transactions || [],
    transactionKey,
  ));
  const transactionMessageIds = new Set(
    transactions.filter(item => item.gmailMsgId).map(item => item.gmailMsgId),
  );
  const needsReview = mergeByKey(
    older.needsReview || [],
    newer.needsReview || [],
    item => item.id,
  ).filter(item => !transactionMessageIds.has(item.id));

  return {
    version: 2,
    transactions,
    rules: { ...(older.rules || {}), ...(newer.rules || {}) },
    needsReview,
    settings: {
      ...(older.settings || {}),
      ...(newer.settings || {}),
      gmail: {
        ...(older.settings?.gmail || {}),
        ...(newer.settings?.gmail || {}),
      },
    },
    timestamp: new Date().toISOString(),
  };
};
