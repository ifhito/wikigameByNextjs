import { Room, Player } from '../contexts/SocketContext';

interface GoalCheckResult {
  isGoal: boolean;
  goalPlayer: Player | null;
  nextPlayerIndex: number;
}

/**
 * ページ名を正規化する関数 - 比較のために特殊文字や空白を処理
 * @param pageName ページ名
 * @returns 正規化されたページ名
 */
export function normalizePageName(pageName: string): string {
  return pageName
    .toLowerCase()
    .replace(/[_\s]/g, '') // アンダースコアと空白を削除
    .replace(/[（(]/g, '') // 左括弧を削除
    .replace(/[）)]/g, '') // 右括弧を削除
    .normalize('NFKC'); // 全角・半角を統一
}

/**
 * ページ選択時のゴール判定を行う関数
 * @param room 現在のルーム情報
 * @param pageName 選択されたページ名
 * @returns ゴール判定結果
 */
export function checkGoal(room: Room, pageName: string): GoalCheckResult {
  // ページ名を正規化
  const normalizedSelectedPage = normalizePageName(pageName);
  
  // ゴールチェック - 誰かのゴールページに到達したかを判定
  let goalPlayer: Player | null = null;
  const isGoal = room.players.some(player => {
    // ゴールページ名も正規化して比較
    const normalizedGoalPage = normalizePageName(player.goalPage);
    
    if (normalizedGoalPage === normalizedSelectedPage) {
      goalPlayer = player;
      console.log(`ゴール一致: 選択="${pageName}"(正規化="${normalizedSelectedPage}"), 目標="${player.goalPage}"(正規化="${normalizedGoalPage}")`);
      return true;
    }
    return false;
  });

  // 次のプレイヤーインデックスを計算 (ゴールでない場合に使用)
  const nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

  return {
    isGoal,
    goalPlayer,
    nextPlayerIndex
  };
}

/**
 * 勝者を設定する関数
 * @param room 現在のルーム情報
 * @param goalPlayerId 勝者のプレイヤーID
 */
export function setWinner(room: Room, goalPlayerId: string): void {
  room.players.forEach(player => {
    player.isWinner = player.id === goalPlayerId;
  });
  room.status = 'finished';
}

/**
 * ゴール判定と状態更新を一括で行う関数
 * @param room 現在のルーム情報
 * @param pageName 選択されたページ名
 * @param socketId 現在のプレイヤーのソケットID
 * @returns 処理結果
 */
export function processPageSelection(room: Room, pageName: string, socketId: string): {
  success: boolean;
  isGoal: boolean;
  goalPlayer: Player | null;
  message?: string;
} {
  // 現在のプレイヤーかどうかチェック
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.id !== socketId) {
    return { 
      success: false, 
      isGoal: false, 
      goalPlayer: null,
      message: 'あなたの番ではありません' 
    };
  }

  // ページを更新
  room.currentPage = pageName;

  // ゴールチェック
  const { isGoal, goalPlayer, nextPlayerIndex } = checkGoal(room, pageName);

  if (isGoal && goalPlayer) {
    // 勝者設定
    setWinner(room, goalPlayer.id);
    console.log(`ゴール判定: ${goalPlayer.name}(${goalPlayer.id}) が勝者になりました。ゴールページ: ${goalPlayer.goalPage}`);
    return { 
      success: true, 
      isGoal: true, 
      goalPlayer 
    };
  } else {
    // 次のプレイヤーへ
    room.currentPlayerIndex = nextPlayerIndex;
    return { 
      success: true, 
      isGoal: false, 
      goalPlayer: null 
    };
  }
} 