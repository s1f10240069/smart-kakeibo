// Gmail APIを使ったクレジットカード利用速報メールの検索・解析

const LIST_URL = 'https://www.googleapis.com/gmail/v1/users/me/messages';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 500;

const b64urlDecode = (data) => {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

const stripHtml = (html) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&yen;/g, '¥')
      .replace(/&amp;/g, '&');

export const extractBodyText = (message) => {
  let plain = null, html = null;
  const walk = (part) => {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data && !plain) plain = b64urlDecode(part.body.data);
    if (part.mimeType === 'text/html' && part.body?.data && !html) html = b64urlDecode(part.body.data);
    (part.parts || []).forEach(walk);
  };
  walk(message.payload);
  if (!plain && !html && message.payload?.body?.data) plain = b64urlDecode(message.payload.body.data);
  return plain || (html ? stripHtml(html) : '');
};

const getSubject = (message) =>
  message.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || '(件名なし)';

// 設定画面でユーザーがキーワードを追加・削除できるようにするためのデフォルト値
export const DEFAULT_PARSE_LABELS = {
  amount: ['ご利用金額', '利用金額', 'お支払金額', 'お支払い金額', '決済金額', 'ご請求金額', '引落金額'],
  date: ['ご利用日時', 'ご利用日', '利用日時', '利用日', '決済日', 'お取引日'],
  merchant: ['ご利用先名称', 'ご利用先', '利用先', '加盟店名', '加盟店', 'ご利用店舗', '利用加盟店'],
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (labels, valuePattern) => {
  if (!labels?.length) return null;
  return new RegExp(`(?:${labels.map(escapeRegExp).join('|')})${valuePattern}`);
};

export const parseUsageEmail = (text, labels = DEFAULT_PARSE_LABELS) => {
  // 金額は「1,130円」のような円表記だけでなく「1,130.00」のような小数・円マークなし表記にも対応
  const amountRe = buildRegex(labels.amount, '[^\\d]{0,10}([\\d,]+(?:\\.\\d{1,2})?)\\s*円?');
  const dateRe = buildRegex(labels.date, '[^\\d]{0,10}(\\d{4})[/\\-年](\\d{1,2})[/\\-月](\\d{1,2})');
  const merchantRe = buildRegex(labels.merchant, '[\\s:：]*([^\\n\\r]+)');
  if (!amountRe || !dateRe) return null;

  const amountMatch = text.match(amountRe);
  const dateMatch = text.match(dateRe);
  if (!amountMatch || !dateMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (!amount) return null;

  const [, y, m, d] = dateMatch;
  const date = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;

  const merchantMatch = merchantRe ? text.match(merchantRe) : null;
  const desc = merchantMatch ? merchantMatch[1].trim().slice(0, 60) : null;

  return { date, amount, desc };
};

// レスポンスが失敗の場合、原因が分かるようエラーを投げる（黙って握りつぶさない）
const fetchJson = async (url, accessToken) => {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.error?.message || res.statusText;
    throw new Error(`Gmail APIエラー (${res.status}): ${detail}`);
  }
  return res.json();
};

// 送信元フィルタ + 日付以降のメールIDを全ページ分取得
export const listUsageMessageIds = async (accessToken, senders, sinceUnixTs) => {
  if (!senders.length) return [];
  const fromQuery = senders.map(s => `from:${s}`).join(' OR ');
  const q = `(${fromQuery}) after:${sinceUnixTs}`;
  const ids = [];
  let pageToken = '';
  do {
    const url = `${LIST_URL}?q=${encodeURIComponent(q)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await fetchJson(url, accessToken); // 失敗時はここで例外が投げられ、呼び出し元に伝わる
    (data.messages || []).forEach(m => ids.push(m.id));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return ids;
};

// メッセージ本文を取得して解析。onProgressで進捗を通知。
// 戻り値: { parsed: [{id, date, amount, desc}], needsReview: [{id, subject, bodyText}] }
// 1件ごとの取得失敗は全体を止めず「要確認」に回す（一覧取得の失敗とは扱いを分ける）
// needsReviewにはbodyTextを含めることで、設定画面でラベルを調整しながら再解析できるようにする
export const fetchAndParseMessages = async (accessToken, ids, labels, onProgress) => {
  const parsed = [];
  const needsReview = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id =>
      fetchJson(`${LIST_URL}/${id}?format=full`, accessToken)
        .then(msg => ({ id, msg, error: null }))
        .catch(error => ({ id, msg: null, error }))
    ));
    for (const { id, msg, error } of results) {
      if (!msg) { needsReview.push({ id, subject: `(取得失敗: ${error?.message || '不明なエラー'})`, bodyText: '' }); continue; }
      const text = extractBodyText(msg);
      const result = parseUsageEmail(text, labels);
      if (result) parsed.push({ id, ...result });
      else needsReview.push({ id, subject: getSubject(msg), bodyText: text.slice(0, 4000) });
    }
    onProgress?.(Math.min(i + BATCH_SIZE, ids.length), ids.length);
    if (i + BATCH_SIZE < ids.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
  return { parsed, needsReview };
};
