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
        setContent(data.content);
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
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="text-sm text-gray-500">目標: {goalTitle}</div>
      </div>
      <div
        id="wikipedia-content"
        className="prose max-w-none"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(content) 
        }}
      />
    </div>
  );
}; 