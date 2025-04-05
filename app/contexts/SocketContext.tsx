'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { socket } from '../socket';
import type { Socket } from 'socket.io-client';

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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  useEffect(() => {
    // Socket.IOの初期状態を確認
    if (socket.connected) {
      setIsConnected(true);
    }

    // 接続イベントリスナー
    function onConnect() {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    }

    // 接続エラーイベントリスナー
    function onConnectError(err: Error) {
      console.error('Socket connection error:', err);
      setConnectionError(`Connection error: server error`);
      setIsConnected(false);
    }

    // 切断イベントリスナー
    function onDisconnect(reason: string) {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // サーバー側から強制切断された場合は再接続を試みる
        socket.connect();
      }
    }

    // エラーイベントリスナー
    function onError(error: Error | string | { message: string }) {
      console.error('Socket error:', error);
      if (typeof error === 'object' && error !== null && 'message' in error) {
        setConnectionError(`Socket error: ${(error as { message: string }).message}`);
      } else {
        setConnectionError('An unknown socket error occurred');
      }
      setTimeout(() => setConnectionError(null), 5000);
    }

    // ゲーム関連のイベントハンドラ
    function onRoomCreated({ roomId, room }: { roomId: string; room: Room }) {
      console.log('Room created:', roomId);
      setRoomId(roomId);
      setRoom(room);
    }

    function onRoomJoined({ roomId, room }: { roomId: string; room: Room }) {
      console.log('Room joined:', roomId);
      setRoomId(roomId);
      setRoom(room);
    }

    function onPlayerJoined({ room }: { room: Room }) {
      console.log('Player joined room');
      setRoom(room);
    }

    function onPlayerLeft({ room }: { room: Room }) {
      console.log('Player left room');
      setRoom(room);
    }

    function onGameStarted({ room }: { room: Room }) {
      console.log('Game started');
      setRoom(room);
    }

    function onPageSelected({ room }: { room: Room }) {
      console.log('Page selected');
      setRoom(room);
    }

    function onGameFinished({ room }: { room: Room }) {
      console.log('Game finished');
      setRoom(room);
    }

    // イベントリスナーの登録
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('player-joined', onPlayerJoined);
    socket.on('player-left', onPlayerLeft);
    socket.on('game-started', onGameStarted);
    socket.on('page-selected', onPageSelected);
    socket.on('game-finished', onGameFinished);

    // クリーンアップ関数
    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('player-joined', onPlayerJoined);
      socket.off('player-left', onPlayerLeft);
      socket.off('game-started', onGameStarted);
      socket.off('page-selected', onPageSelected);
      socket.off('game-finished', onGameFinished);
    };
  }, []);

  // 部屋を作成
  const createRoom = (name: string) => {
    if (isConnected) {
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
    if (isConnected) {
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
    if (isConnected && roomId) {
      console.log('Starting game in room:', roomId);
      socket.emit('start-game', { roomId });
    } else {
      console.error('Socket not connected or room ID not set when trying to start game');
      setConnectionError('ゲームを開始できません。再読み込みしてください。');
    }
  };

  // ページ選択
  const selectPage = (pageName: string) => {
    if (isConnected && roomId) {
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