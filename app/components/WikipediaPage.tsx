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
  const { selectPage, socket, room } = useSocket();

  // 過去に取得したページのキャッシュ
  const [pageCache, setPageCache] = useState<Record<string, string>>({});

  // 現在のプレイヤーが手番かどうかを判断
  const isCurrentPlayerTurn = useCallback(() => {
    if (!socket || !room || room.status !== 'playing') {
      return false;
    }
    
    const currentPlayerId = socket.id;
    const currentPlayerIndex = room.currentPlayerIndex;
    
    return currentPlayerId === room.players[currentPlayerIndex]?.id;
  }, [socket, room]);

  // パターンに一致する段落または要素を非表示にする
  const removeMatchingElements = (element: Element): void => {
    // ...existing code...
  };

  // ページタイトルを正規化する関数（サーバー側と同じロジック）
  const normalizePageTitle = (title: string): string => {
    if (!title) return '';
    // 空白を削除し、小文字に変換
    return title.trim().toLowerCase()
      // 括弧内の注釈（地名など）を削除
      .replace(/\s*\([^)]*\)\s*/g, '')
      // 特殊文字と記号を削除
      .replace(/[・.,:;'"!?_\-\s]/g, '');
  };

  // メモ化されたページ選択ハンドラー
  const handlePageSelect = useCallback((newPageName: string) => {
    // 手番でない場合は何もしない
    if (!isCurrentPlayerTurn()) {
      console.log('Not your turn, cannot select page');
      return;
    }
    
    try {
      console.log('Selecting page:', newPageName);

      // 現在のプレイヤーを取得
      if (socket && room) {
        const currentPlayer = room.players[room.currentPlayerIndex];
        
        // 選択したページがゴールページと一致するか確認
        if (currentPlayer) {
          const normalizedNewPage = normalizePageTitle(newPageName);
          const normalizedGoalPage = normalizePageTitle(currentPlayer.goalPage);
          
          console.log(`Client comparing: "${newPageName}" (${normalizedNewPage}) with goal "${currentPlayer.goalPage}" (${normalizedGoalPage})`);
          
          if (normalizedNewPage === normalizedGoalPage || newPageName === currentPlayer.goalPage) {
            console.log('Goal page reached! Game finished.');
          }
        }
      }
      
      selectPage(newPageName);
    } catch (err) {
      console.error('Error selecting page:', err);
      setError('ページ選択中にエラーが発生しました。再読み込みしてください。');
    }
  }, [selectPage, isCurrentPlayerTurn, socket, room]);

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
      '.tmbox', // テンプレートメッセージボックス
      '.cmbox', // コンテンツメッセージボックス
      '.ombox', // オブジェクトメッセージボックス
      '.dmbox', // 議論メッセージボックス
      '.fmbox', // ファイルメッセージボックス
      '.smbox', // スタイルメッセージボックス
      '.imbox', // 画像メッセージボックス
      '.thumb', // サムネイル（画像）
      '.infobox', // 情報ボックス
      '.navbox', // ナビゲーションボックス
      'table.vertical-navbox', // 縦型ナビゲーションボックス
      'table.metadata', // メタデータテーブル
      '.reference', // 参考文献
      '.references', // 参考文献リスト
      '.reflist', // 参考文献リスト
      '.refbegin', // 参考文献開始
      '.refend', // 参考文献終了
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
      'div[role="note"]', // 注釈役割の要素
      'div[role="complementary"]', // 補完要素
      '.sister-project', // 関連プロジェクト
      '.sistersitebox', // 姉妹サイトボックス
      '.wikisource-inline', // Wikisourceインライン
      '.mw-references-wrap', // 参考文献ラッパー
      '.reference-text', // 参考文献テキスト
      '.citation', // 引用
      'ol.references', // 参考文献順序リスト
      '.printfooter', // 印刷フッター
      '.catlinks', // カテゴリリンク
    ];

    // 指定したセレクタに一致する要素を削除
    selectorsToRemove.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.parentNode?.removeChild(el));
    });

    // 「この項目は〜」で始まるテキストを含む段落を削除
    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim() || '';
      if (
        text.startsWith('この項目は') ||
        text.startsWith('この記事は') ||
        text.includes('関連した書きかけ') ||
        text.includes('加筆する必要が') ||
        text.includes('ノートを参照してください')
      ) {
        p.parentNode?.removeChild(p);
      }
    });

    // 「出典」「参考文献」「外部リンク」などのセクション全体を削除
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const headingText = heading.textContent?.trim().toLowerCase() || '';
      if (
        headingText.includes('出典') ||
        headingText.includes('参考文献') ||
        headingText.includes('外部リンク') ||
        headingText.includes('脚注') ||
        headingText.includes('注釈')
      ) {
        // 見出し自体を削除
        heading.parentNode?.removeChild(heading);
        
        // 次の見出しまでの要素をすべて削除
        let currentNode = heading.nextSibling;
        while (currentNode && 
              !(currentNode instanceof HTMLElement && 
                currentNode.tagName.match(/^H[1-6]$/))) {
          const nextNode = currentNode.nextSibling;
          currentNode.parentNode?.removeChild(currentNode);
          currentNode = nextNode;
        }
      }
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
    const allHeadings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    allHeadings.forEach(heading => {
      // 見出しの中の不要な要素（編集リンクなど）を削除
      const unwantedChildren = heading.querySelectorAll('.mw-headline + *');
      unwantedChildren.forEach(child => child.parentNode?.removeChild(child));
    });
  }, []);

  // コンテンツを取得する関数
  const fetchContent = useCallback(async () => {
    if (!pageName) return;
    
    // キャッシュにあればそれを使用
    if (pageCache[pageName]) {
      console.log(`Using cached content for: ${pageName}`);
      setContent(pageCache[pageName]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // タイトルを正しくエンコードしてAPIにリクエスト
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
      
      // キャッシュに保存
      setPageCache(prev => ({
        ...prev,
        [pageName]: cleanedContent
      }));
      
      setContent(cleanedContent);
      console.log('Wikipedia content loaded successfully');
    } catch (err) {
      console.error('Error fetching Wikipedia content:', err);
      setError('コンテンツの取得中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [pageName, cleanWikipediaContent, pageCache]);

  // ページが変更されたらコンテンツを取得
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // ターンが変更されたときにリンクの状態を更新
  useEffect(() => {
    if (!content || !room) return;
    
    // ルームの状態が変更されたときにリンクを再設定する
    console.log('Room state changed, updating links...');
    
    const contentDiv = document.getElementById('wikipedia-content');
    if (!contentDiv) {
      console.error('wikipedia-content element not found in the DOM');
      return;
    }
    
    // 現在のプレーヤーが手番かどうかを確認
    const isMyTurn = isCurrentPlayerTurn();
    console.log('Is my turn:', isMyTurn);
    
    // ターンインジケーターの表示/非表示
    const container = contentDiv.closest('.wikipedia-container');
    if (container) {
      // 既存のインジケーターを削除
      const existingIndicator = container.querySelector('.turn-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // 新しいインジケーターを作成
      const indicator = document.createElement('div');
      indicator.className = 'turn-indicator fixed top-4 right-4 px-3 py-1 rounded-full text-sm font-bold z-50';
      
      if (isMyTurn) {
        indicator.classList.add('bg-green-100', 'text-green-800', 'border', 'border-green-200');
        indicator.textContent = 'あなたのターンです';
      } else {
        indicator.classList.add('bg-gray-100', 'text-gray-800', 'border', 'border-gray-200');
        indicator.textContent = '相手のターンです';
      }
      
      // インジケーターを追加
      container.prepend(indicator);
    }
    
    // すべてのリンクを取得
    const links = contentDiv.querySelectorAll('a');
    
    // 手番でない場合はリンクをテキストに変換
    if (!isMyTurn) {
      links.forEach((link) => {
        // すでにクラスが適用されていたらスキップ
        if (link.classList.contains('text-gray-600')) return;
        
        // リンクをテキストに変換
        const linkText = link.textContent;
        if (linkText && link.parentNode) {
          const span = document.createElement('span');
          span.className = 'text-gray-600 no-underline';
          span.textContent = linkText;
          link.parentNode.replaceChild(span, link);
        }
      });
    }
    // 自分のターンになった場合、ここでは何もしない
    // 無限ループが発生するため、再フェッチは行わない
  }, [room, content, isCurrentPlayerTurn]);

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

    // 現在のターン状態を確認（再計算を避けるため）
    const isMyTurn = isCurrentPlayerTurn();

    // すべてのイベントリスナーを保存するための配列
    const eventCleanups: Array<() => void> = [];

    // ウィキペディア内部リンクにクリックイベントを追加
    const links = contentDiv.querySelectorAll('a');
    
    // 自分のターンでない場合はすべてのリンクをテキストに変換
    if (!isMyTurn) {
      links.forEach((link) => {
        const linkText = link.textContent;
        if (linkText && link.parentNode) {
          // リンクをテキストノードに置き換え
          const textNode = document.createTextNode(linkText);
          const span = document.createElement('span');
          span.className = 'text-gray-600 no-underline';
          span.appendChild(textNode);
          link.parentNode.replaceChild(span, link);
        }
      });
      // ターンが来るまで待つため、ここで終了
      return;
    }
    
    // 自分のターンの場合のみ以下を実行（これにより、リンクイベントリスナーは自分のターンの時だけ追加される）
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
    
  }, [content, handlePageSelect, isCurrentPlayerTurn]);

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
    <div className="wikipedia-container p-4 bg-white rounded shadow overflow-y-auto max-h-[calc(100vh-200px)] relative">
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
        .wikipedia-content .external,
        .wikipedia-content .reference,
        .wikipedia-content [role="note"],
        .wikipedia-content .mw-references-wrap,
        .wikipedia-content .reference-text,
        .wikipedia-content .citation {
          display: none !important;
        }
        
        /* 手番でないプレイヤーのスタイル */
        .text-gray-600.no-underline {
          color: #666 !important;
          cursor: default;
        }
        
        /* ターンインジケーター */
        .turn-indicator {
          animation: fadeIn 0.5s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
} 