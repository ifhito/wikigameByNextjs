'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Room型とPlayer型の定義
export interface Player {
  id: string;
  name: string;
  goalPage: string;
  goalDescription?: string;
  isReady: boolean;
  isWinner: boolean;
}

export interface Room {
  id: string;
  creator: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPage: string;
  startingPage: string;
  currentPlayerIndex: number;
}

// コンテキストの型定義
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  room: Room | null;
  roomId: string | null;
  playerName: string;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  selectPage: (pageName: string) => void;
  setPlayerName: (name: string) => void;
}

// コンテキストの作成
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
  room: null,
  roomId: null,
  playerName: '',
  createRoom: () => {},
  joinRoom: () => {},
  startGame: () => {},
  selectPage: () => {},
  setPlayerName: () => {},
});

// コンテキストを使用するためのフック
export const useSocket = () => useContext(SocketContext);

// プロバイダーの型定義
interface SocketProviderProps {
  children: ReactNode;
}

// コンテキストプロバイダー
export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  useEffect(() => {
    // Socket.IOサーバーに接続
    const initializeSocket = async () => {
      try {
        // 環境に応じたURLとオプションを設定
        const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        const socketOptions = {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          autoConnect: true,
          forceNew: true, // 新しい接続を強制する
        };

        console.log('Initializing socket with options:', socketOptions);
        const socketInstance = io(socketURL, socketOptions);

        socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance.id);
          setIsConnected(true);
          setConnectionError(null);
        });

        socketInstance.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setConnectionError(`Connection error: server error`);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
          if (reason === 'io server disconnect') {
            // サーバー側から強制切断された場合は再接続を試みる
            socketInstance.connect();
          }
        });

        socketInstance.on('error', (error) => {
          console.error('Socket error:', error);
          if (typeof error === 'object' && error !== null && 'message' in error) {
            setConnectionError(`Socket error: ${(error as { message: string }).message}`);
          } else {
            setConnectionError('An unknown socket error occurred');
          }
          setTimeout(() => setConnectionError(null), 5000);
        });

        // ゲーム関連のイベントハンドラを設定
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

        // クリーンアップ関数
        return () => {
          console.log('Cleaning up socket connection');
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
        setConnectionError('Failed to initialize socket connection');
      }
    };

    initializeSocket();
  }, []);

  // 部屋を作成
  const createRoom = (name: string) => {
    if (socket && isConnected) {
      console.log('Creating room with player name:', name);
      setPlayerName(name);
      socket.emit('create-room', { playerName: name });
    } else {
      console.error('Socket not connected when trying to create room');
      setConnectionError('サーバーに接続できていません。再読み込みしてください。');
    }
  };

  // 部屋に参加
  const joinRoom = (rid: string, name: string) => {
    if (socket && isConnected) {
      console.log('Joining room:', rid, 'with player name:', name);
      setPlayerName(name);
      socket.emit('join-room', { roomId: rid, playerName: name });
    } else {
      console.error('Socket not connected when trying to join room');
      setConnectionError('サーバーに接続できていません。再読み込みしてください。');
    }
  };

  // ゲーム開始
  const startGame = () => {
    if (socket && isConnected && roomId) {
      console.log('Starting game in room:', roomId);
      socket.emit('start-game', { roomId });
    } else {
      console.error('Socket not connected or room ID not set when trying to start game');
      setConnectionError('ゲームを開始できません。再読み込みしてください。');
    }
  };

  // ページ選択
  const selectPage = (pageName: string) => {
    if (socket && isConnected && roomId) {
      console.log('Selecting page:', pageName, 'in room:', roomId);
      socket.emit('select-page', { roomId, pageName });
    } else {
      console.error('Socket not connected or room ID not set when trying to select page');
      setConnectionError('ページを選択できません。再読み込みしてください。');
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket,
      isConnected,
      connectionError, 
      room, 
      roomId, 
      playerName,
      createRoom,
      joinRoom,
      startGame,
      selectPage,
      setPlayerName
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 