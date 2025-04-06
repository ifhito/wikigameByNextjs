const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// プレイヤーの型定義
/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {string} goalPage
 * @property {string} [goalDescription]
 * @property {boolean} isReady
 * @property {boolean} isWinner
 * @property {number} consecutiveTurnsLeft
 */

// 部屋の型定義
/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} creator
 * @property {Player[]} players
 * @property {'waiting'|'playing'|'finished'} status
 * @property {string} currentPage
 * @property {string} startingPage
 * @property {number} currentPlayerIndex
 * @property {'competitive'|'cooperative'} gameMode
 * @property {string} commonGoalPage
 * @property {string} commonGoalDescription
 * @property {number} totalTurnsLeft
 * @property {number} maxTotalTurns
 */

// 部屋のコレクション
/** @type {Record<string, Room>} */
const rooms = {};

// ウィキペディアAPIのパス
const WIKIPEDIA_API_PATH = 'https://ja.wikipedia.org/api/rest_v1/page/random/summary';

// プレイヤーの最大数
const MAX_PLAYERS = 10;

/**
 * ランダムなウィキペディアページを取得
 * @returns {Promise<{title: string, description: string}>}
 */
async function getRandomWikipediaPage() {
  try {
    const response = await fetch(WIKIPEDIA_API_PATH);
    const data = await response.json();
    return {
      title: data.title,
      description: data.extract || ''
    };
  } catch (error) {
    console.error('Failed to fetch random Wikipedia page:', error);
    return { title: 'JavaScript', description: 'プログラミング言語' }; // フォールバック
  }
}

/**
 * 部屋IDを生成
 * @returns {string}
 */
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * ページタイトルを正規化する（比較用）
 * @param {string} title
 * @returns {string}
 */
