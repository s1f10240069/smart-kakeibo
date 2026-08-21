import { DRIVE_FILE_NAME } from './googleConfig';

export class DriveApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

// Google API は JSON 以外（プロキシ等の HTML）を返すこともあるため、
// レスポンス本文をそのまま画面へ出さず、安全な日本語メッセージへ変換する。
export const createDriveResponseError = (res, action) => {
  if (res.status === 401) {
    return new DriveApiError('ログインの有効期限が切れました。Googleに再ログインしてください。', res.status);
  }
  if (res.status === 403) {
    return new DriveApiError('Google Driveへのアクセスが許可されていません。Googleに再ログインしてください。', res.status);
  }

  return new DriveApiError(`${action}に失敗しました。しばらく待って再試行してください (${res.status})`, res.status);
};

// appDataFolder 内の同期ファイルを検索して返す（純粋な fetch）
export const getSyncFile = async (token) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${DRIVE_FILE_NAME}'`)}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw createDriveResponseError(res, 'クラウドデータの確認');
  const data = await res.json();
  return data.files?.[0] || null;
};
