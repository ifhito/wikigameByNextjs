This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Wiki Game

ウィキペディアの記事をリンクを辿って移動し、目標ページに最初に到達したプレイヤーが勝利するオンラインマルチプレイヤーゲーム。

## 機能

- リアルタイムマルチプレイヤー対戦
- ランダムな出発点と目標ページ
- ターン制のゲームプレイ
- レスポンシブデザイン（スマートフォン対応）

## 技術スタック

- Next.js 15
- Socket.IO
- TypeScript
- Tailwind CSS

## アーキテクチャ

このアプリケーションは、Next.jsとSocket.IOを統合したカスタムサーバーを使用しています。これにより、WebSocketとHTTPリクエストの両方を同じポート上で効率的に処理できます。

- `server.js` - カスタムNode.jsサーバー（Next.jsとSocket.IOのハンドラーを組み合わせた設定）
- `app/socket.js` - クライアント側のSocket.IOインスタンス
- `app/contexts/SocketContext.tsx` - Reactコンテキストを使用したSocket.IO機能のラッピング

## 環境変数の設定

以下の環境変数を設定することができます：

```env
# Wikipedia API設定（以下はデフォルト値）
WIKIPEDIA_BASE_URL=https://ja.wikipedia.org
WIKIPEDIA_API_PATH=/w/api.php
WIKIPEDIA_REST_API_PATH=/api/rest_v1/page/summary
WIKIPEDIA_RANDOM_PATH=/wiki/Special:Random

# Socket.IO設定
# 開発環境用
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"

# 本番環境用
NEXT_PUBLIC_SOCKET_URL="/"
```

開発環境では `.env.local` ファイル、本番環境では `.env.production` ファイルに設定してください。

## インストールと実行

1. リポジトリをクローン
```bash
git clone [リポジトリURL]
```

2. 依存関係をインストール
```bash
npm install
```

3. 開発サーバーを起動
```bash
npm run dev
```

4. ブラウザで以下のURLにアクセス
```
http://localhost:3000
```

## デプロイ

Vercel、Railway、Renderなどのプラットフォームにデプロイできます。WebSocketをサポートするプラットフォームを選択してください。

### カスタムNode.jsサーバーの注意点

このプロジェクトは標準のNext.jsデプロイと異なり、カスタムサーバー(`server.js`)を使用しています。そのため、デプロイ先のプラットフォームでは以下の点を考慮する必要があります：

1. スタートコマンドが `npm start` であること（内部的には `node server.js` を実行）
2. WebSocketをサポートしていること

### Renderでデプロイする方法

1. Renderアカウントを作成し、ダッシュボードにログイン
2. 「New Web Service」をクリック
3. GitHubリポジトリを連携
4. 以下の設定を行う:
   - **Name**: 任意のサービス名
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. 「Advanced」を開いて環境変数を設定:
   - `WIKIPEDIA_BASE_URL`
   - `WIKIPEDIA_API_PATH`
   - `WIKIPEDIA_REST_API_PATH`
   - `WIKIPEDIA_RANDOM_PATH`
   - `NODE_ENV` = `production`
6. 「Create Web Service」をクリックしてデプロイを開始

Renderは自動的に適切なポートを使用するので、`PORT`環境変数を手動で設定する必要はありません。

## トラブルシューティング

### WebSocket接続エラー

WebSocketが接続できない場合は、以下を確認してください：

1. サーバーが起動していること（`npm run dev`）
2. ブラウザのコンソールでエラーメッセージを確認
3. ファイアウォールがWebSocket接続をブロックしていないこと

## 遊び方

1. ゲームを開始するには、部屋を作成するか、既存の部屋に参加します
2. 部屋IDを友達と共有して一緒に遊びましょう
3. プレイヤーが2人以上になったら、部屋の作成者がゲームを開始できます
4. 出発点から始まり、リンクをクリックして次の記事に移動します
5. 自分のゴールページに最初に到達したプレイヤーが勝者となります
