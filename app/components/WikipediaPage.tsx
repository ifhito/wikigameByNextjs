'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface WikipediaPageProps {
  title: string;
  isCurrentPlayer: boolean;
}

interface WikipediaData {
  title: string;
  content: string;
  links: { title: string; ns: number }[];
}

export const WikipediaPage: React.FC<WikipediaPageProps> = ({ title, isCurrentPlayer }) => {
  const { selectPage, canUseContinuousTurn, room } = useSocket();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<WikipediaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useContinuousTurn, setUseContinuousTurn] = useState<boolean>(false);

  // 現在のプレイヤーの連続ターン残り回数を取得
  const currentPlayerTurnsLeft = room && room.currentPlayerIndex !== undefined && 
    room.players[room.currentPlayerIndex]?.consecutiveTurnsLeft || 0;

  useEffect(() => {
    if (!title) return;

    setLoading(true);
    setError(null);

    // Wikipediaのデータを取得
    const fetchWikipediaData = async () => {
      try {
        const response = await fetch(`/api/wikipedia?title=${encodeURIComponent(title)}`);
        
        if (!response.ok) {
          throw new Error('ページの取得に失敗しました');
        }
        
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error('Error fetching Wikipedia page:', error);
        setError('ページの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWikipediaData();
  }, [title]);

  // WikipediaのHTMLをレンダリングする際に、リンクのクリック処理を追加
  useEffect(() => {
    if (!data) return;

    const contentDiv = document.getElementById('wikipedia-content');
    if (!contentDiv) return;

    // Wikipediaコンテンツのテキストカラーを調整
    contentDiv.classList.add('text-gray-900');

    // リンクの処理を追加
    const links = contentDiv.querySelectorAll('a');
    links.forEach((link) => {
      // リンクがwikipedia内のリンクかどうかを確認
      if (link.getAttribute('href')?.startsWith('/wiki/')) {
        // 自分の番の時だけリンクをクリック可能に
        if (isCurrentPlayer) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('title') || link.textContent;
            if (pageName) {
              selectPage(pageName, useContinuousTurn);
            }
          });
          
          // リンクのスタイルを通常のリンクに
          link.classList.add('text-blue-600', 'cursor-pointer', 'hover:underline');
        } else {
          // 他プレイヤーの番の時はリンクを非活性化
          link.classList.add('text-blue-400', 'cursor-not-allowed');
          link.style.pointerEvents = 'none';
        }
      } else {
        // 外部リンクは常に無効
        link.classList.add('text-gray-400', 'cursor-not-allowed');
        link.style.pointerEvents = 'none';
      }
    });
  }, [data, isCurrentPlayer, selectPage, useContinuousTurn]);

  if (loading) {
    return <div className="p-4 text-center text-gray-800">ページを読み込み中...</div>;
  }

  if (error || !data) {
    return <div className="p-4 text-center text-red-500">エラー: {error || 'ページが見つかりません'}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-auto max-h-[calc(100vh-200px)]">
      {/* ヘッダー部分（タイトルと連続ターンボタン） */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
        
        {/* 自分の番かつ連続ターンが使用可能な時にのみ表示 */}
        {isCurrentPlayer && canUseContinuousTurn && (
          <div className="flex items-center">
            <button
              onClick={() => setUseContinuousTurn(!useContinuousTurn)}
              className={`px-3 py-1 rounded-md text-sm font-medium shadow-sm transition-colors flex items-center ${
                useContinuousTurn 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{useContinuousTurn ? '連続ターン：ON' : '連続ターン：OFF'}</span>
              <span className="text-xs bg-white bg-opacity-20 rounded-full px-2 py-0.5">残り{currentPlayerTurnsLeft}回</span>
            </button>
          </div>
        )}
      </div>
      
      {/* 他プレイヤーの番の時は通知を表示 */}
      {!isCurrentPlayer && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 font-medium">他のプレイヤーの番です。あなたの番になるまでお待ちください。</p>
        </div>
      )}
      
      <div 
        id="wikipedia-content"
        className="prose max-w-none text-gray-900"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
    </div>
  );
}; 