import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { processPageSelection } from "./app/utils/goal-detector";

// 環境変数
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// 部屋と関連データの管理用オブジェクト
const rooms = {};
const MAX_PLAYERS = 4;

// Wikipediaページの情報の型
async function getRandomWikipediaPage() {
  const WIKIPEDIA_BASE_URL = process.env.WIKIPEDIA_BASE_URL || 'https://ja.wikipedia.org';
  const WIKIPEDIA_RANDOM_PATH = process.env.WIKIPEDIA_RANDOM_PATH || '/wiki/Special:Random';
  const WIKIPEDIA_REST_API_PATH = process.env.WIKIPEDIA_REST_API_PATH || '/api/rest_v1/page/summary';

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

// Next.jsアプリの準備
const app = next({ dev, hostname, port });
const nextHandler = app.getRequestHandler();

app.prepare().then(() => {
  // HTTPサーバーの作成
  const httpServer = createServer(nextHandler);

  // Socket.IOサーバーの初期化
  const io = new Server(httpServer);

  // Socket.IO接続処理
  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

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
        socket.emit('error', { message: result.message });
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

  // サーバー起動
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server is running`);
  });
}); 