# コンポーネント詳細

## 概要
アプリケーションの主要なコンポーネントとその実装詳細について説明します。

## ゲームコンポーネント

### 1. GameRoom (`app/components/GameRoom.tsx`)
- 機能
  - ゲームボードの表示
  - プレイヤー間のインタラクション
  - ゲーム状態の表示
  - リアルタイム更新

- プロパティ
  ```typescript
  interface GameRoomProps {
    roomId: string;
    playerId: string;
    gameMode: 'competitive' | 'cooperative';
  }
  ```

- 状態管理
  - 現在のページ
  - プレイヤー情報
  - ゲーム状態
  - ターン情報

### 2. PlayerList (`app/components/PlayerList.tsx`)
- 機能
  - プレイヤー一覧の表示
  - 準備状態の管理
  - ゴールページの表示
  - 勝利状態の表示

- プロパティ
  ```typescript
  interface PlayerListProps {
    players: Player[];
    currentPlayerId: string;
    gameMode: 'competitive' | 'cooperative';
  }
  ```

- 状態管理
  - プレイヤー情報
  - 現在のプレイヤー
  - 準備状態

### 3. WikipediaPage (`app/components/WikipediaPage.tsx`)
- 機能
  - ページ内容のレンダリング
  - リンクの抽出と表示
  - クリック制御
  - スタイリング

- プロパティ
  ```typescript
  interface WikipediaPageProps {
    content: string;
    isClickable: boolean;
    onLinkClick: (link: string) => void;
  }
  ```

- 状態管理
  - ページ内容
  - クリック可能状態
  - リンク情報

### 4. WikiSoloPage (`app/components/WikiSoloPage.tsx`)
- 機能
  - 一人用ゲームの実装
  - ターン制限の管理
  - 勝敗判定
  - 履歴表示

- プロパティ
  ```typescript
  interface WikiSoloPageProps {
    maxTurns: number;
    onGameEnd: (result: 'win' | 'lose') => void;
  }
  ```

- 状態管理
  - ターン数
  - 移動履歴
  - ゲーム状態

### 5. Spinner (`app/components/Spinner.tsx`)
- 機能
  - ローディングアニメーション
  - 状態表示
  - スタイリング

- プロパティ
  ```typescript
  interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
  }
  ```

## 共通コンポーネント

### 1. Button
- 機能
  - クリックハンドラ
  - スタイリング
  - 状態管理

### 2. Input
- 機能
  - テキスト入力
  - バリデーション
  - エラー表示

## スタイリング
- Tailwind CSSクラス
- レスポンシブデザイン
- アニメーション
- テーマ対応

## パフォーマンス最適化
- メモ化
- 遅延ローディング
- バンドルサイズ最適化
- レンダリング最適化 