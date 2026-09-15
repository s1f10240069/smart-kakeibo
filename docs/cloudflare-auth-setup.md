# Cloudflare Workers版 Google認証セットアップ

この手順では、従来のGitHub Pages版を残したまま、Cloudflare Workers + Static Assets版を別URLで公開します。ログに `Executing user deploy command: npx wrangler versions upload` と出る構成を対象にしています。

## 0. 戻し方を確認する

実装前の状態は `backup/before-server-auth-20260915` ブランチに保存されています。Cloudflare版を試している間も、従来のGitHub Pages版には影響しません。

```bash
git switch backup/before-server-auth-20260915
```

## 1. Google CloudでAPIを有効にする

1. Google Cloud Consoleを開く。
2. 現在の家計簿用プロジェクトを選択する。完全に分離したい場合は検証用プロジェクトを新規作成する。
3. 「APIとサービス」→「ライブラリ」を開く。
4. `Google Drive API` を有効にする。
5. `Gmail API` を有効にする。

## 2. Google OAuth同意画面を設定する

Google Auth Platformで次を設定します。

1. Brandingにアプリ名、サポートメール、連絡先を入力する。
2. Audienceは、個人のGoogleアカウントで使う場合は `External` を選ぶ。
3. 開発中は自分のGoogleアカウントをTest usersへ追加する。
4. Data Accessへ次のスコープを追加する。

```text
openid
email
profile
https://www.googleapis.com/auth/drive.appdata
https://www.googleapis.com/auth/gmail.readonly
```

注意: Publishing statusがTestingの間、Externalアプリのリフレッシュトークンは原則7日で期限切れになります。動作確認後、個人利用の範囲で継続利用する場合はIn productionへの変更を検討してください。`gmail.readonly` は制限付きスコープなので、不特定多数へ公開する場合はGoogleの審査が別途必要です。

## 3. Cloudflare Workersプロジェクトを作る

1. Cloudflare Dashboardで「Workers & Pages」を開く。
2. Create applicationからGitHubリポジトリを接続するWorkerを作成する。
3. GitHubアカウントを接続し、このリポジトリを選ぶ。
4. Production branchに `feat/server-side-google-auth` を指定する。検証完了後に `master` へ変更してもよい。
5. Build commandを `npm run build` にする。
6. Deploy commandを `npx wrangler versions upload` にする。Cloudflareが自動入力している場合はそのままでよい。
7. プロジェクト名を `smart-kakeibo` にする。別名を使う場合は `wrangler.jsonc` の `name` も同じ名前へ変更する。
8. Save and Deployを実行する。

最初のデプロイでは認証用Secretsが未設定なので、画面は表示されてもGoogleログインはまだ成功しません。

## 4. Google OAuthクライアントを新規作成する

既存のGitHub Pages用クライアントは、戻せるよう変更せずに残します。

1. 初回デプロイ後に表示される `workers.dev` URLを控える。
2. Google Auth PlatformのClientsを開く。
3. Create clientを選ぶ。
4. Application typeに `Web application` を選ぶ。
5. 名前を `smart-kakeibo-cloudflare` などにする。
6. Authorized JavaScript originsへWorkersのURLを追加する。
7. Authorized redirect URIsへ同じURLのコールバックを追加する。

例:

```text
Authorized JavaScript origin
https://smart-kakeibo.<自分のサブドメイン>.workers.dev

Authorized redirect URI
https://smart-kakeibo.<自分のサブドメイン>.workers.dev/api/auth/google/callback
```

末尾のスラッシュ有無を含め、実際のWorkers URLと完全に一致させてください。作成後に表示されるClient IDとClient secretを控えます。Client secretはGitHubやソースコードへ保存しません。

## 5. Cloudflareへ環境変数とSecretsを登録する

Cloudflare WorkerのSettingsからVariables and Secretsを開き、次を登録します。

| 名前 | 種類 | 値 |
|---|---|---|
| `APP_ORIGIN` | Text | `https://smart-kakeibo.<自分のサブドメイン>.workers.dev` |
| `GOOGLE_CLIENT_ID` | Text | Googleで作成したClient ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Googleで作成したClient secret |
| `SESSION_SECRET` | Secret | 十分に長いランダム文字列 |
| `GOOGLE_ALLOWED_EMAIL` | Text | この家計簿の利用を許可する自分のGoogleメールアドレス |

PowerShellでSESSION_SECRETを生成する例:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

出力された文字列だけをCloudflareのSecretへ登録します。`.dev.vars.example` に実値を上書きしてコミットしないでください。

## 6. 再デプロイする

1. Cloudflare WorkerのDeploymentsを開く。
2. 最新デプロイのRetry deploymentを実行する。または対象ブランチへ新しいコミットをpushする。
3. `workers.dev` のProduction URLを開く。
4. Googleでログインを押す。
5. 初回だけGoogleの同意画面でDriveとGmailへのアクセスを許可する。
6. ログイン後、ページを閉じて開き直しても認証画面が出ないことを確認する。

## 7. 動作確認項目

- 初回ログイン後に家計簿画面が表示される。
- ページ再読み込み後もログイン状態が維持される。
- ブラウザを閉じて開き直してもログイン状態が維持される。
- Driveから既存データを読み込める。
- 明細変更後にDriveへ保存される。
- Gmailの「今すぐメールを確認」が動作する。
- ログアウト後にログイン画面へ戻る。
- ログアウト後の再ログインが正常に完了する。

ブラウザの開発者ツールでLocal Storageを確認し、`kakeibo_google_token` と `kakeibo_google_token_expiry` が残っていないことも確認してください。認証CookieはHttpOnlyのためJavaScriptから読み取れないのが正常です。

## ローカルで認証まで確認する場合（任意）

1. `.dev.vars.example` をコピーして `.dev.vars` を作る。
2. `.dev.vars` にローカル用Client ID、Client secret、SESSION_SECRETを入れる。
3. Google OAuthクライアントへ `http://localhost:8788/api/auth/google/callback` を追加する。
4. ビルド後、Cloudflare WranglerでWorkerとStatic Assetsを起動する。

```bash
npm run build
npx wrangler dev --port 8788
```

`.dev.vars` はGitの除外対象です。

## セキュリティ上の仕様

- リフレッシュトークンはAES-GCMで暗号化してHttpOnly Cookieへ保存する。
- CookieはSameSite=Laxとし、本番HTTPSではSecure属性を付ける。
- OAuthのstate検証とPKCEを使用する。
- `GOOGLE_ALLOWED_EMAIL` と一致するGoogleアカウントだけログインを許可する。
- Googleアクセストークンはブラウザのメモリ内だけで利用し、Local Storageへ保存しない。
- セッションCookieの有効期間は最大365日。Google側で権限が取り消された場合などは、その時点で再ログインが必要になる。
