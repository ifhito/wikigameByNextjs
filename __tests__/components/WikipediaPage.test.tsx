import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { WikipediaPage } from '../../app/components/WikipediaPage';
import { useSocket } from '../../app/contexts/SocketContext';
import '@testing-library/jest-dom';

// Socket関連のモック
jest.mock('../../app/contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

// fetchのモック
global.fetch = jest.fn();

describe('WikipediaPage', () => {
  // テスト前に毎回モックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトでuseSocketモックの戻り値を設定
    (useSocket as jest.Mock).mockReturnValue({
      selectPage: jest.fn(),
    });

    // fetchのモックのデフォルト設定
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '<div>Wikipedia content</div>',
      }),
    });

    // DOMのモック
    document.body.innerHTML = '<div id="wikipedia-content"></div>';
  });

  // 1. 基本的なレンダリングのテスト
  it('renders loading spinner initially', () => {
    render(<WikipediaPage pageName="Test Page" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // 2. コンテンツ取得成功時のテスト
  it('renders content when fetch is successful', async () => {
    render(<WikipediaPage pageName="Test Page" />);
    
    // ロード中のスピナーが表示されることを確認
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // コンテンツが表示されるのを待つ
    await waitFor(() => {
      const contentElement = document.getElementById('wikipedia-content');
      expect(contentElement).not.toBeNull();
      expect(contentElement?.innerHTML).toBe('<div>Wikipedia content</div>');
    });
  });

  // 3. コンテンツ取得失敗時のテスト
  it('renders error message when fetch fails', async () => {
    // fetchのモックをエラーを返すように設定
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue('Not found'),
    });
    
    render(<WikipediaPage pageName="Non-existent Page" />);
    
    // エラーメッセージが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/コンテンツの取得中にエラーが発生しました/)).toBeInTheDocument();
    });
  });

  // 4. コンテンツが空の場合のテスト
  it('renders error message when content is empty', async () => {
    // 空のコンテンツを返すようにモック
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: '',
      }),
    });
    
    render(<WikipediaPage pageName="Empty Page" />);
    
    // エラーメッセージが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/コンテンツの取得中にエラーが発生しました/)).toBeInTheDocument();
    });
  });

  // 5. 内部リンククリック時のページ選択機能テスト
  it('calls selectPage when internal link is clicked', async () => {
    const selectPageMock = jest.fn();
    (useSocket as jest.Mock).mockReturnValue({
      selectPage: selectPageMock,
    });

    // リンクを含むHTMLコンテンツを返すモック
    const contentWithLinks = `
      <div>
        <a href="/wiki/Internal_Page">Internal Link</a>
        <a href="https://external.com">External Link</a>
      </div>
    `;
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: contentWithLinks,
      }),
    });
    
    render(<WikipediaPage pageName="Page With Links" />);
    
    // コンテンツがロードされるのを待つ
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Internal Link');
    });
    
    // 内部リンクを見つけてクリック
    const internalLink = document.querySelector('a[href="/wiki/Internal_Page"]');
    if (internalLink) {
      fireEvent.click(internalLink);
      expect(selectPageMock).toHaveBeenCalledWith('Internal_Page');
    } else {
      fail('Internal link not found');
    }
    
    // 外部リンクがクリックされても選択関数は呼ばれない
    const externalLink = document.querySelector('a[href="https://external.com"]');
    if (externalLink) {
      fireEvent.click(externalLink);
      expect(selectPageMock).toHaveBeenCalledTimes(1); // 内部リンクのクリックだけがカウントされる
    } else {
      fail('External link not found');
    }
  });

  // 6. ページ名が変更された場合のテスト
  it('fetches new content when pageName prop changes', async () => {
    const { rerender } = render(<WikipediaPage pageName="First Page" />);
    
    // 最初のページのコンテンツが取得されるのを待つ
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('First%20Page'));
    });
    
    // ページ名を変更してコンポーネントを再レンダリング
    rerender(<WikipediaPage pageName="Second Page" />);
    
    // 新しいページのコンテンツが取得されるのを待つ
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('Second%20Page'));
    });
  });

  // 7. 特殊なリンク（カテゴリなど）がクリックされた場合のテスト
  it('does not call selectPage for special links', async () => {
    const selectPageMock = jest.fn();
    (useSocket as jest.Mock).mockReturnValue({
      selectPage: selectPageMock,
    });

    // 特殊リンクを含むHTMLコンテンツを返すモック
    const contentWithSpecialLinks = `
      <div>
        <a href="/wiki/Normal_Page">Normal Link</a>
        <a href="/wiki/Category:Test">Category Link</a>
        <a href="/wiki/Special:Random">Special Link</a>
        <a href="/wiki/Help:Contents">Help Link</a>
      </div>
    `;
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: contentWithSpecialLinks,
      }),
    });
    
    render(<WikipediaPage pageName="Special Links" />);
    
    // コンテンツがロードされるのを待つ
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Normal Link');
    });
    
    // 通常リンクをクリック
    const normalLink = document.querySelector('a[href="/wiki/Normal_Page"]');
    if (normalLink) {
      fireEvent.click(normalLink);
      expect(selectPageMock).toHaveBeenCalledWith('Normal_Page');
    }
    
    // カテゴリリンクをクリック（何も起きないはず）
    const categoryLink = document.querySelector('a[href="/wiki/Category:Test"]');
    if (categoryLink) {
      fireEvent.click(categoryLink);
      expect(selectPageMock).toHaveBeenCalledTimes(1); // 通常リンクのクリックのみカウント
    }
    
    // Special:リンクをクリック（何も起きないはず）
    const specialLink = document.querySelector('a[href="/wiki/Special:Random"]');
    if (specialLink) {
      fireEvent.click(specialLink);
      expect(selectPageMock).toHaveBeenCalledTimes(1);
    }
    
    // Help:リンクをクリック（何も起きないはず）
    const helpLink = document.querySelector('a[href="/wiki/Help:Contents"]');
    if (helpLink) {
      fireEvent.click(helpLink);
      expect(selectPageMock).toHaveBeenCalledTimes(1);
    }
  });
}); 