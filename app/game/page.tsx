'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../contexts/SocketContext';
import { GameRoom } from '../components/GameRoom';

export default function GamePage() {
  const router = useRouter();
  const { roomId, connected } = useSocket();

  // roomIdがない場合はホームに戻る
  useEffect(() => {
    if (connected && !roomId) {
      router.push('/');
    }
  }, [roomId, connected, router]);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">接続中...</h1>
          <p className="text-gray-600">サーバーに接続しています。しばらくお待ちください。</p>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">リダイレクト中...</h1>
          <p className="text-gray-600">部屋が見つかりません。ホームページにリダイレクトします。</p>
        </div>
      </div>
    );
  }

  return <GameRoom roomId={roomId} />;
} 