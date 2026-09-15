# スマート明細

React + Viteで作られた家計簿アプリです。Google Driveへの同期とGmailからの明細取込に対応しています。

## 開発

```bash
npm install
npm run dev
```

## デプロイ

- 従来版: `master` ブランチからGitHub Pagesへ自動デプロイ
- サーバー認証版: Cloudflare Pages + Pages Functions

Cloudflare版の初期設定は [docs/cloudflare-auth-setup.md](docs/cloudflare-auth-setup.md) を参照してください。

## 認証情報の扱い

Googleのクライアントシークレットとセッション暗号鍵は、CloudflareのSecretsにのみ登録します。リポジトリや通常の環境変数ファイルへ実値をコミットしないでください。
