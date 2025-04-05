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
  goalDescription: string;
}

export const SoloGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    startPage: '',
    goalPage: '',
    currentPage: '',
    clicksRemaining: 6,
    maxClicks: 6,
    gameStatus: 'playing',
    visitedPages: [],
    goalDescription: ''
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
      
      // 目標ページの説明を取得
      const goalDescResponse = await fetch(`/api/wikipedia?title=${encodeURIComponent(goalPage)}`);
      let goalDescription = '';
      
      if (goalDescResponse.ok) {
        const data = await goalDescResponse.json();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.content;
        
        // 最初の段落を抽出（HTMLタグを除去）
        const firstParagraph = tempDiv.querySelector('p');
        if (firstParagraph) {
          goalDescription = firstParagraph.textContent?.trim() || '';
          // 説明が長すぎる場合は切り詰める
          if (goalDescription.length > 150) {
            goalDescription = goalDescription.substring(0, 150) + '...';
          }
        }
      }
      
      setGameState({
        startPage,
        goalPage,
        currentPage: startPage,
        clicksRemaining: 6,
        maxClicks: 6,
        gameStatus: 'playing',
        visitedPages: [startPage],
        goalDescription
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
        <div className="text-red-500 mb-4 font-bold text-lg">{error}</div>
        <button 
          onClick={initGame}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
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
        <p className="mb-2 text-lg text-black">
          {gameState.maxClicks - gameState.clicksRemaining}回のクリックで
          「{gameState.goalPage}」に到達しました！
        </p>
        <div className="mb-6">
          <p className="font-semibold text-black">移動経路:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {gameState.visitedPages.map((page, index) => (
              <div key={index} className="flex items-center">
                <span 
                  className={`px-2 py-1 rounded text-black font-medium ${
                    page === gameState.goalPage 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100'
                  }`}
                >
                  {page}
                </span>
                {index < gameState.visitedPages.length - 1 && (
                  <span className="mx-1 text-black">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={handleReplay} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
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
        <p className="mb-2 text-lg text-black">
          残念！6回のクリックでは「{gameState.goalPage}」に到達できませんでした。
        </p>
        <div className="mb-6">
          <p className="font-semibold text-black">移動経路:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {gameState.visitedPages.map((page, index) => (
              <div key={index} className="flex items-center">
                <span className="px-2 py-1 bg-gray-100 rounded text-black font-medium">{page}</span>
                {index < gameState.visitedPages.length - 1 && (
                  <span className="mx-1 text-black">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={handleReplay} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
        >
          もう一度挑戦
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">一人用モード - ウィキペディアチャレンジ</h1>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
          残りクリック回数: {gameState.clicksRemaining}
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-200">
        <p className="text-sm text-black font-medium">
          <strong>ルール:</strong> 「{gameState.startPage}」から始めて、6回以内のクリックで「{gameState.goalPage}」に到達しましょう。
        </p>
      </div>
      
      {/* 目標の説明 */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <h3 className="text-blue-800 font-bold text-sm mb-1">目標ページの説明:</h3>
        <p className="text-sm text-black" data-testid="goal-description">
          {gameState.goalDescription ? gameState.goalDescription : '目標ページに関する情報を読み込み中...'}
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <WikiSoloPage
          title={gameState.currentPage}
          goalTitle={gameState.goalPage}
          onLinkClick={handleLinkClick}
        />
      </div>
    </div>
  );
}; 