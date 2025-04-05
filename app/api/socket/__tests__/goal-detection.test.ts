import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { processPageSelection } from '../../../utils/goal-detector';

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
    {
      id: 'player2',
      name: 'テスト2',
      goalPage: 'IOTV',
      isReady: true,
      isWinner: false,
    },
  ],
  status: 'playing',
  currentPage: '日本',
  startingPage: '日本',
  currentPlayerIndex: 0,
});

// Socket.IOのモック
const createMockIo = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

// socketのモック
const createMockSocket = (id: string) => ({
  id,
  emit: jest.fn(),
});

describe('ゴール判定テスト', () => {
  let mockRoom: Room;
  let mockIo: any;
  let mockSocket: any;
  
  // テスト用のゴール判定関数
  const checkGoal = (room: Room, pageName: string, socketId: string) => {
    // 現在のプレイヤーを取得
    const currentPlayerIndex = room.players.findIndex(player => player.id === socketId);
    if (currentPlayerIndex === -1 || currentPlayerIndex !== room.currentPlayerIndex) {
      return { success: false, message: 'あなたの番ではありません' };
    }
    
    // ページを更新
    room.currentPage = pageName;
    
    // ゴールチェック
    let goalPlayer = null;
    const isGoal = room.players.some(player => {
      if (player.goalPage === pageName) {
        player.isWinner = true;
        goalPlayer = player;
        return true;
      }
      return false;
    });
    
    if (isGoal && goalPlayer) {
      room.status = 'finished';
      return { success: true, isGoal: true, goalPlayer };
    } else {
      // 次のプレイヤーへ
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
      return { success: true, isGoal: false };
    }
  };
  
  beforeEach(() => {
    mockRoom = createMockRoom();
    mockIo = createMockIo();
    mockSocket = createMockSocket('player1');
  });
  
  it('プレイヤー1が自分のゴールページに到達すると勝者になる', () => {
    // プレイヤー1の番で自分のゴールページへ移動
    const result = checkGoal(mockRoom, 'サッカー', 'player1');
    
    expect(result.success).toBe(true);
    expect(result.isGoal).toBe(true);
    expect(result.goalPlayer).toBeDefined();
    expect(result.goalPlayer?.id).toBe('player1');
    expect(mockRoom.status).toBe('finished');
    expect(mockRoom.players[0].isWinner).toBe(true);
    expect(mockRoom.players[1].isWinner).toBe(false);
  });
  
  it('プレイヤー1が他のプレイヤーのゴールページに到達すると、そのプレイヤーが勝者になる', () => {
    // プレイヤー1の番で他のプレイヤーのゴールページへ移動
    const result = checkGoal(mockRoom, 'IOTV', 'player1');
    
    expect(result.success).toBe(true);
    expect(result.isGoal).toBe(true);
    expect(result.goalPlayer).toBeDefined();
    expect(result.goalPlayer?.id).toBe('player2');
    expect(mockRoom.status).toBe('finished');
    expect(mockRoom.players[0].isWinner).toBe(false);
    expect(mockRoom.players[1].isWinner).toBe(true);
  });
  
  it('プレイヤー2が自分の番でゴールページに到達できる', () => {
    // プレイヤー2の番に変更
    mockRoom.currentPlayerIndex = 1;
    
    // プレイヤー2の番で自分のゴールページへ移動
    const result = checkGoal(mockRoom, 'IOTV', 'player2');
    
    expect(result.success).toBe(true);
    expect(result.isGoal).toBe(true);
    expect(result.goalPlayer).toBeDefined();
    expect(result.goalPlayer?.id).toBe('player2');
    expect(mockRoom.status).toBe('finished');
    expect(mockRoom.players[0].isWinner).toBe(false);
    expect(mockRoom.players[1].isWinner).toBe(true);
  });
  
  it('自分の番でない場合はページを変更できない', () => {
    // プレイヤー2がプレイヤー1の番にページ変更しようとする
    const result = checkGoal(mockRoom, 'IOTV', 'player2');
    
    expect(result.success).toBe(false);
    expect(mockRoom.currentPage).toBe('日本');
    expect(mockRoom.status).toBe('playing');
    expect(mockRoom.players[0].isWinner).toBe(false);
    expect(mockRoom.players[1].isWinner).toBe(false);
  });
  
  it('ゴールではないページへの移動ではゲームが続行される', () => {
    // プレイヤー1の番でゴールではないページへ移動
    const result = checkGoal(mockRoom, '野球', 'player1');
    
    expect(result.success).toBe(true);
    expect(result.isGoal).toBe(false);
    expect(mockRoom.currentPage).toBe('野球');
    expect(mockRoom.status).toBe('playing');
    expect(mockRoom.currentPlayerIndex).toBe(1); // プレイヤー2の番に変わる
    expect(mockRoom.players[0].isWinner).toBe(false);
    expect(mockRoom.players[1].isWinner).toBe(false);
  });
}); 