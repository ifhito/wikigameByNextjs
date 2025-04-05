'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// ソケットコンテキストの型定義
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  room: Room | null;
  playerName: string;
  connectionError: string | null;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  selectPage: (pageName: string, useContinuousTurn?: boolean) => void;
  setPlayerName: (name: string) => void;
  useContinuousTurn: boolean;
  toggleContinuousTurn: () => void;
}

// プレイヤーの型定義
export interface Player {
  id: string;
  name: string;
  goalPage: string;
  goalDescription?: string; // ゴールページの説明文
  isReady: boolean;
  isWinner: boolean;
  consecutiveTurnsLeft: number; // 連続ターンを必須プロパティにする
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
  isConnected: false,
  roomId: null,
  room: null,
  playerName: '',
  connectionError: null,
  createRoom: () => {},
  joinRoom: () => {},
  startGame: () => {},
  selectPage: () => {},
  setPlayerName: () => {},
  useContinuousTurn: false,
  toggleContinuousTurn: () => {},
};

// ソケットコンテキストの作成
export const SocketContext = createContext<SocketContextType>(defaultContextValue);

// ソケットコンテキストプロバイダー
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [useContinuousTurn, setUseContinuousTurn] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 連続ターンの切り替え
  const toggleContinuousTurn = () => {
    setUseContinuousTurn(!useContinuousTurn);
  };

  // タイムアウトとリソースをクリーンアップする関数
  const cleanupResources = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ソケット初期化
  useEffect(() => {
    // サーバー起動を確認
    fetch('/api/socket')
      .then((response) => response.json())
      .then((data) => {
        console.log('Socket API response:', data);
        
        if (data.status !== 'ok') {
          throw new Error(data.message || 'Socket APIが正常に応答しませんでした');
        }
        
        // Socket.IOクライアントの初期化
        const socketOptions = {
          path: '/api/socket/io',
          transports: ['polling', 'websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 30000,
        };
          
        console.log('Connecting to Socket.IO server with options:', socketOptions);
        const socketInstance = io(window.location.origin, socketOptions);
        socketRef.current = socketInstance;

        // 接続タイムアウト処理
        timeoutRef.current = setTimeout(() => {
          if (socketInstance && !socketInstance.connected) {
            console.error('Socket.IO connection timeout');
            setConnectionError('サーバー接続タイムアウト: 接続に時間がかかりすぎています');
            cleanupResources();
          }
        }, 10000);

        socketInstance.on('connect', () => {
          console.log('Connected to socket server with ID:', socketInstance.id);
          setIsConnected(true);
          setConnectionError(null);
          cleanupResources();
        });

        socketInstance.on('connect_error', (err) => {
          console.error('Socket connection error:', err, err.message);
          setConnectionError(`サーバー接続エラー: ${err.message}`);
          cleanupResources();
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from socket server');
          setIsConnected(false);
        });

        socketInstance.on('error', ({ message }: { message: string }) => {
          console.error('Socket error received:', message);
          setConnectionError(message);
          setTimeout(() => setConnectionError(null), 5000);
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

        socketInstance.on('room-updated', ({ room }: { room: Room }) => {
          console.log('Room updated');
          
          // 新しいターンが自分の番でない場合は連続ターンをリセット
          if (room.currentPlayerIndex !== undefined && 
              socketInstance.id !== room.players[room.currentPlayerIndex]?.id) {
            setUseContinuousTurn(false);
          }
          
          setRoom(room);
        });

        socketInstance.on('game-started', ({ room }: { room: Room }) => {
          console.log('Game started');
          setRoom(room);
        });

        socketInstance.on('page-selected', ({ room }: { room: Room }) => {
          console.log('Page selected');
          
          try {
            // 新しいターンが自分の番でない場合は連続ターンをリセット
            if (room.currentPlayerIndex !== undefined && 
                socketInstance.id !== room.players[room.currentPlayerIndex]?.id) {
              setUseContinuousTurn(false);
            }
            
            setRoom(room);
          } catch (error) {
            console.error('Error handling page-selected event:', error);
          }
        });

        socketInstance.on('game-finished', ({ room }: { room: Room }) => {
          console.log('Game finished', room);
          // ゲーム終了時に連続ターンをリセット
          setUseContinuousTurn(false);
          setRoom(room);
          
          // 部屋の状態を強制的に終了に設定
          if (room) {
            const updatedRoom = {
              ...room,
              status: 'finished' as const
            };
            setRoom(updatedRoom);
            console.log('Game status set to finished:', updatedRoom);
          }
        });

        setSocket(socketInstance);

        return () => {
          cleanupResources();
          if (socketInstance) {
            console.log('Cleaning up socket connection...');
            // すべてのイベントリスナーを削除
            socketInstance.off('connect');
            socketInstance.off('connect_error');
            socketInstance.off('disconnect');
            socketInstance.off('error');
            socketInstance.off('room-created');
            socketInstance.off('room-joined');
            socketInstance.off('player-joined');
            socketInstance.off('player-left');
            socketInstance.off('room-updated');
            socketInstance.off('game-started');
            socketInstance.off('page-selected');
            socketInstance.off('game-finished');
            
            socketInstance.disconnect();
            socketRef.current = null;
          }
        };
      })
      .catch((error) => {
        console.error('Failed to connect to socket server:', error);
        setConnectionError(`サーバーに接続できませんでした: ${error.message}`);
        cleanupResources();
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
      setConnectionError('サーバーに接続できていません。再読み込みしてください。');
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
          setConnectionError('部屋への参加に失敗しました。もう一度お試しください。');
        }
      }, 3000);

      return () => clearTimeout(joinTimeout);
    } else {
      console.error('Socket not connected when trying to join room');
      setConnectionError('サーバーに接続できていません。再読み込みしてください。');
    }
  };

  // ゲーム開始
  const startGame = () => {
    if (socket && roomId) {
      console.log('Starting game in room:', roomId);
      socket.emit('start-game', { roomId });
    } else {
      console.error('Socket not connected or room ID not set when trying to start game');
      setConnectionError('ゲームを開始できません。再読み込みしてください。');
    }
  };

  // ページ選択
  const selectPage = (pageName: string, useContinuousTurnOverride: boolean = useContinuousTurn) => {
    if (socket && roomId) {
      console.log('Selecting page:', pageName, 'in room:', roomId, useContinuousTurnOverride ? 'with continuous turn' : '');
      try {
        socket.emit('select-page', { roomId, pageName, useContinuousTurn: useContinuousTurnOverride });
      } catch (error) {
        console.error('Error selecting page:', error);
        setConnectionError('ページ選択中にエラーが発生しました。再読み込みしてください。');
      }
    } else {
      console.error('Socket not connected or room ID not set when trying to select page');
      setConnectionError('ページを選択できません。再読み込みしてください。');
    }
  };

  // コンテキスト値
  const value: SocketContextType = {
    socket,
    isConnected,
    roomId,
    room,
    playerName,
    connectionError,
    createRoom,
    joinRoom,
    startGame,
    selectPage,
    setPlayerName,
    useContinuousTurn,
    toggleContinuousTurn,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// カスタムフック
export const useSocket = () => useContext(SocketContext); 