import { describe, it, expect, beforeEach } from '@jest/globals';

// モック用のインポート
interface Player {
  id: string;
  name: string;
  goalPage: string;
  isReady: boolean;
  isWinner: boolean;
}

interface Room {
  id: string;
  creator: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPage: string;
  startingPage: string;
  currentPlayerIndex: number;
}

// テスト用のモックデータ
const createMockRoom = (): Room => ({
  id: 'test-room',
  creator: 'player1',
  players: [
    {
      id: 'player1',
      name: 'テスト1',
      goalPage: 'サッカー',
      isReady: true,
      isWinner: false,
    },
  ],
  status: 'waiting',
  currentPage: '',
  startingPage: '',
  currentPlayerIndex: 0,
});

describe('プレイヤー人数制限のテスト', () => {
  let mockRoom: Room;
  
  // テスト用の関数
  const MAX_PLAYERS = 4;
  
  const joinRoom = (room: Room, socketId: string, playerName: string) => {
    // 部屋がすでにプレイ中であれば参加できない
    if (room.status !== 'waiting') {
      return { success: false, message: 'ゲームはすでに開始されています' };
    }
    
    // プレイヤー数が上限に達していれば参加できない
    if (room.players.length >= MAX_PLAYERS) {
      return { success: false, message: 'プレイヤーの人数が上限に達しています' };
    }
    
    // プレイヤーを追加
    const player: Player = {
      id: socketId,
      name: playerName,
      goalPage: 'テスト用ゴール',
      isReady: true,
      isWinner: false,
    };
    
    room.players.push(player);
    return { success: true, player };
  };
  
  const startGame = (room: Room, socketId: string) => {
    // 部屋の作成者でなければゲームを開始できない
    if (room.creator !== socketId) {
      return { success: false, message: '部屋の作成者のみがゲームを開始できます' };
    }
    
    // プレイヤーが2人未満であれば開始できない
    if (room.players.length < 2) {
      return { success: false, message: 'ゲームを開始するには2人以上のプレイヤーが必要です' };
    }
    
    // ゲームを開始
    room.status = 'playing';
    room.currentPage = 'テスト開始ページ';
    room.startingPage = 'テスト開始ページ';
    return { success: true };
  };
  
  beforeEach(() => {
    mockRoom = createMockRoom();
  });
  
  it('最大4人まで部屋に参加できる', () => {
    // 追加の3人を参加させる（すでにcreator=player1がいる）
    const result2 = joinRoom(mockRoom, 'player2', 'テスト2');
    const result3 = joinRoom(mockRoom, 'player3', 'テスト3');
    const result4 = joinRoom(mockRoom, 'player4', 'テスト4');
    
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);
    expect(result4.success).toBe(true);
    expect(mockRoom.players.length).toBe(4);
  });
  
  it('5人目は参加できない', () => {
    // 最大人数まで部屋を埋める
    joinRoom(mockRoom, 'player2', 'テスト2');
    joinRoom(mockRoom, 'player3', 'テスト3');
    joinRoom(mockRoom, 'player4', 'テスト4');
    
    // 5人目を追加しようとする
    const result5 = joinRoom(mockRoom, 'player5', 'テスト5');
    
    expect(result5.success).toBe(false);
    expect(result5.message).toBe('プレイヤーの人数が上限に達しています');
    expect(mockRoom.players.length).toBe(4);
  });
  
  it('プレイヤーが1人のときはゲームを開始できない', () => {
    // プレイヤーが作成者1人だけの状態
    const result = startGame(mockRoom, 'player1');
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('ゲームを開始するには2人以上のプレイヤーが必要です');
    expect(mockRoom.status).toBe('waiting');
  });
  
  it('プレイヤーが2人以上のときはゲームを開始できる', () => {
    // 2人目のプレイヤーを追加
    joinRoom(mockRoom, 'player2', 'テスト2');
    
    // ゲーム開始
    const result = startGame(mockRoom, 'player1');
    
    expect(result.success).toBe(true);
    expect(mockRoom.status).toBe('playing');
  });
}); 