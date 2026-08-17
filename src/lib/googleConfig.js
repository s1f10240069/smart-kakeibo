// Google OAuth / Drive 連携の設定値（client_secret は一切使用しない）
// クライアントIDは非機密情報のためソースへの直書きで問題ない。
export const GOOGLE_CLIENT_ID = '709403348848-p3cmbc9g5l1kr4c8u7voorvolt5tcft3.apps.googleusercontent.com';
export const GOOGLE_SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');
export const DRIVE_FILE_NAME = 'smart-kakeibo.json';
