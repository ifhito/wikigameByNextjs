/**
 * @jest-environment node
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';

describe('協力モードのテスト', () => {
  let io: Server;
  let clientSocket: any;
  let clientSocket2: any;
  let port = 4000;
  let server: any;
  let rooms: Record<string, any> = {};
  
  // 各テスト前の準備
  beforeAll((done) => {
    // HTTPサーバーとSocket.IOサーバーを作成
    server = createServer();
    io = new Server(server);
    
    // サーバーをリッスン
    server.listen(port, () => {
      // クライアントのセットアップ
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        // 部屋作成イベント
        socket.on('create-room', ({ playerName, gameMode }) => {
          const roomId = 'TEST-ROOM';
          const player = {
            id: socket.id,
            name: playerName,
            goalPage: '',
            isReady: false,
            isWinner: false,
            consecutiveTurnsLeft: 3
          };
          
          const room = {
            id: roomId,
            creator: socket.id,
            players: [player],
            status: 'waiting',
            currentPage: '',
            startingPage: 'StartPage',
            currentPlayerIndex: 0,
            gameMode: gameMode || 'competitive',
            commonGoalPage: gameMode === 'cooperative' ? 'GoalPage' : '',
            commonGoalDescription: gameMode === 'cooperative' ? 'Goal Description' : '',
            totalTurnsLeft: gameMode === 'cooperative' ? 6 : 0,
            maxTotalTurns: gameMode === 'cooperative' ? 6 : 0
          };
          
          rooms[roomId] = room;
          socket.join(roomId);
          socket.emit('room-created', { roomId, room });
        });
        
        // 部屋参加イベント
        socket.on('join-room', ({ roomId, playerName }) => {
          if (!rooms[roomId]) {
            socket.emit('error', { message: '部屋が見つかりません' });
            return;
          }
          
          const room = rooms[roomId];
          const isCooperative = room.gameMode === 'cooperative';
          
          const player = {
            id: socket.id,
            name: playerName,
            goalPage: isCooperative ? '' : 'PlayerGoal',
            goalDescription: isCooperative ? '' : 'Player Goal Description',
            isReady: false,
            isWinner: false,
            consecutiveTurnsLeft: 3
          };
          
          room.players.push(player);
          socket.join(roomId);
          socket.emit('room-joined', { roomId, room });
          socket.to(roomId).emit('player-joined', { room });
        });
        
        // ゲーム開始イベント
        socket.on('start-game', ({ roomId }) => {
          if (!rooms[roomId]) {
            socket.emit('error', { message: '部屋が見つかりません' });
            return;
          }
          
          const room = rooms[roomId];
          room.status = 'playing';
          room.currentPage = room.startingPage;
          
          io.to(roomId).emit('game-started', { room });
        });
        
        // ページ選択イベント
        socket.on('select-page', ({ roomId, pageName, useContinuousTurn }) => {
          if (!rooms[roomId]) {
            socket.emit('error', { message: '部屋が見つかりません' });
            return;
          }
          
          const room = rooms[roomId];
          const currentPlayer = room.players[room.currentPlayerIndex];
          const isCooperative = room.gameMode === 'cooperative';
          
          if (currentPlayer.id !== socket.id) {
            socket.emit('error', { message: 'あなたのターンではありません' });
            return;
          }
          
          room.currentPage = pageName;
          
          if (isCooperative) {
            room.totalTurnsLeft -= 1;
          }
          
          let isGameFinished = false;
          
          // 連続ターン処理
          if (!isGameFinished && currentPlayer.consecutiveTurnsLeft > 0 && useContinuousTurn && !isCooperative) {
            currentPlayer.consecutiveTurnsLeft -= 1;
          } else if (!isGameFinished) {
            room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
          }
          
          io.to(roomId).emit('page-selected', { room });
        });
      });
      
      clientSocket.on('connect', () => {
        clientSocket2.on('connect', done);
      });
    });
  });
  
  // 各テスト後のクリーンアップ
  afterAll(() => {
    io.close();
    clientSocket.close();
    clientSocket2.close();
    server.close();
  });
  
  // 各テスト間のリセット
  afterEach(() => {
    rooms = {};
  });
  
  test('協力モードでは連続ターンが無効になること', (done) => {
    // クライアント1が協力モードの部屋を作成
    clientSocket.emit('create-room', { playerName: 'Player1', gameMode: 'cooperative' });
    
    clientSocket.once('room-created', ({ roomId, room }: { roomId: string; room: any }) => {
      expect(room.gameMode).toBe('cooperative');
      
      // クライアント2が部屋に参加
      clientSocket2.emit('join-room', { roomId, playerName: 'Player2' });
      
      clientSocket2.once('room-joined', () => {
        // ゲーム開始
        clientSocket.emit('start-game', { roomId });
        
        clientSocket.once('game-started', ({ room }: { room: any }) => {
          expect(room.status).toBe('playing');
          
          // 連続ターンフラグをtrueにしてページ選択
          clientSocket.emit('select-page', { 
            roomId, 
            pageName: 'NextPage', 
            useContinuousTurn: true 
          });
          
          clientSocket.once('page-selected', ({ room }: { room: any }) => {
            // 協力モードでは連続ターンが無視されるので、次のプレイヤーになっているはず
            expect(room.players[room.currentPlayerIndex].id).toBe(clientSocket2.id);
            expect(room.currentPage).toBe('NextPage');
            
            // 残りターン数が減少していることを確認
            expect(room.totalTurnsLeft).toBe(5);
            
            done();
          });
        });
      });
    });
  });
  
  test('対戦モードでは連続ターンが有効になること', (done) => {
    // クライアント1が対戦モードの部屋を作成
    clientSocket.emit('create-room', { playerName: 'Player1', gameMode: 'competitive' });
    
    clientSocket.once('room-created', ({ roomId, room }: { roomId: string; room: any }) => {
      expect(room.gameMode).toBe('competitive');
      
      // クライアント2が部屋に参加
      clientSocket2.emit('join-room', { roomId, playerName: 'Player2' });
      
      clientSocket2.once('room-joined', () => {
        // ゲーム開始
        clientSocket.emit('start-game', { roomId });
        
        clientSocket.once('game-started', ({ room }: { room: any }) => {
          expect(room.status).toBe('playing');
          
          // 連続ターンフラグをtrueにしてページ選択
          clientSocket.emit('select-page', { 
            roomId, 
            pageName: 'NextPage', 
            useContinuousTurn: true 
          });
          
          clientSocket.once('page-selected', ({ room }: { room: any }) => {
            // 対戦モードでは連続ターンが有効なので、プレイヤー1のままのはず
            expect(room.players[room.currentPlayerIndex].id).toBe(clientSocket.id);
            expect(room.currentPage).toBe('NextPage');
            
            // 連続ターン回数が減少していることを確認
            const player1 = room.players.find((p: any) => p.id === clientSocket.id);
            expect(player1.consecutiveTurnsLeft).toBe(2);
            
            done();
          });
        });
      });
    });
  });
}); 