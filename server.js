// @ts-check

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

/**
 * @typedef {Object} Player
 * @property {string} id - プレイヤーのID
 * @property {string} name - プレイヤー名
 * @property {string} goalPage - 目標ページ
 * @property {string} [goalDescription] - 目標ページの説明
 * @property {boolean} isReady - 準備完了状態
 * @property {boolean} isWinner - 勝者かどうか
 */

/**
 * @typedef {Object} Room
 * @property {string} id - 部屋ID
 * @property {string} creator - 作成者ID
 * @property {Player[]} players - プレイヤー一覧
 * @property {'waiting' | 'playing' | 'finished'} status - 部屋の状態
 * @property {string} currentPage - 現在のページ
 * @property {string} startingPage - 開始ページ
 * @property {number} currentPlayerIndex - 現在のプレイヤーインデックス
 */

// ゴール検出ロジックのインポート（ローカル実装として処理）
const normalizePageName = (pageName) => {
  return pageName
    .toLowerCase()
    .replace(/[_\s]/g, '') // アンダースコアと空白を削除
    .replace(/[（(]/g, '') // 左括弧を削除
    .replace(/[）)]/g, '') // 右括弧を削除
    .normalize('NFKC'); // 全角・半角を統一
};

/**
 * ページ選択時のゴール判定を行う関数
 * @param {Room} room - 部屋情報
 * @param {string} pageName - 選択されたページ名
 * @returns {{isGoal: boolean, goalPlayer: Player|null, nextPlayerIndex: number}} - ゴール判定結果
 */
const checkGoal = (room, pageName) => {
  // ページ名を正規化
  const normalizedSelectedPage = normalizePageName(pageName);
  
  // ゴールチェック - 誰かのゴールページに到達したかを判定
  let goalPlayer = null;
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
};

/**
 * 勝者を設定する関数
 * @param {Room} room - 部屋情報
 * @param {string} goalPlayerId - 勝者のプレイヤーID
 */
const setWinner = (room, goalPlayerId) => {
  room.players.forEach(player => {
    player.isWinner = player.id === goalPlayerId;
  });
  room.status = 'finished';
};

/**
 * ゴール判定と状態更新を一括で行う関数
 * @param {Room} room - 部屋情報
 * @param {string} pageName - 選択されたページ名
 * @param {string} socketId - ソケットID
 * @returns {{success: boolean, isGoal: boolean, goalPlayer: Player|null, message?: string}} - 処理結果
 */
const processPageSelection = (room, pageName, socketId) => {
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
};

// 型定義
const rooms = {};
const MAX_PLAYERS = 4;

// Wikipediaの環境変数設定
const WIKIPEDIA_BASE_URL = process.env.WIKIPEDIA_BASE_URL || 'https://ja.wikipedia.org';
const WIKIPEDIA_REST_API_PATH = process.env.WIKIPEDIA_REST_API_PATH || '/api/rest_v1/page/summary';
const WIKIPEDIA_RANDOM_PATH = process.env.WIKIPEDIA_RANDOM_PATH || '/wiki/Special:Random';

