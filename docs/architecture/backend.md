# バックエンド構成

## 概要
バックエンドはNode.jsとWebSocketを使用して実装されており、以下の主要な機能を提供します：

## WebSocketサーバー (`server.js`)

### 1. 部屋管理
- 機能
  - 部屋の作成
  - 部屋への参加
  - 部屋の削除
  - 部屋状態の管理

- データ構造
  ```typescript
  interface Room {
    id: string;
    creator: string;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    currentPage: string;
    startingPage: string;
    currentPlayerIndex: number;
    gameMode: 'competitive' | 'cooperative';
    commonGoalPage?: string;
    commonGoalDescription?: string;
    totalTurnsLeft: number;
    maxTotalTurns: number;
  }
  ```

### 2. プレイヤー管理
- 機能
  - プレイヤーの追加
  - プレイヤーの削除
  - プレイヤー状態の更新
  - 準備状態の管理

- データ構造
  ```typescript
  interface Player {
    id: string;
    name: string;
    goalPage: string;
    goalDescription?: string;
    isReady: boolean;
    isWinner: boolean;
    consecutiveTurnsLeft: number;
  }
  ```

### 3. ゲーム状態管理
- 機能
  - ゲームの開始
  - ターンの進行
  - 勝敗判定
  - 状態の同期

- イベント
  - `game:start`: ゲーム開始
  - `game:turn`: ターン進行
  - `game:move`: プレイヤーの移動
  - `game:end`: ゲーム終了

### 4. Wikipedia API連携
- 機能
  - ランダムページの取得
  - ページ内容の取得
  - リンク情報の取得
  - ページタイトルの正規化

- APIエンドポイント
  - `https://ja.wikipedia.org/api/rest_v1/page/random/summary`
  - `https://ja.wikipedia.org/api/rest_v1/page/html/{title}`

## エラーハンドリング
- 接続エラー
- 部屋作成エラー
- 参加エラー
- APIエラー

## セキュリティ
- 入力値のバリデーション
- 部屋IDの生成
- プレイヤー認証
- レート制限

## パフォーマンス最適化
- 接続プーリング
- メッセージの圧縮
- キャッシュの活用
- 非同期処理 