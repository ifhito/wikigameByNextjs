'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Spinner } from './Spinner';
import DOMPurify from 'dompurify';

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

  // Wikipediaコンテンツから本文のみを抽出する関数
  const cleanWikipediaContent = useCallback((htmlContent: string): string => {
    // 一時的なDOMを作成してHTMLを解析
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);

    // 不要な要素を削除
    removeUnwantedElements(tempDiv);
    
    return tempDiv.innerHTML;
  }, []);

  // 不要な要素を削除する関数
  const removeUnwantedElements = useCallback((element: HTMLElement) => {
    // 削除する要素のセレクタリスト
    const selectorsToRemove = [
      '.toc', // 目次
      '.mw-editsection', // 編集リンク
      '.ambox', // 警告ボックス
      '.thumb', // サムネイル（画像）
      '.infobox', // 情報ボックス
      '.navbox', // ナビゲーションボックス
      'table.vertical-navbox', // 縦型ナビゲーションボックス
      'table.metadata', // メタデータテーブル
      '.reference', // 参考文献
      '.references', // 参考文献リスト
      '.noprint', // 印刷時に表示しない要素
      '.hatnote', // 帽子メモ
      '.mw-empty-elt', // 空の要素
      '.external', // 外部リンク
      '#References', // 参考文献見出し
      '#External_links', // 外部リンク見出し
      '.error', // エラーメッセージ
      '.mw-jump-link', // ジャンプリンク
      '#toc', // 目次ID
      '.mw-headline', // 見出しリンク
      '.portal-bar', // ポータルバー
      '.navigation-not-searchable', // 検索不可ナビゲーション
      '.mbox-small', // 小さいメッセージボックス
      '.shortdescription', // 短い説明
      '.side-box', // サイドボックス
    ];

    // 指定したセレクタに一致する要素を削除
    selectorsToRemove.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.parentNode?.removeChild(el));
    });

    // 外部リンク（aタグでhttpから始まるもの）の親要素内のテキストは残す
    const externalLinks = element.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
      // リンクのテキストを抽出
      const linkText = link.textContent;
      // リンクをテキストノードに置き換え
      if (linkText && link.parentNode) {
        const textNode = document.createTextNode(linkText);
        link.parentNode.replaceChild(textNode, link);
      }
    });

    // 見出しのセクション（hタグ）は見出しテキストのみ残す
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      // 見出しの中の不要な要素（編集リンクなど）を削除
      const unwantedChildren = heading.querySelectorAll('.mw-headline + *');
      unwantedChildren.forEach(child => child.parentNode?.removeChild(child));
    });
  }, []);

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
        
        // コンテンツをクリーニングして本文のみ抽出
        const cleanedContent = cleanWikipediaContent(data.content);
        setContent(cleanedContent);
        console.log('Wikipedia content loaded successfully');
      } catch (err) {
        console.error('Error fetching Wikipedia content:', err);
        setError('コンテンツの取得中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [pageName, cleanWikipediaContent]);

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
      <div id="wikipedia-content" className="wikipedia-content prose max-w-none text-black" />
      
      {/* スタイル調整 */}
      <style jsx global>{`
        .wikipedia-content a {
          color: #0366d6 !important;
          text-decoration: underline !important;
        }
        
        .wikipedia-content a:hover {
          color: #0056b3 !important;
        }
        
        .wikipedia-content p, .wikipedia-content div, .wikipedia-content span, .wikipedia-content li {
          color: #333 !important;
        }
        
        .wikipedia-content h1, .wikipedia-content h2, .wikipedia-content h3, .wikipedia-content h4, .wikipedia-content h5 {
          color: #000 !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
          font-weight: bold !important;
        }
        
        /* 参考文献や外部リンクセクションを非表示 */
        .wikipedia-content .reflist,
        .wikipedia-content .references,
        .wikipedia-content .external {
          display: none !important;
        }
      `}</style>
    </div>
  );
} 