// ランダムなWikipediaページを取得する関数
async function getRandomWikipediaPage() {
  try {
    // まずランダムなページを取得
    const response = await fetch(`${WIKIPEDIA_BASE_URL}${WIKIPEDIA_RANDOM_PATH}`);
    const url = response.url;
    const title = decodeURIComponent(url.split('/').pop() || '');
    
    // 次にページの説明文を取得
    try {
      const apiUrl = `${WIKIPEDIA_BASE_URL}${WIKIPEDIA_REST_API_PATH}/${encodeURIComponent(title)}`;
      const descResponse = await fetch(apiUrl);
      const descData = await descResponse.json();
      const description = descData.extract || '説明がありません';
      
      return { title, description };
    } catch (descError) {
      console.error('Error fetching Wikipedia description:', descError);
      return { title, description: '説明を取得できませんでした' };
    }
  } catch (error) {
    console.error('Error fetching random Wikipedia page:', error);
    return { 
      title: 'ランダムページの取得に失敗しました', 
      description: '説明を取得できませんでした' 
    };
  }
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log('New client connected', socket.id);
    
    // 部屋を作成
    socket.on('create-room', async ({ playerName }) => {
      // ランダムな部屋IDを生成
      const roomId = Math.random().toString(36).substring(2, 8);
      
      // ランダムなゴールページを取得
      const goalPageInfo = await getRandomWikipediaPage();
      
      // 部屋を作成
      const room = {
        id: roomId,
        creator: socket.id,
        players: [
          {
            id: socket.id,
            name: playerName,
            goalPage: goalPageInfo.title,
            goalDescription: goalPageInfo.description,
            isReady: true,
            isWinner: false,
          },
        ],
        status: 'waiting',
        currentPage: '',
        startingPage: '',
        currentPlayerIndex: 0,
      };

      rooms[roomId] = room;
      socket.join(roomId);
      socket.emit('room-created', { roomId, room });
    });

    // 部屋に参加
    socket.on('join-room', async ({ roomId, playerName }) => {
      console.log(`参加リクエスト: プレイヤー「${playerName}」が部屋「${roomId}」に参加しようとしています`);
      console.log(`現在の部屋一覧:`, Object.keys(rooms));
      
      const room = rooms[roomId];

      if (!room) {
        console.log(`エラー: 部屋「${roomId}」が見つかりません`);
        socket.emit('error', { message: '部屋が見つかりません' });
        return;
      }

      if (room.status !== 'waiting') {
        console.log(`エラー: 部屋「${roomId}」はすでにゲームが開始されています`);
        socket.emit('error', { message: 'ゲームはすでに開始されています' });
        return;
      }

      // プレイヤー数が上限に達しているかチェック
      if (room.players.length >= MAX_PLAYERS) {
        console.log(`エラー: 部屋「${roomId}」はプレイヤー数が上限(${MAX_PLAYERS}人)に達しています`);
        socket.emit('error', { message: 'プレイヤーの人数が上限に達しています' });
        return;
      }

      // ランダムなゴールページを取得
      const goalPageInfo = await getRandomWikipediaPage();

      const player = {
        id: socket.id,
        name: playerName,
        goalPage: goalPageInfo.title,
        goalDescription: goalPageInfo.description,
        isReady: true,
        isWinner: false,
      };

      room.players.push(player);
      socket.join(roomId);
      console.log(`成功: プレイヤー「${playerName}」が部屋「${roomId}」に参加しました`);
      socket.emit('room-joined', { roomId, room });
      io.to(roomId).emit('player-joined', { room });
    });

    // ゲーム開始
    socket.on('start-game', async ({ roomId }) => {
      const room = rooms[roomId];

      if (!room) {
        socket.emit('error', { message: '部屋が見つかりません' });
        return;
      }

      if (room.creator !== socket.id) {
        socket.emit('error', { message: '部屋の作成者のみがゲームを開始できます' });
        return;
      }

      // プレイヤーが2人未満の場合は開始できない
      if (room.players.length < 2) {
        socket.emit('error', { message: 'ゲームを開始するには2人以上のプレイヤーが必要です' });
        return;
      }

      // ゲームの状態をリセット
      if (room.status === 'finished') {
        // 以前に終了したゲームを再開する場合
        console.log('ゲームを再起動します: 新しいゴールページを設定します');
        
        // プレイヤーのisWinnerフラグをリセット
        room.players.forEach(player => {
          player.isWinner = false;
        });
      } else {
        // 新しいゲームを開始する場合
        console.log('新しいゲームを開始します: 新しいゴールページを設定します');
      }
      
      // 常に各プレイヤーに新しいゴールページを設定
      for (const player of room.players) {
        const goalPageInfo = await getRandomWikipediaPage();
        player.goalPage = goalPageInfo.title;
        player.goalDescription = goalPageInfo.description;
      }

      // ランダムな開始ページを設定
      const startPageInfo = await getRandomWikipediaPage();
      room.startingPage = startPageInfo.title;
      room.currentPage = startPageInfo.title;
      room.status = 'playing';
      room.currentPlayerIndex = 0;

      io.to(roomId).emit('game-started', { room });
    });

    // プレイヤーがページを選択
    socket.on('select-page', async ({ roomId, pageName }) => {
      console.log(`ページ選択: ${socket.id} が ${pageName} を選択しました (部屋: ${roomId})`);
      const room = rooms[roomId];

      if (!room) {
        socket.emit('error', { message: '部屋が見つかりません' });
        return;
      }

      if (room.status !== 'playing') {
        socket.emit('error', { message: 'ゲームはまだ開始されていません' });
        return;
      }

      // ゴール判定処理
      const result = processPageSelection(room, pageName, socket.id);
      
      if (!result.success) {
        socket.emit('error', { message: result.message || 'エラーが発生しました' });
        return;
      }

      if (result.isGoal && result.goalPlayer) {
        console.log(`ゴール検知: ${result.goalPlayer.name} が勝利しました！ゴールページ: ${result.goalPlayer.goalPage}`);
        io.to(roomId).emit('game-finished', { room, winner: result.goalPlayer });
      } else {
        console.log(`次のプレイヤーへ: プレイヤーインデックス ${room.currentPlayerIndex}`);
        io.to(roomId).emit('page-selected', { room });
      }
    });

    // 切断時の処理
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      
      // プレイヤーが参加していた部屋を探して更新
      Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        if (!room) return;
        
        const playerIndex = room.players.findIndex(player => player.id === socket.id);
        
        if (playerIndex !== -1) {
          // プレイヤーを削除
          room.players.splice(playerIndex, 1);
          
          // もし部屋の作成者が退出した場合、部屋を削除するか新しい作成者を設定
          if (room.creator === socket.id) {
            if (room.players.length > 0) {
              room.creator = room.players[0].id;
            } else {
              delete rooms[roomId];
              return;
            }
          }
          
          // 現在のプレイヤーインデックスを調整
          if (room.currentPlayerIndex >= room.players.length) {
            room.currentPlayerIndex = 0;
          }
          
          // 部屋の状態を更新
          io.to(roomId).emit('player-left', { room });
        }
      });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
}); 