'use client';

import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { PlayerList } from './PlayerList';
import { WikipediaPage } from './WikipediaPage';

interface GameRoomProps {
  roomId: string;
}

export const GameRoom: React.FC<GameRoomProps> = ({ roomId }) => {
  const { socket, room, startGame, useContinuousTurn, toggleContinuousTurn } = useSocket();
  const [copied, setCopied] = React.useState(false);

  if (!socket || !room) {
    return <div className="p-8 text-center text-gray-800">読み込み中...</div>;
  }

  const isCurrentPlayerTurn = room.status === 'playing' && 
    socket.id === room.players[room.currentPlayerIndex]?.id;

  const isGameCreator = socket.id === room.creator;
  const isWaiting = room.status === 'waiting';
  const isPlaying = room.status === 'playing';
  const isFinished = room.status === 'finished';

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました', err);
    }
  };

  const getCurrentPlayerTurnsLeft = () => {
    if (room && isPlaying && isCurrentPlayerTurn && room.currentPlayerIndex !== undefined) {
      const currentPlayer = room.players[room.currentPlayerIndex];
      return currentPlayer?.consecutiveTurnsLeft || 0;
    }
    return 0;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-white py-2 px-4 bg-blue-600 rounded-lg shadow mb-4 w-full sm:w-auto text-center">Wiki Game</h1>
        
        <div className="flex flex-wrap justify-center items-center gap-3 w-full">
          <div className="relative text-sm bg-gray-100 px-3 py-2 rounded text-gray-800">
            部屋ID: 
            <button 
              onClick={copyRoomId}
              className="font-mono ml-1 px-1 cursor-pointer hover:bg-gray-200 rounded focus:outline-none"
              aria-label="部屋IDをコピー"
              title="クリックしてコピー"
            >
              {roomId}
            </button>
            {copied && (
              <span className="absolute -bottom-6 left-0 bg-green-100 text-green-800 text-xs py-1 px-2 rounded">
                コピーしました！
              </span>
            )}
          </div>
          
          {isWaiting && isGameCreator && (
            <button
              onClick={startGame}
              disabled={room.players.length < 2}
              className={`${
                room.players.length < 2 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              } text-white px-4 py-2 rounded`}
            >
              ゲーム開始
            </button>
          )}
        </div>
        
        {isWaiting && isGameCreator && room.players.length < 2 && (
          <div className="text-sm bg-red-100 px-3 py-2 rounded text-red-800 mt-3 text-center max-w-md">
            ゲームを開始するには2人以上のプレイヤーが必要です
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <PlayerList room={room} currentPlayerId={socket.id || ''} />

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-2 text-gray-900">ゲーム状態</h2>
            <div className="mt-2">
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  isWaiting
                    ? 'bg-yellow-100 text-yellow-800'
                    : isPlaying
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isWaiting ? '待機中' : isPlaying ? 'プレイ中' : '終了'}
              </span>
            </div>

            {isWaiting && (
              <div className="mt-4">
                <p className="text-gray-600 text-sm">
                  {isGameCreator
                    ? 'ゲームを開始するには「ゲーム開始」ボタンをクリックしてください。'
                    : '部屋の作成者がゲームを開始するのを待っています。'}
                </p>
              </div>
            )}

            {isFinished && (
              <div className="mt-4">
                <button
                  onClick={startGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                  新しいゲームを開始
                </button>
              </div>
            )}
            
            {/* 自分の番かつゲーム進行中かつ連続ターンが残っている場合に連続ターン設定を表示 */}
            {isPlaying && isCurrentPlayerTurn && getCurrentPlayerTurnsLeft() > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-semibold mb-2 text-gray-800">連続ターン設定</h3>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={useContinuousTurn}
                    onChange={toggleContinuousTurn}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">
                    次の手番も自分の手番にする（残り{getCurrentPlayerTurnsLeft()}回）
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          {isWaiting && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">ゲーム開始を待っています</h2>
              <p className="text-gray-600">
                参加者全員がゲームの準備ができたら、部屋の作成者がゲームを開始できます。
              </p>
            </div>
          )}

          {isPlaying && room.currentPage && (
            <WikipediaPage pageName={room.currentPage} />
          )}

          {isFinished && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">ゲーム終了!</h2>
              
              {/* 勝者の情報を表示 */}
              {room.players.find(p => p.isWinner) && (
                <>
                  <p className="text-xl mb-2 text-gray-900">
                    <span className="font-bold">{room.players.find(p => p.isWinner)?.name}</span> さんの勝利です!
                  </p>
                  <p className="text-md mb-6 text-gray-700">
                    ゴールページ「<span className="font-medium">{room.players.find(p => p.isWinner)?.goalPage}</span>」に到達しました
                  </p>
                </>
              )}
              
              <p className="text-gray-600">
                新しいゲームを開始するには「新しいゲームを開始」ボタンをクリックしてください。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 