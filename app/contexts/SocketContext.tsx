'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ソケットコンテキストの型定義
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  roomId: string | null;
  room: Room | null;
  playerName: string;
  error: string | null;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  selectPage: (pageName: string) => void;
  setPlayerName: (name: string) => void;
}

// プレイヤーの型定義
export interface Player {
  id: string;
  name: string;
  goalPage: string;
  goalDescription?: string; // ゴールページの説明文
  isReady: boolean;
  isWinner: boolean;
}

// 部屋の型定義
export interface Room {
  id: string;
  creator: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPage: string;
  startingPage: string;
  currentPlayerIndex: number;
}

// コンテキストの初期値
const defaultContextValue: SocketContextType = {
  socket: null,
  connected: false,
  roomId: null,
  room: null,
  playerName: '',
  error: null,
  createRoom: () => {},
  joinRoom: () => {},
  startGame: () => {},
  selectPage: () => {},
  setPlayerName: () => {},
};

// ソケットコンテキストの作成
export const SocketContext = createContext<SocketContextType>(defaultContextValue);

// ソケットコンテキストプロバイダー
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // ソケット初期化
  useEffect(() => {
    // サーバー起動を確認
    fetch('/api/socket')
      .then(() => {
        // Socket.IOクライアントの初期化
        // 環境変数から接続先を取得するか、デフォルト値を使用
        const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 
          (process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : 'http://localhost:3001');
        
        // Socket.IOの設定オプション
        const socketOptions = {
          // 本番環境の場合はAPIルートのパスを設定
          ...(process.env.NODE_ENV === 'production' && { path: '/api/socketio' })
        };
          
        console.log('Connecting to Socket.IO server at:', socketURL, socketOptions);
        const socketInstance = io(socketURL, socketOptions);

        socketInstance.on('connect', () => {
          console.log('Connected to socket server');
          setConnected(true);
        });

        socketInstance.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setError(`サーバー接続エラー: ${err.message}`);
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from socket server');
          setConnected(false);
        });

        socketInstance.on('error', ({ message }: { message: string }) => {
          console.error('Socket error received:', message);
          setError(message);
          setTimeout(() => setError(null), 5000);
        });

        socketInstance.on('room-created', ({ roomId, room }: { roomId: string; room: Room }) => {
          console.log('Room created:', roomId);
          setRoomId(roomId);
          setRoom(room);
        });

        socketInstance.on('room-joined', ({ roomId, room }: { roomId: string; room: Room }) => {
          console.log('Room joined:', roomId);
          setRoomId(roomId);
          setRoom(room);
        });

        socketInstance.on('player-joined', ({ room }: { room: Room }) => {
          console.log('Player joined room');
          setRoom(room);
        });

        socketInstance.on('player-left', ({ room }: { room: Room }) => {
          console.log('Player left room');
          setRoom(room);
        });

        socketInstance.on('game-started', ({ room }: { room: Room }) => {
          console.log('Game started');
          setRoom(room);
        });

        socketInstance.on('page-selected', ({ room }: { room: Room }) => {
          console.log('Page selected');
          setRoom(room);
        });

        socketInstance.on('game-finished', ({ room }: { room: Room }) => {
          console.log('Game finished');
          setRoom(room);
        });

        setSocket(socketInstance);

        return () => {
          socketInstance.disconnect();
        };
      })
      .catch((error) => {
        console.error('Failed to connect to socket server:', error);
        setError('サーバーに接続できませんでした');
      });
  }, []);

  // 部屋を作成
  const createRoom = (name: string) => {
    if (socket) {
      console.log('Creating room with player name:', name);
      setPlayerName(name);
      socket.emit('create-room', { playerName: name });
    } else {
      console.error('Socket not connected when trying to create room');
      setError('サーバーに接続できていません。再読み込みしてください。');
    }
  };

  // 部屋に参加
  const joinRoom = (rid: string, name: string) => {
    if (socket) {
      console.log('Joining room:', rid, 'with player name:', name);
      setPlayerName(name);
      socket.emit('join-room', { roomId: rid, playerName: name });
      
      // リクエスト送信後、3秒後にもまだroomIdが設定されていなければエラーをクリアして再試行できるようにする
      const joinTimeout = setTimeout(() => {
        // roomIdの現在の値を取得するためにstateではなく、直接ここでroomIdステートを確認
        if (!roomId) {
          console.log('No response after join-room request, clearing submission state');
          setError('部屋への参加に失敗しました。もう一度お試しください。');
        }
      }, 3000);

      // クリーンアップ関数を返して、コンポーネントがアンマウントされた場合やroomIdが設定された場合にタイマーをクリア
      return () => clearTimeout(joinTimeout);
    } else {
      console.error('Socket not connected when trying to join room');
      setError('サーバーに接続できていません。再読み込みしてください。');
    }
  };

  // ゲーム開始
  const startGame = () => {
    if (socket && roomId) {
      console.log('Starting game in room:', roomId);
      socket.emit('start-game', { roomId });
    } else {
      console.error('Socket not connected or room ID not set when trying to start game');
      setError('ゲームを開始できません。再読み込みしてください。');
    }
  };

  // ページ選択
  const selectPage = (pageName: string) => {
    if (socket && roomId) {
      console.log('Selecting page:', pageName, 'in room:', roomId);
      socket.emit('select-page', { roomId, pageName });
    } else {
      console.error('Socket not connected or room ID not set when trying to select page');
      setError('ページを選択できません。再読み込みしてください。');
    }
  };

  // コンテキスト値
  const value: SocketContextType = {
    socket,
    connected,
    roomId,
    room,
    playerName,
    error,
    createRoom,
    joinRoom,
    startGame,
    selectPage,
    setPlayerName,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// カスタムフック
export const useSocket = () => useContext(SocketContext); 