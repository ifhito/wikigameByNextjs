'use client';

import React, { useState } from 'react';
import { Room } from '../contexts/SocketContext';

interface PlayerListProps {
  room: Room;
  currentPlayerId: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({ room, currentPlayerId }) => {
  // 各プレイヤーのゴール説明文表示状態を管理
  const [showDescriptions, setShowDescriptions] = useState<Record<string, boolean>>({});

  // 説明文の表示/非表示を切り替える関数
  const toggleDescription = (playerId: string) => {
    setShowDescriptions(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  if (!room || !room.players || room.players.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-bold mb-2 text-gray-900">プレイヤー</h2>
        <p className="text-gray-700">プレイヤーがいません</p>
      </div>
    );
  }

  const isGamePlaying = room.status === 'playing';
  const isGameFinished = room.status === 'finished';
  const currentPlayerTurn = room.players[room.currentPlayerIndex];
  const isCooperativeMode = room.gameMode === 'cooperative';

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h2 className="text-xl font-bold mb-2 text-gray-900">プレイヤー</h2>
      <div className="space-y-2">
        {room.players.map((player) => (
          <div
            key={player.id}
            className={`p-2 rounded ${
              isGamePlaying && currentPlayerTurn.id === player.id
                ? 'bg-blue-100 border-l-4 border-blue-500'
                : player.id === currentPlayerId
                ? 'bg-gray-100'
                : ''
            } ${player.isWinner ? 'bg-green-100 border-l-4 border-green-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-900">{player.name}</span>
                {player.id === currentPlayerId && <span className="ml-2 text-xs text-gray-700">(あなた)</span>}
                {isGamePlaying && currentPlayerTurn.id === player.id && (
                  <span className="ml-2 text-xs text-blue-600">プレイ中</span>
                )}
                {player.isWinner && <span className="ml-2 text-xs text-green-600">勝者!</span>}
              </div>
            </div>
            {/* 対戦モードの場合のみ個別のゴールページを表示 */}
            {isGamePlaying && !isCooperativeMode && (
              <div className="mt-1 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600">ゴールページ: </span>
                    <span className="font-medium text-gray-900">{player.goalPage}</span>
                  </div>
                  {player.goalDescription && (
                    <button 
                      onClick={() => toggleDescription(player.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-2 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                    >
                      {showDescriptions[player.id] ? '説明を隠す' : '説明を見る'}
                    </button>
                  )}
                </div>
                {showDescriptions[player.id] && player.goalDescription && (
                  <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-gray-700 text-xs">
                    {player.goalDescription}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isGamePlaying && (
        <div className="mt-4">
          <h3 className="font-semibold mb-1 text-gray-900">現在のページ</h3>
          <p className="text-gray-800">{room.currentPage}</p>
        </div>
      )}

      {isGameFinished && !isCooperativeMode && (
        <div className="mt-4 p-2 bg-green-50 rounded">
          <h3 className="font-bold text-green-800">ゲーム終了!</h3>
          <p className="mt-1 text-gray-800">
            <span className="font-medium">{room.players.find((p) => p.isWinner)?.name || '誰か'}</span> さんが
            ゴールページ「<span className="font-medium">{room.players.find((p) => p.isWinner)?.goalPage}</span>」に到達しました!
          </p>
        </div>
      )}

      {isGameFinished && isCooperativeMode && (
        <div className="mt-4 p-2 rounded">
          {room.players.some(p => p.isWinner) ? (
            <div className="bg-green-50 p-2 rounded">
              <h3 className="font-bold text-green-800">協力成功!</h3>
              <p className="mt-1 text-green-700">
                チーム全員でゴールページ「<span className="font-medium">{room.commonGoalPage}</span>」に到達しました!
              </p>
            </div>
          ) : (
            <div className="bg-red-50 p-2 rounded">
              <h3 className="font-bold text-red-800">ターン切れ</h3>
              <p className="mt-1 text-red-700">
                規定ターン数内にゴールページ「<span className="font-medium">{room.commonGoalPage}</span>」に到達できませんでした。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 