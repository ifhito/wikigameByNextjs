'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from './contexts/SocketContext';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, connectionError, roomId } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'multi'>('multi');

  // roomIdが設定されたらゲーム画面に遷移
  useEffect(() => {
    if (roomId && isSubmitting) {
      console.log('RoomID設定を検知。ゲーム画面に遷移します:', roomId);
      router.push('/game');
    }
  }, [roomId, router, isSubmitting]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSubmitting) return;
    
    console.log('部屋の作成を開始します');
    setIsSubmitting(true);
    createRoom(playerName);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !joinRoomId.trim() || isSubmitting) return;
    
    console.log('部屋への参加を開始します:', joinRoomId);
    setIsSubmitting(true);
    joinRoom(joinRoomId, playerName);
    
    // 5秒後にもまだroomIdが設定されていなければ送信状態をリセット
    setTimeout(() => {
      if (isSubmitting && !roomId) {
        console.log('部屋への参加がタイムアウトしました。送信状態をリセットします');
        setIsSubmitting(false);
      }
    }, 5000);
  };

  // 一人用モードに移動
  const handleSoloMode = () => {
    router.push('/solo');
  };

  // エラーが発生したら送信状態をリセット
  useEffect(() => {
    if (connectionError) {
      console.log('エラーを検知しました。送信状態をリセットします:', connectionError);
      setIsSubmitting(false);
    }
  }, [connectionError]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-white py-2 px-4 bg-blue-600 rounded-lg shadow mb-6 text-center">Wiki Game</h1>
        
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">遊び方</h2>
          <p className="text-gray-700 text-sm mb-2">
            Wiki Gameはウィキペディアの記事をリンクを辿って移動し、目標ページに到達するゲームです。
          </p>
          <ul className="list-disc list-inside text-gray-700 text-sm mb-2">
            <li>ゲーム開始時にランダムな出発点と目標ページが設定されます</li>
            <li>画面のリンクをクリックして次の記事に移動できます</li>
            <li>目標ページに到達すると勝利です</li>
          </ul>
          <p className="text-gray-700 text-sm">
            <span className="font-semibold">多人数モード:</span> 友達と対戦して、目標ページに最初に到達したプレイヤーが勝利します。<br />
            <span className="font-semibold">一人用モード:</span> 6回以内のクリックで目標ページに到達できるかチャレンジします。
          </p>
        </div>

        {/* ゲームモード選択 */}
        <div className="mb-6">
          <div className="bg-gray-100 rounded-lg p-2 flex">
            <button
              onClick={() => setGameMode('multi')}
              className={`flex-1 py-3 px-4 rounded-md ${
                gameMode === 'multi'
                  ? 'bg-blue-500 text-white font-bold shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              多人数モード
            </button>
            <button
              onClick={() => setGameMode('solo')}
              className={`flex-1 py-3 px-4 rounded-md ml-2 ${
                gameMode === 'solo'
                  ? 'bg-green-500 text-white font-bold shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              一人用モード
            </button>
          </div>
        </div>
        
        {connectionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {connectionError}
          </div>
        )}
        
        {/* 一人用モード */}
        {gameMode === 'solo' && (
          <div>
            <p className="text-gray-700 mb-4 text-center">
              6回以内のクリックで目標ページに到達できるかチャレンジしましょう！
            </p>
            <button
              onClick={handleSoloMode}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline"
            >
              一人用モードを始める
            </button>
          </div>
        )}
        
        {/* 多人数モード */}
        {gameMode === 'multi' && (
          <>
            <div className="flex mb-4">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'create'
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={isSubmitting}
              >
                部屋を作成
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'join'
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={isSubmitting}
              >
                部屋に参加
              </button>
            </div>

            {/* 部屋作成フォーム */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateRoom}>
                <div className="mb-4">
                  <label htmlFor="playerName" className="block text-gray-700 font-medium mb-2">
                    あなたの名前
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black font-medium custom-input"
                    placeholder="名前を入力"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '作成中...' : '部屋を作成'}
                </button>
              </form>
            )}

            {/* 部屋参加フォーム */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinRoom}>
                <div className="mb-4">
                  <label htmlFor="playerName" className="block text-gray-700 font-medium mb-2">
                    あなたの名前
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black font-medium custom-input"
                    placeholder="名前を入力"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="roomId" className="block text-gray-700 font-medium mb-2">
                    部屋ID
                  </label>
                  <input
                    type="text"
                    id="roomId"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black font-medium custom-input"
                    placeholder="部屋IDを入力"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      参加中...
                    </span>
                  ) : (
                    '部屋に参加'
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
