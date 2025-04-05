import React, { useEffect, useState } from 'react';
import { WikiSoloPage } from '../components/WikiSoloPage';
import { Spinner } from '../components/Spinner';

interface GameState {
  startPage: string;
  goalPage: string;
  currentPage: string;
  clicksRemaining: number;
  maxClicks: number;
  gameStatus: 'playing' | 'won' | 'lost';
  visitedPages: string[];
}

export const SoloGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    startPage: '',
    goalPage: '',
    currentPage: '',
    clicksRemaining: 6,
    maxClicks: 6,
    gameStatus: 'playing',
    visitedPages: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ゲームの初期化
  const initGame = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wikipedia/random');
      
      if (!response.ok) {
        throw new Error('ゲーム開始に失敗しました');
      }
      
      const { startPage, goalPage } = await response.json();
      
      setGameState({
        startPage,
        goalPage,
        currentPage: startPage,
        clicksRemaining: 6,
        maxClicks: 6,
        gameStatus: 'playing',
        visitedPages: [startPage]
      });
      setError(null);
    } catch (err) {
      console.error('ゲーム初期化エラー:', err);
      setError('ゲームの開始に失敗しました。再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  };

  // ゲーム開始時に初期化
  useEffect(() => {
    initGame();
  }, []);

  // リンクをクリックした時の処理
  const handleLinkClick = (newTitle: string) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const newClicksRemaining = gameState.clicksRemaining - 1;
    const isGoalReached = newTitle === gameState.goalPage;
    
    // 新しいゲーム状態を設定
    setGameState(prevState => ({
      ...prevState,
      currentPage: newTitle,
      clicksRemaining: newClicksRemaining,
      gameStatus: isGoalReached 
        ? 'won' 
        : (newClicksRemaining <= 0 ? 'lost' : 'playing'),
      visitedPages: [...prevState.visitedPages, newTitle]
    }));
  };

  // リプレイボタンのハンドラ
  const handleReplay = () => {
    initGame();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={initGame}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    );
  }

  // 結果画面の表示
  if (gameState.gameStatus === 'won') {
    return (
      <div className="text-center py-10">
        <h2 className="text-3xl font-bold text-green-600 mb-4">Congratulations! 🎉</h2>
        <p className="mb-2">
          {gameState.maxClicks - gameState.clicksRemaining}回のクリックで
          「{gameState.goalPage}」に到達しました！
        </p>
        <div className="mb-6">
          <p className="font-semibold">移動経路:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {gameState.visitedPages.map((page, index) => (
              <div key={index} className="flex items-center">
                <span 
                  className={`px-2 py-1 rounded ${
                    page === gameState.goalPage 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100'
                  }`}
                >
                  {page}
                </span>
                {index < gameState.visitedPages.length - 1 && (
                  <span className="mx-1">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={handleReplay} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          もう一度挑戦
        </button>
      </div>
    );
  }

  if (gameState.gameStatus === 'lost') {
    return (
      <div className="text-center py-10">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Fail</h2>
        <p className="mb-2">
          残念！6回のクリックでは「{gameState.goalPage}」に到達できませんでした。
        </p>
        <div className="mb-6">
          <p className="font-semibold">移動経路:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {gameState.visitedPages.map((page, index) => (
              <div key={index} className="flex items-center">
                <span className="px-2 py-1 bg-gray-100 rounded">{page}</span>
                {index < gameState.visitedPages.length - 1 && (
                  <span className="mx-1">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={handleReplay} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          もう一度挑戦
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">一人用モード - ウィキペディアチャレンジ</h1>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
          残りクリック回数: {gameState.clicksRemaining}
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-sm">
          <strong>ルール:</strong> 「{gameState.startPage}」から始めて、6回以内のクリックで「{gameState.goalPage}」に到達しましょう。
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <WikiSoloPage
          title={gameState.currentPage}
          goalTitle={gameState.goalPage}
          onLinkClick={handleLinkClick}
        />
      </div>
    </div>
  );
}; 