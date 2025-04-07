# ユーティリティ機能

## 概要
アプリケーションで使用されるユーティリティ機能とその実装詳細について説明します。

## ゴール判定 (`app/utils/goal-detector.ts`)

### 1. 機能
- ページタイトルの正規化
- ゴール条件の判定
- マッチング処理
- リダイレクトの処理

### 2. 実装詳細
```typescript
interface GoalDetector {
  normalizeTitle(title: string): string;
  isGoalReached(currentPage: string, goalPage: string): boolean;
  handleRedirect(page: string): Promise<string>;
}
```

### 3. 使用例
```typescript
const detector = new GoalDetector();
const normalizedTitle = detector.normalizeTitle('Wikipedia:メインページ');
const isGoal = detector.isGoalReached(currentPage, goalPage);
```

## Wikipedia API ユーティリティ

### 1. 機能
- ランダムページの取得
- ページ内容の取得
- リンク情報の抽出
- エラーハンドリング

### 2. 実装詳細
```typescript
interface WikipediaAPI {
  getRandomPage(): Promise<Page>;
  getPageContent(title: string): Promise<string>;
  extractLinks(html: string): string[];
  handleApiError(error: Error): void;
}
```

## 文字列処理

### 1. 機能
- タイトルの正規化
- 特殊文字の処理
- エンコーディング処理
- 文字列比較

### 2. 実装詳細
```typescript
interface StringUtils {
  normalizeTitle(title: string): string;
  encodeTitle(title: string): string;
  decodeTitle(encoded: string): string;
  compareTitles(title1: string, title2: string): boolean;
}
```

## 日付・時間処理

### 1. 機能
- タイムスタンプの生成
- 時間のフォーマット
- 時間差の計算
- タイムアウト処理

### 2. 実装詳細
```typescript
interface TimeUtils {
  generateTimestamp(): string;
  formatTime(date: Date): string;
  calculateTimeDifference(start: Date, end: Date): number;
  createTimeout(ms: number): Promise<void>;
}
```

## エラーハンドリング

### 1. 機能
- エラーの分類
- エラーメッセージの生成
- ログ記録
- エラー通知

### 2. 実装詳細
```typescript
interface ErrorHandler {
  classifyError(error: Error): ErrorType;
  generateErrorMessage(error: Error): string;
  logError(error: Error): void;
  notifyError(error: Error): void;
}
```

## キャッシュ管理

### 1. 機能
- キャッシュの保存
- キャッシュの取得
- キャッシュの削除
- キャッシュの有効期限管理

### 2. 実装詳細
```typescript
interface CacheManager {
  set(key: string, value: any, ttl?: number): void;
  get(key: string): any;
  delete(key: string): void;
  clear(): void;
}
```

## パフォーマンス最適化
- メモ化
- 遅延ローディング
- バッチ処理
- 並行処理の制御

## テスト
- ユニットテスト
- モックの作成
- テストヘルパー
- テストデータ生成 