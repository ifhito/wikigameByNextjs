'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Spinner } from './Spinner';

interface WikipediaPageProps {
  pageName: string;
}

export function WikipediaPage({ pageName }: WikipediaPageProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectPage } = useSocket();

  // メモ化されたページ選択ハンドラー
  const handlePageSelect = useCallback((newPageName: string) => {
    try {
      console.log('Selecting page:', newPageName);
      selectPage(newPageName);
    } catch (err) {
      console.error('Error selecting page:', err);
      setError('ページ選択中にエラーが発生しました。再読み込みしてください。');
    }
  }, [selectPage]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!pageName) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // タイトルを正しくエンコードしてAPIにリクエストする
        const encodedTitle = encodeURIComponent(pageName);
        console.log(`Fetching Wikipedia content for: ${pageName} (encoded: ${encodedTitle})`);
        
        const response = await fetch(`/api/wikipedia?title=${encodedTitle}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}):`, errorText);
          throw new Error(`ページ取得に失敗しました (${response.status})`);
        }
        
        const data = await response.json();
        
        if (!data.content) {
          console.error('API response has no content:', data);
          throw new Error('コンテンツが取得できませんでした');
        }
        
        setContent(data.content);
        console.log('Wikipedia content loaded successfully');
      } catch (err) {
        console.error('Error fetching Wikipedia content:', err);
        setError('コンテンツの取得中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [pageName]);

  useEffect(() => {
    if (!content) return;

    console.log('Rendering Wikipedia content to DOM');
    
    // コンテンツがロードされたらリンクにイベントリスナーを追加
    const contentDiv = document.getElementById('wikipedia-content');
    if (!contentDiv) {
      console.error('wikipedia-content element not found in the DOM');
      return;
    }

    // 既存のコンテンツをクリア
    contentDiv.innerHTML = content;

    // 画像をクリックできないようにする
    const images = contentDiv.querySelectorAll('img');
    images.forEach((img) => {
      img.style.pointerEvents = 'none';
      img.classList.add('cursor-not-allowed');
    });

    // すべてのイベントリスナーを保存するための配列
    const eventCleanups: Array<() => void> = [];

    // ウィキペディア内部リンクにクリックイベントを追加
    const links = contentDiv.querySelectorAll('a');
    links.forEach((link) => {
      // 外部リンクの場合はイベントを追加しない
      if (link.getAttribute('href')?.startsWith('http')) {
        const handlePreventDefault = (e: Event) => {
          e.preventDefault();
        };
        link.addEventListener('click', handlePreventDefault);
        eventCleanups.push(() => link.removeEventListener('click', handlePreventDefault));
        link.classList.add('text-gray-400', 'cursor-not-allowed');
        return;
      }
      
      // 内部リンクの場合は新しいページへのリンクとして処理
      const handleInternalLink = (e: Event) => {
        e.preventDefault();
        
        // href属性からページ名を取得
        const href = link.getAttribute('href');
        if (!href) return;
        
        // ページ名の抽出
        let newPageName = href;
        if (href.startsWith('/wiki/')) {
          newPageName = href.substring(6);
        }
        
        // URLエンコードされているのでデコード
        newPageName = decodeURIComponent(newPageName);
        
        // 特殊ページやカテゴリページはスキップ
        if (
          newPageName.startsWith('Special:') ||
          newPageName.startsWith('Category:') ||
          newPageName.startsWith('Help:') ||
          newPageName.startsWith('Wikipedia:') ||
          newPageName.startsWith('Talk:') ||
          newPageName.startsWith('User:') ||
          newPageName.startsWith('Template:') ||
          newPageName.startsWith('File:') ||
          newPageName.includes(':')
        ) {
          return;
        }
        
        console.log('Navigating to Wikipedia page:', newPageName);
        // ページ選択
        handlePageSelect(newPageName);
      };
      
      link.addEventListener('click', handleInternalLink);
      eventCleanups.push(() => link.removeEventListener('click', handleInternalLink));
      
      // スタイル調整
      link.classList.add('text-blue-500', 'hover:underline');
    });
    
    // 目次のトグル処理
    const tocToggle = contentDiv.querySelector('.toctoggle');
    if (tocToggle) {
      const handleTocToggle = (e: Event) => {
        e.preventDefault();
        const toc = contentDiv.querySelector('.toc');
        if (toc) {
          toc.classList.toggle('hidden');
        }
      };
      
      tocToggle.addEventListener('click', handleTocToggle);
      eventCleanups.push(() => tocToggle.removeEventListener('click', handleTocToggle));
    }
    
    // クリーンアップ関数
    return () => {
      console.log('Cleaning up Wikipedia content event listeners');
      eventCleanups.forEach(cleanup => cleanup());
    };
    
  }, [content, handlePageSelect]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="wikipedia-container p-4 bg-white rounded shadow overflow-y-auto max-h-[calc(100vh-200px)]">
      <div id="wikipedia-content" className="wikipedia-content prose max-w-none" />
    </div>
  );
} 