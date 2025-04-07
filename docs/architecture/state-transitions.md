# 状態遷移とWebSocket通信

## プレイヤーの状態遷移

### 1. 初期状態
```typescript
interface InitialPlayerState {
  id: string;          // プレイヤーID
  name: string;        // プレイヤー名
  isConnected: false;  // 接続状態
  isReady: false;      // 準備状態
  isWinner: false;     // 勝利状態
  currentPage: null;   // 現在のページ
  goalPage: null;      // ゴールページ
  moves: [];           // 移動履歴
}
```

### 2. 接続状態
```typescript
interface ConnectedPlayerState {
  isConnected: true;   // WebSocket接続確立
  roomId: string;      // 部屋ID
  socketId: string;    // WebSocket ID
  connectionTime: Date; // 接続時刻
}
```

### 3. 準備状態
```typescript
interface ReadyPlayerState {
  isReady: true;       // 準備完了
  goalPage: string;    // ゴールページ設定
  gameMode: 'competitive' | 'cooperative'; // ゲームモード
}
```

### 4. ゲーム進行状態
```typescript
interface PlayingPlayerState {
  currentPage: string; // 現在のページ
  moves: Move[];      // 移動履歴
  isMyTurn: boolean;  // 自分のターンか
  turnsLeft: number;  // 残りターン数
}
```

### 5. 終了状態
```typescript
interface FinishedPlayerState {
  isWinner: boolean;  // 勝利状態
  finalPage: string;  // 最終ページ
  totalMoves: number; // 総移動数
  gameTime: number;   // プレイ時間
}
```

## WebSocket通信の詳細

### 1. 接続確立
```typescript
// クライアント側
const socket = io(WS_URL);

// サーバー側
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
});
```

### 2. イベント一覧

#### 部屋関連
```typescript
// 部屋作成
socket.emit('room:create', {
  playerName: string,
  gameMode: 'competitive' | 'cooperative'
});

// 部屋参加
socket.emit('room:join', {
  roomId: string,
  playerName: string
});

// 部屋退出
socket.emit('room:leave', {
  roomId: string
});
```

#### ゲーム進行
```typescript
// 準備完了
socket.emit('game:ready', {
  roomId: string,
  isReady: boolean
});

// 移動
socket.emit('game:move', {
  roomId: string,
  toPage: string
});

// ターン終了
socket.emit('game:endTurn', {
  roomId: string
});
```

#### 状態同期
```typescript
// ゲーム状態の更新
socket.on('game:state', (state: GameState) => {
  // 状態更新処理
});

// プレイヤー状態の更新
socket.on('player:state', (player: Player) => {
  // プレイヤー状態更新処理
});
```

### 3. エラーハンドリング
```typescript
// 接続エラー
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// 再接続
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

// 切断
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### 4. 状態管理の流れ

1. **接続確立**
   - クライアントがWebSocketサーバーに接続
   - サーバーが接続を確認し、初期状態を送信

2. **部屋参加**
   - クライアントが部屋作成/参加リクエストを送信
   - サーバーが部屋状態を更新し、全員に通知

3. **準備状態**
   - プレイヤーが準備完了を通知
   - 全員の準備が完了したらゲーム開始

4. **ゲーム進行**
   - ターン制御
   - 移動の検証
   - 状態の同期
   - ゴール判定

5. **ゲーム終了**
   - 勝敗判定
   - 結果の通知
   - 部屋の状態更新

### 5. データ同期の仕組み

```typescript
// サーバー側の状態管理
class GameStateManager {
  private rooms: Map<string, Room>;
  
  // 状態の更新と同期
  updateState(roomId: string, newState: Partial<Room>) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 状態の更新
    Object.assign(room, newState);
    
    // 全プレイヤーに通知
    this.broadcastState(roomId);
  }
  
  // 状態のブロードキャスト
  broadcastState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.players.forEach(player => {
      const socket = this.getSocket(player.id);
      if (socket) {
        socket.emit('game:state', room);
      }
    });
  }
}
```

### 6. パフォーマンス最適化

1. **メッセージの圧縮**
   - 差分のみの送信
   - データの圧縮

2. **接続管理**
   - 接続プーリング
   - 再接続の自動化

3. **状態のキャッシュ**
   - クライアント側のキャッシュ
   - サーバー側のキャッシュ

4. **エラーリカバリー**
   - 自動再接続
   - 状態の復元
   - 整合性チェック 