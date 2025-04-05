import { describe, it, expect } from '@jest/globals';
import { checkGoal, setWinner, processPageSelection, normalizePageName } from '../goal-detector';

// テスト用の型定義
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

describe('ゴール判定ユーティリティのテスト', () => {
  describe('checkGoal関数', () => {
    it('ゴールページに到達した場合はゴールプレイヤーを返す', () => {
      const room = createMockRoom();
      const result = checkGoal(room, 'サッカー');
      
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer).toBeDefined();
      expect(result.goalPlayer?.id).toBe('player1');
      expect(result.nextPlayerIndex).toBe(1);
    });
    
    it('他のプレイヤーのゴールページに到達した場合もゴールと判定される', () => {
      const room = createMockRoom();
      const result = checkGoal(room, 'IOTV');
      
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer).toBeDefined();
      expect(result.goalPlayer?.id).toBe('player2');
      expect(result.nextPlayerIndex).toBe(1);
    });
    
    it('ゴールページでない場合はゴールと判定されない', () => {
      const room = createMockRoom();
      const result = checkGoal(room, '野球');
      
      expect(result.isGoal).toBe(false);
      expect(result.goalPlayer).toBeNull();
      expect(result.nextPlayerIndex).toBe(1);
    });
  });
  
  describe('setWinner関数', () => {
    it('指定したプレイヤーが勝者に設定される', () => {
      const room = createMockRoom();
      setWinner(room, 'player1');
      
      expect(room.status).toBe('finished');
      expect(room.players[0].isWinner).toBe(true);
      expect(room.players[1].isWinner).toBe(false);
    });
    
    it('他のプレイヤーが勝者に設定される', () => {
      const room = createMockRoom();
      setWinner(room, 'player2');
      
      expect(room.status).toBe('finished');
      expect(room.players[0].isWinner).toBe(false);
      expect(room.players[1].isWinner).toBe(true);
    });
  });
  
  describe('processPageSelection関数', () => {
    it('現在のプレイヤーが自分のゴールページに到達したら勝者になる', () => {
      const room = createMockRoom();
      const result = processPageSelection(room, 'サッカー', 'player1');
      
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer).toBeDefined();
      expect(result.goalPlayer?.id).toBe('player1');
      expect(room.status).toBe('finished');
      expect(room.players[0].isWinner).toBe(true);
      expect(room.players[1].isWinner).toBe(false);
    });
    
    it('現在のプレイヤーが他のプレイヤーのゴールページに到達したら、そのプレイヤーが勝者になる', () => {
      const room = createMockRoom();
      const result = processPageSelection(room, 'IOTV', 'player1');
      
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer).toBeDefined();
      expect(result.goalPlayer?.id).toBe('player2');
      expect(room.status).toBe('finished');
      expect(room.players[0].isWinner).toBe(false);
      expect(room.players[1].isWinner).toBe(true);
    });
    
    it('自分の番でない場合はエラーが返る', () => {
      const room = createMockRoom();
      const result = processPageSelection(room, 'IOTV', 'player2');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('あなたの番ではありません');
      expect(room.status).toBe('playing');
      expect(room.players[0].isWinner).toBe(false);
      expect(room.players[1].isWinner).toBe(false);
    });
    
    it('ゴールでないページへの移動ではターンが次に移る', () => {
      const room = createMockRoom();
      const result = processPageSelection(room, '野球', 'player1');
      
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(false);
      expect(room.currentPage).toBe('野球');
      expect(room.currentPlayerIndex).toBe(1);
      expect(room.status).toBe('playing');
      expect(room.players[0].isWinner).toBe(false);
      expect(room.players[1].isWinner).toBe(false);
    });
    
    it('プレイヤー2の番で自分のゴールページに到達した場合', () => {
      const room = createMockRoom();
      room.currentPlayerIndex = 1;
      const result = processPageSelection(room, 'IOTV', 'player2');
      
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer).toBeDefined();
      expect(result.goalPlayer?.id).toBe('player2');
      expect(room.status).toBe('finished');
      expect(room.players[0].isWinner).toBe(false);
      expect(room.players[1].isWinner).toBe(true);
    });
  });

  describe('normalizePageName関数', () => {
    it('基本的なページ名を正規化する', () => {
      expect(normalizePageName('サッカー')).toBe('サッカー');
      expect(normalizePageName('IOTV')).toBe('iotv');
    });
    
    it('スペースとアンダースコアを削除する', () => {
      expect(normalizePageName('サッカー ボール')).toBe('サッカーボール');
      expect(normalizePageName('サッカー_ボール')).toBe('サッカーボール');
    });
    
    it('括弧を削除する', () => {
      expect(normalizePageName('サッカー（スポーツ）')).toBe('サッカースポーツ');
      expect(normalizePageName('サッカー(スポーツ)')).toBe('サッカースポーツ');
    });
    
    it('全角・半角を統一する', () => {
      expect(normalizePageName('ＩＯＴＶ')).toBe('iotv');
      expect(normalizePageName('サッカー　ボール')).toBe('サッカーボール');
    });
    
    it('同じ基本名で異なる表記のページ名が正規化される', () => {
      // 「サッカー」と「サッカー（スポーツ）」は異なる正規化結果になる点に注意
      const variations1 = [
        'サッカー ボール',
        'サッカー_ボール',
        'サッカー　ボール',
      ];
      
      const normalizedNames1 = variations1.map(name => normalizePageName(name));
      const firstNormalized1 = normalizedNames1[0];
      
      normalizedNames1.forEach(name => {
        expect(name).toBe(firstNormalized1);
      });
      
      const variations2 = [
        'サッカー（スポーツ）',
        'サッカー (スポーツ)',
        'サッカー(スポーツ)',
      ];
      
      const normalizedNames2 = variations2.map(name => normalizePageName(name));
      const firstNormalized2 = normalizedNames2[0];
      
      normalizedNames2.forEach(name => {
        expect(name).toBe(firstNormalized2);
      });
    });
  });

  describe('ゲーム再起動時のゴール維持テスト', () => {
    it('ゲーム再起動後もゴールページが同じであれば到達判定ができる', () => {
      const room = createMockRoom();
      // 一度ゲームを終了状態にする
      room.status = 'finished';
      room.players[0].isWinner = true;
      
      // ゲームを再起動する状況をシミュレート
      room.status = 'playing';
      room.players[0].isWinner = false;
      room.currentPlayerIndex = 0;
      
      // 再起動後もゴールページは維持されるはず
      const result = processPageSelection(room, 'サッカー', 'player1');
      
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(true);
      expect(result.goalPlayer?.id).toBe('player1');
      expect(room.status).toBe('finished');
    });
    
    it('ゲーム再起動後に正規化されたゴールページに到達すると判定できる', () => {
      const room = createMockRoom();
      
      // ゲームを再起動する状況をシミュレート
      room.status = 'playing';
      room.players[0].isWinner = false;
      room.currentPlayerIndex = 0;
      
      // 空白入りのページ名を使用
      const result = processPageSelection(room, 'サッカー ボール', 'player1');
      
      // サッカー と サッカー ボール は異なるため、ゴールにならない
      expect(result.success).toBe(true);
      expect(result.isGoal).toBe(false);
      
      // ゴールページを空白入りに変更して再テスト
      room.players[0].goalPage = 'サッカー ボール';
      room.currentPlayerIndex = 0;
      
      // 今度は同じページなのでゴールになる
      const result2 = processPageSelection(room, 'サッカー_ボール', 'player1');
      
      expect(result2.success).toBe(true);
      expect(result2.isGoal).toBe(true);
      expect(result2.goalPlayer?.id).toBe('player1');
      expect(room.status).toBe('finished');
    });
  });
}); 