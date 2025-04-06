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

  // ページタイトルを正規化する関数
  const normalizePageTitle = (title: string): string => {
    if (!title) return '';
    // 空白を削除し、小文字に変換
    return title.trim().toLowerCase()
      // 括弧内の注釈（地名など）を削除
      .replace(/\s*\([^)]*\)\s*/g, '')
      // 特殊文字と記号を削除
      .replace(/[・.,:;'"!?_\-\s]/g, '');
  };

  if (!socket || !room) {
    return <div className="p-8 text-center text-gray-800">読み込み中...</div>;
  }

  const isCurrentPlayerTurn = room.status === 'playing' && 
    socket.id === room.players[room.currentPlayerIndex]?.id;

  const isGameCreator = socket.id === room.creator;
  const isWaiting = room.status === 'waiting';
  const isPlaying = room.status === 'playing';
  const isFinished = room.status === 'finished';
  const isCooperativeMode = room.gameMode === 'cooperative';
  
  // 勝者が存在するかチェック
  const winner = room.players.find(p => p.isWinner);
  const allPlayersWon = isCooperativeMode && room.players.every(p => p.isWinner);

  // 現在のページがプレイヤーのゴールページと一致するかチェック
  const isGoalReached = isPlaying && (
    isCooperativeMode 
      ? normalizePageTitle(room.currentPage) === normalizePageTitle(room.commonGoalPage || '') || 
        room.currentPage === room.commonGoalPage
      : room.players.some(player => {
          if (player.id !== socket.id) return false;
          
          const normalizedCurrentPage = normalizePageTitle(room.currentPage);
          const normalizedGoalPage = normalizePageTitle(player.goalPage);
          
          return normalizedCurrentPage === normalizedGoalPage || room.currentPage === player.goalPage;
        })
  );

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
            <div className="flex justify-between items-center mb-2">
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
              
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  isCooperativeMode
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {isCooperativeMode ? '協力モード' : '対戦モード'}
              </span>
            </div>
            
            {/* 協力モードの場合、残りターン数を表示 */}
            {isPlaying && isCooperativeMode && (
              <div className="mt-2 mb-4">
                <div className="bg-gray-100 p-2 rounded-md">
                  <p className="text-sm font-medium text-gray-700">残りターン数: <span className={`font-bold ${room.totalTurnsLeft && room.totalTurnsLeft <= 2 ? 'text-red-600' : ''}`}>{room.totalTurnsLeft}</span>/{room.maxTotalTurns}</p>
                  <p className="text-xs text-gray-600 mt-1">全員で協力して共通ゴールを目指します</p>
                </div>
              </div>
            )}

            {/* 協力モードかつプレイ中の場合、共通ゴールを表示 */}
            {isCooperativeMode && (
              <div className="mt-2 mb-4">
                <div className="bg-purple-50 p-2 rounded-md border border-purple-100">
                  <p className="text-sm font-medium text-purple-800">共通ゴール:</p>
                  <p className="text-base font-bold text-purple-900 mt-1">{room.commonGoalPage}</p>
                  {room.commonGoalDescription && (
                    <p className="text-xs text-purple-700 mt-1">{room.commonGoalDescription.substring(0, 100)}{room.commonGoalDescription.length > 100 ? '...' : ''}</p>
                  )}
                </div>
              </div>
            )}

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
            
            {/* 自分の番かつゲーム進行中かつ連続ターンが残っている場合に連続ターン設定を表示
                 ただし、協力モードでは連続ターン設定を表示しない */}
            {isPlaying && isCurrentPlayerTurn && getCurrentPlayerTurnsLeft() > 0 && !isCooperativeMode && (
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
              {isCooperativeMode && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-purple-800 font-medium">協力モード</p>
                  <p className="text-sm text-purple-700 mt-2">全員で力を合わせて共通の目標ページに合計{room.maxTotalTurns}ターン以内に到達を目指します。</p>
                </div>
              )}
            </div>
          )}

          {isPlaying && !isGoalReached && room.currentPage && (
            <WikipediaPage pageName={room.currentPage} />
          )}

          {(isFinished || isGoalReached) && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">ゲーム終了!</h2>
              
              {/* 勝者の情報を表示（協力モードと対戦モードで分ける） */}
              {isCooperativeMode ? (
                // 協力モードの結果表示
                allPlayersWon ? (
                  <>
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-xl text-green-800 font-bold">チームの勝利！</p>
                      <p className="text-md mt-2 text-green-700">
                        ゴールページ「<span className="font-medium">{room.commonGoalPage}</span>」に到達しました！
                      </p>
                      <p className="text-sm mt-2 text-green-600">
                        使用ターン数: {room.maxTotalTurns && room.totalTurnsLeft !== undefined ? room.maxTotalTurns - room.totalTurnsLeft : '不明'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-red-50 p-4 rounded-lg mb-4">
                      <p className="text-xl text-red-800 font-bold">ターン切れ...</p>
                      <p className="text-md mt-2 text-red-700">
                        規定のターン数内にゴールページ「<span className="font-medium">{room.commonGoalPage}</span>」に到達できませんでした
                      </p>
                    </div>
                  </>
                )
              ) : (
                // 対戦モードの結果表示
                (winner || (isGoalReached && room.players.find(p => p.id === socket.id))) && (
                  <>
                    <p className="text-xl mb-2 text-gray-900">
                      <span className="font-bold">
                        {winner ? winner.name : room.players.find(p => p.id === socket.id)?.name}
                      </span> さんの勝利です!
                    </p>
                    <p className="text-md mb-6 text-gray-700">
                      ゴールページ「<span className="font-medium">
                        {winner ? winner.goalPage : room.players.find(p => p.id === socket.id)?.goalPage}
                      </span>」に到達しました
                    </p>
                  </>
                )
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