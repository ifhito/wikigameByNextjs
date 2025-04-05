import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Spinner } from './Spinner';

interface WikiSoloPageProps {
  title: string;
  goalTitle: string;
  onLinkClick: (title: string) => void;
}

export const WikiSoloPage: React.FC<WikiSoloPageProps> = ({ 
  title, 
  goalTitle,
  onLinkClick
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWikiPage = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wikipedia?title=${encodeURIComponent(title)}`);
        
        if (!response.ok) {
          throw new Error('ページの取得に失敗しました');
        }
        
        const data = await response.json();
        
        // HTML要素を処理して本文のみを抽出
        const cleanedContent = cleanWikipediaContent(data.content);
        setContent(cleanedContent);
        setError(null);
      } catch (err) {
        console.error('Wikipediaページの取得エラー:', err);
        setError('ページの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchWikiPage();
  }, [title]);

  // Wikipediaコンテンツから本文のみを抽出する関数
  const cleanWikipediaContent = (htmlContent: string): string => {
    // 一時的なDOMを作成してHTMLを解析
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);

    // 不要な要素を削除
    removeUnwantedElements(tempDiv);
    
    return tempDiv.innerHTML;
  };

  // 不要な要素を削除する関数
  const removeUnwantedElements = (element: HTMLElement) => {
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
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'A') {
      e.preventDefault();
      const link = target as HTMLAnchorElement;
      const href = link.getAttribute('href');
      
      if (href && href.startsWith('/wiki/')) {
        const newTitle = decodeURIComponent(href.replace('/wiki/', ''));
        onLinkClick(newTitle);
      }
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="wiki-container">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <div className="text-sm text-gray-700 font-medium">目標: {goalTitle}</div>
      </div>
      <div
        id="wikipedia-content"
        className="prose max-w-none text-black wiki-content"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ 
          __html: content
        }}
      />
      
      <style jsx global>{`
        .wiki-content a {
          color: #0366d6 !important;
          text-decoration: underline !important;
        }
        
        .wiki-content a:hover {
          color: #0056b3 !important;
        }
        
        .wiki-content p, .wiki-content div, .wiki-content span, .wiki-content li {
          color: #333 !important;
        }
        
        .wiki-content h1, .wiki-content h2, .wiki-content h3, .wiki-content h4, .wiki-content h5 {
          color: #000 !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
          font-weight: bold !important;
        }
        
        /* 参考文献や外部リンクセクションを非表示 */
        .wiki-content .reflist,
        .wiki-content .references,
        .wiki-content .external {
          display: none !important;
        }
      `}</style>
    </div>
  );
}; 