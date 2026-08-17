import { DRIVE_FILE_NAME } from './googleConfig';

// appDataFolder 内の同期ファイルを検索して返す（純粋な fetch）
export const getSyncFile = async (token) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${DRIVE_FILE_NAME}'`)}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 401) throw new Error('トークンが無効です。再ログインしてください。');
  if (!res.ok) throw new Error(`Drive APIエラー (${res.status})`);
  const data = await res.json();
  return data.files?.[0] || null;
};
