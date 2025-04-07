# テスト構成

## 概要
アプリケーションのテスト戦略と実装について説明します。

## テスト環境

### 1. 設定ファイル
- `jest.config.js`: Jestの設定
- `jest.setup.js`: テスト環境のセットアップ
- `tsconfig.json`: TypeScriptのテスト設定

### 2. テストディレクトリ構造
```
__tests__/
├── components/
│   ├── GameRoom.test.tsx
│   ├── PlayerList.test.tsx
│   └── WikipediaPage.test.tsx
├── utils/
│   └── goal-detector.test.ts
└── __mocks__/
    └── wikipedia-api.ts
```

## コンポーネントテスト

### 1. GameRoom テスト
```typescript
describe('GameRoom', () => {
  it('should render game board', () => {
    // テスト実装
  });

  it('should handle player interactions', () => {
    // テスト実装
  });

  it('should update game state', () => {
    // テスト実装
  });
});
```

### 2. PlayerList テスト
```typescript
describe('PlayerList', () => {
  it('should display player information', () => {
    // テスト実装
  });

  it('should show ready status', () => {
    // テスト実装
  });

  it('should highlight current player', () => {
    // テスト実装
  });
});
```

## ユーティリティテスト

### 1. ゴール判定テスト
```typescript
describe('GoalDetector', () => {
  it('should normalize page titles', () => {
    // テスト実装
  });

  it('should detect goal reached', () => {
    // テスト実装
  });

  it('should handle redirects', () => {
    // テスト実装
  });
});
```

## モック

### 1. Wikipedia API モック
```typescript
jest.mock('../utils/wikipedia-api', () => ({
  getRandomPage: jest.fn(),
  getPageContent: jest.fn(),
  extractLinks: jest.fn(),
}));
```

### 2. WebSocket モック
```typescript
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
```

## テストヘルパー

### 1. テストデータ生成
```typescript
const createTestPlayer = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Player',
  goalPage: 'Test Page',
  isReady: false,
  isWinner: false,
  ...overrides,
});
```

### 2. テストユーティリティ
```typescript
const renderWithProviders = (component, options = {}) => {
  // テスト用のプロバイダーでラップ
};
```

## カバレッジ

### 1. カバレッジ設定
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 2. カバレッジレポート
- HTMLレポート
- コンソール出力
- CI/CD統合

## 継続的インテグレーション

### 1. テスト自動化
- プッシュ時のテスト実行
- プルリクエスト時のテスト実行
- 定期的なテスト実行

### 2. テスト結果の通知
- Slack通知
- メール通知
- ダッシュボード表示

## パフォーマンステスト

### 1. レンダリングテスト
- コンポーネントのレンダリング速度
- メモリ使用量
- CPU使用率

### 2. ネットワークテスト
- APIレスポンス時間
- WebSocket接続の安定性
- データ転送速度 