function normalizePageTitle(title) {
  if (!title) return '';
  // 空白を削除し、小文字に変換
  return title.trim().toLowerCase()
    // 括弧内の注釈（地名など）を削除
    .replace(/\s*\([^)]*\)\s*/g, '')
    // 特殊文字と記号を削除
    .replace(/[・.,:;'"!?_\-\s]/g, '');
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/socket/io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.IO接続
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 部屋作成イベント
    socket.on('create-room', async ({ playerName, gameMode = 'competitive' }) => {
      try {
        const roomId = generateRoomId();
        const [startPage, goalPage] = await Promise.all([
          getRandomWikipediaPage(),
          getRandomWikipediaPage()
        ]);

        // 協力モードの場合は共通ゴールを設定
        const isCooperative = gameMode === 'cooperative';
        
        const player = {
          id: socket.id,
          name: playerName,
          goalPage: isCooperative ? '' : goalPage.title,
          goalDescription: isCooperative ? '' : goalPage.description,
          isReady: false,
          isWinner: false,
          consecutiveTurnsLeft: 3  // 初期値として3ターン設定
        };

        const room = {
          id: roomId,
          creator: socket.id,
          players: [player],
          status: 'waiting',
          currentPage: '',
          startingPage: startPage.title,
          currentPlayerIndex: 0,
          gameMode: gameMode,
          commonGoalPage: isCooperative ? goalPage.title : '',
          commonGoalDescription: isCooperative ? goalPage.description : '',
          totalTurnsLeft: isCooperative ? 6 : 0,
          maxTotalTurns: isCooperative ? 6 : 0
        };

        rooms[roomId] = room;

        // 部屋に参加
        socket.join(roomId);
        console.log(`Room ${roomId} created by ${playerName} with game mode: ${gameMode}`);

        // 部屋作成成功イベント
        socket.emit('room-created', { roomId, room });
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: '部屋の作成に失敗しました' });
      }
    });

    // 部屋参加イベント
    socket.on('join-room', ({ roomId, playerName }) => {
      try {
        // 部屋が存在するか確認
        if (!rooms[roomId]) {
          socket.emit('error', { message: '部屋が見つかりません' });
          return;
        }

        // ゲームが開始されているか確認
        if (rooms[roomId].status !== 'waiting') {
          socket.emit('error', { message: 'ゲームはすでに開始されています' });
          return;
        }

        // プレイヤー数の上限を確認
        if (rooms[roomId].players.length >= MAX_PLAYERS) {
          socket.emit('error', { message: '部屋が満員です' });
          return;
        }

        // 既存のプレイヤーか確認
        const existingPlayer = rooms[roomId].players.find(player => player.id === socket.id);
        if (existingPlayer) {
          socket.emit('error', { message: 'すでに部屋に参加しています' });
          return;
        }

        const room = rooms[roomId];
        const isCooperative = room.gameMode === 'cooperative';

        // 協力モードか対戦モードによってゴールページを設定
        if (isCooperative) {
          // 新しいプレイヤーを追加（協力モード - 共通ゴール）
          const player = {
            id: socket.id,
            name: playerName,
            goalPage: '',
            goalDescription: '',
            isReady: false,
            isWinner: false,
            consecutiveTurnsLeft: 3  // 初期値として3ターン設定
          };
          
          rooms[roomId].players.push(player);
        } else {
          // 対戦モード - 個別ゴール
          getRandomWikipediaPage().then(goalPage => {
            // 新しいプレイヤーを追加
            const player = {
              id: socket.id,
              name: playerName,
              goalPage: goalPage.title,
              goalDescription: goalPage.description,
              isReady: false,
              isWinner: false,
              consecutiveTurnsLeft: 3  // 初期値として3ターン設定
            };

            rooms[roomId].players.push(player);

            // 部屋に参加
            socket.join(roomId);
            console.log(`Player ${playerName} joined room ${roomId}`);

            // 部屋参加成功イベント
            socket.emit('room-joined', { roomId, room: rooms[roomId] });

            // 他のプレイヤーに通知
            socket.to(roomId).emit('player-joined', { room: rooms[roomId] });
          }).catch(error => {
            console.error('Error getting goal page:', error);
            socket.emit('error', { message: 'ゴールページの取得に失敗しました' });
          });
          return;
        }

        // 協力モードの場合はここで直接参加処理
        socket.join(roomId);
        console.log(`Player ${playerName} joined room ${roomId} (cooperative mode)`);

        // 部屋参加成功イベント
        socket.emit('room-joined', { roomId, room: rooms[roomId] });

        // 他のプレイヤーに通知
        socket.to(roomId).emit('player-joined', { room: rooms[roomId] });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: '部屋への参加に失敗しました' });
      }
    });

    // ゲーム開始イベント
    socket.on('start-game', ({ roomId }) => {
      try {
        // 部屋が存在するか確認
        if (!rooms[roomId]) {
          socket.emit('error', { message: '部屋が見つかりません' });
          return;
        }

        // 作成者か確認
        if (rooms[roomId].creator !== socket.id) {
          socket.emit('error', { message: 'ゲームを開始する権限がありません' });
          return;
        }

        // ゲームが開始されているか確認
        if (rooms[roomId].status !== 'waiting' && rooms[roomId].status !== 'finished') {
          socket.emit('error', { message: 'ゲームはすでに開始されています' });
          return;
        }

        // プレイヤーが少なくとも1人いるか確認
        if (rooms[roomId].players.length < 1) {
          socket.emit('error', { message: 'ゲームを開始するにはプレイヤーが少なくとも1人必要です' });
          return;
        }

        // ゲーム再開始時は新しい開始ページと各プレイヤーの目標ページを設定
        if (rooms[roomId].status === 'finished') {
          getRandomWikipediaPage().then(startPage => {
            rooms[roomId].startingPage = startPage.title;
            
            const room = rooms[roomId];
            const isCooperative = room.gameMode === 'cooperative';
            
            if (isCooperative) {
              // 協力モードでは共通ゴールを設定
              getRandomWikipediaPage().then(goalPage => {
                room.commonGoalPage = goalPage.title;
                room.commonGoalDescription = goalPage.description;
                room.totalTurnsLeft = room.maxTotalTurns; // ターン数をリセット
                
                // 各プレイヤーの状態をリセット
                room.players.forEach(player => {
                  player.isWinner = false;
                  player.consecutiveTurnsLeft = 3;
                });
                
                // ゲーム開始
                room.status = 'playing';
                room.currentPage = room.startingPage;
                room.currentPlayerIndex = 0;
                
                // 全プレイヤーに通知
                io.to(roomId).emit('game-started', { room });
                console.log(`Cooperative game restarted in room ${roomId}`);
              });
            } else {
              // 対戦モードでは各プレイヤーにゴールページを設定
              const goalPromises = room.players.map(player => {
                return getRandomWikipediaPage().then(goalPage => {
                  player.goalPage = goalPage.title;
                  player.goalDescription = goalPage.description;
                  player.isWinner = false;
                  player.consecutiveTurnsLeft = 3; // 連続ターンをリセット
                  return player;
                });
              });
              
              Promise.all(goalPromises).then(() => {
                // ゲーム開始
                room.status = 'playing';
                room.currentPage = room.startingPage;
                room.currentPlayerIndex = 0;
                
                // 全プレイヤーに通知
                io.to(roomId).emit('game-started', { room });
                console.log(`Competitive game restarted in room ${roomId}`);
              });
            }
          });
        } else {
          // 通常のゲーム開始
          const room = rooms[roomId];
          const isCooperative = room.gameMode === 'cooperative';
          
          // 協力モードの場合はターン数を設定
          if (isCooperative) {
            room.totalTurnsLeft = room.maxTotalTurns || 6; // デフォルトは6ターン
          }
          
          // ゲーム開始
          room.status = 'playing';
          room.currentPage = room.startingPage;
          room.currentPlayerIndex = 0;
          
          // 各プレイヤーの状態をリセット
          room.players.forEach(player => {
            player.isWinner = false;
            player.consecutiveTurnsLeft = 3; // 連続ターンをリセット
          });
          
          // 全プレイヤーに通知
          io.to(roomId).emit('game-started', { room });
          console.log(`Game started in room ${roomId} (${isCooperative ? 'cooperative' : 'competitive'} mode)`);
        }
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'ゲームの開始に失敗しました' });
      }
    });

    // ページ選択イベント
    socket.on('select-page', ({ roomId, pageName, useContinuousTurn = false }) => {
      try {
        // 部屋が存在するか確認
        if (!rooms[roomId]) {
          socket.emit('error', { message: '部屋が見つかりません' });
          return;
        }

        // ゲームが進行中か確認
        if (rooms[roomId].status !== 'playing') {
          socket.emit('error', { message: 'ゲームが進行中ではありません' });
          return;
        }

        const room = rooms[roomId];
        const currentPlayer = room.players[room.currentPlayerIndex];
        const isCooperative = room.gameMode === 'cooperative';

        // 現在のプレイヤーか確認
        if (currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'あなたのターンではありません' });
          return;
        }

        // ページを更新
        room.currentPage = pageName;

        // 協力モードではターンを消費
        if (isCooperative) {
          room.totalTurnsLeft -= 1;
        }

        // 勝利条件をチェック - 正規化したタイトルで比較
        let isGameFinished = false;
        const normalizedPageName = normalizePageTitle(pageName);
        
        if (isCooperative) {
          // 協力モード - 共通ゴールへの到達または合計ターン終了でゲーム終了
          const normalizedGoalPage = normalizePageTitle(room.commonGoalPage);
          
          console.log(`Cooperative mode: comparing "${pageName}" (${normalizedPageName}) with goal "${room.commonGoalPage}" (${normalizedGoalPage})`);
          
          if (normalizedPageName === normalizedGoalPage || pageName === room.commonGoalPage) {
            // 全員が勝者
            room.players.forEach(player => {
              player.isWinner = true;
            });
            room.status = 'finished';
            isGameFinished = true;
            console.log(`Cooperative game: Goal page reached by ${currentPlayer.name}! All players win!`);
          } else if (room.totalTurnsLeft <= 0) {
            // ターン切れで敗北
            room.status = 'finished';
            isGameFinished = true;
            console.log(`Cooperative game: No turns left. All players lose.`);
          }
        } else {
          // 対戦モード - 個別のゴールへの到達
          const normalizedGoalPage = normalizePageTitle(currentPlayer.goalPage);
          
          console.log(`Competitive mode: comparing "${pageName}" (${normalizedPageName}) with goal "${currentPlayer.goalPage}" (${normalizedGoalPage})`);
          
          if (normalizedPageName === normalizedGoalPage || pageName === currentPlayer.goalPage) {
            currentPlayer.isWinner = true;
            room.status = 'finished';
            isGameFinished = true;
            console.log(`Competitive game: Player ${currentPlayer.name} reached goal page ${pageName}! Game finished.`);
          }
        }

        // 連続ターン処理
        if (!isGameFinished && currentPlayer.consecutiveTurnsLeft > 0 && useContinuousTurn && !isCooperative) {
          currentPlayer.consecutiveTurnsLeft -= 1;
          console.log(`Player ${currentPlayer.name} used a continuous turn. Remaining: ${currentPlayer.consecutiveTurnsLeft}`);
        } else if (!isGameFinished) {
          // 次のプレイヤーへ
          room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        }

        // 全プレイヤーに通知
        if (isGameFinished) {
          io.to(roomId).emit('game-finished', { room: rooms[roomId] });
          console.log(`Game finished in room ${roomId}. Mode: ${isCooperative ? 'cooperative' : 'competitive'}`);
        } else {
          io.to(roomId).emit('page-selected', { room: rooms[roomId] });
          console.log(`Page selected in room ${roomId}: ${pageName}`);
        }
      } catch (error) {
        console.error('Error selecting page:', error);
        socket.emit('error', { message: 'ページの選択に失敗しました' });
      }
    });

    // 切断イベント
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // プレイヤーが参加していた部屋を検索
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(player => player.id === socket.id);

        if (playerIndex !== -1) {
          // プレイヤーを削除
          room.players.splice(playerIndex, 1);
          console.log(`Player ${socket.id} removed from room ${roomId}`);

          // 部屋が空になった場合、部屋を削除
          if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted`);
            continue;
          }

          // 作成者が退出した場合、新しい作成者を設定
          if (room.creator === socket.id) {
            room.creator = room.players[0].id;
            console.log(`New creator of room ${roomId}: ${room.creator}`);
          }

          // ゲームが進行中の場合、現在のプレイヤーを更新
          if (room.status === 'playing') {
            // 現在のプレイヤーが退出した場合
            if (room.currentPlayerIndex === playerIndex) {
              room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
            } 
            // 退出したプレイヤーより後のプレイヤーの場合、インデックスを調整
            else if (room.currentPlayerIndex > playerIndex) {
              room.currentPlayerIndex--;
            }
          }

          // 他のプレイヤーに通知
          socket.to(roomId).emit('player-left', { room });
        }
      }
    });
  });

  // APIエンドポイント
  server.on('request', (req, res) => {
    if (req.url === '/api/socket') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', message: 'Socket.IO server is running' }));
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server running with path: /api/socket/io`);
  });
}); 