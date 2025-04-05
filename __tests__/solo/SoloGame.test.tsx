import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SoloGame } from '../../app/solo/SoloGame';
import '@testing-library/jest-dom';

// WikipediaAPI呼び出しのモック
global.fetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SoloGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // fetchのデフォルト動作を設定
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wikipedia')) {
        // ウィキペディアコンテンツAPIのモック
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'テストページ',
            content: `
              <div>
                <a href="/wiki/Link1">リンク1</a>
                <a href="/wiki/Link2">リンク2</a>
                <a href="/wiki/Link3">リンク3</a>
              </div>
            `,
          }),
        });
      } else if (url.includes('/api/wikipedia/random')) {
        // ランダムページAPIのモック
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            startPage: 'スタートページ',
            goalPage: 'ゴールページ',
          }),
        });
      }
      return Promise.reject(new Error('Unknown API'));
    });

    // DOMにwikipedia-contentを追加
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('ゲーム開始時に残り6回のクリック回数が表示される', async () => {
    render(<SoloGame />);
    
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
  });

  it('リンクをクリックすると残りクリック回数が減少する', async () => {
    render(<SoloGame />);
    
    // ゲームがロードされるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // コンテンツがロードされるのを待つ
    await waitFor(() => {
      expect(document.querySelector('a[href="/wiki/Link1"]')).not.toBeNull();
    });
    
    // リンクをクリック
    const link = document.querySelector('a[href="/wiki/Link1"]') as HTMLElement;
    fireEvent.click(link);
    
    // クリック回数が減少したことを確認
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 5/)).toBeInTheDocument();
    });
  });

  it('ゴールページに到達すると成功メッセージが表示される', async () => {
    // ゴールページの特別なモックを設定
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wikipedia?title=ゴールページ')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'ゴールページ',
            content: '<div>これはゴールページです</div>',
          }),
        });
      } else if (url.includes('/api/wikipedia/random')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            startPage: 'スタートページ',
            goalPage: 'ゴールページ',
          }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'テストページ',
            content: `
              <div>
                <a href="/wiki/ゴールページ">ゴールへ</a>
              </div>
            `,
          }),
        });
      }
    });
    
    render(<SoloGame />);
    
    // ゲームがロードされるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // コンテンツがロードされるのを待つ
    await waitFor(() => {
      expect(document.querySelector('a[href="/wiki/ゴールページ"]')).not.toBeNull();
    });
    
    // ゴールページへのリンクをクリック
    const link = document.querySelector('a[href="/wiki/ゴールページ"]') as HTMLElement;
    fireEvent.click(link);
    
    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
      expect(screen.getByText(/🎉/)).toBeInTheDocument();
    });
  });

  it('6回クリックしてもゴールに到達しないと失敗メッセージが表示される', async () => {
    render(<SoloGame />);
    
    // ゲームがロードされるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // 6回リンクをクリック
    for (let i = 0; i < 6; i++) {
      await waitFor(() => {
        expect(document.querySelector('a[href="/wiki/Link1"]')).not.toBeNull();
      });
      
      const link = document.querySelector('a[href="/wiki/Link1"]') as HTMLElement;
      fireEvent.click(link);
    }
    
    // 失敗メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/Fail/)).toBeInTheDocument();
    });
  });

  it('リプレイボタンをクリックすると新しいゲームが開始される', async () => {
    // 失敗状態のゲームをセットアップ
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wikipedia/random')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            startPage: 'スタートページ',
            goalPage: 'ゴールページ',
          }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'テストページ',
            content: `
              <div>
                <a href="/wiki/Link1">リンク1</a>
              </div>
            `,
          }),
        });
      }
    });
    
    render(<SoloGame />);
    
    // ゲームをロードして6回クリック
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    for (let i = 0; i < 6; i++) {
      await waitFor(() => {
        expect(document.querySelector('a[href="/wiki/Link1"]')).not.toBeNull();
      });
      
      const link = document.querySelector('a[href="/wiki/Link1"]') as HTMLElement;
      fireEvent.click(link);
    }
    
    // 失敗メッセージが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/Fail/)).toBeInTheDocument();
    });
    
    // リプレイボタンが表示されるのを確認
    const replayButton = screen.getByText(/もう一度挑戦/);
    expect(replayButton).toBeInTheDocument();
    
    // リプレイボタンをクリック
    fireEvent.click(replayButton);
    
    // 新しいゲームが開始され、クリック回数が6に戻ることを確認
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // ランダムページAPIが再度呼び出されることを確認
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/wikipedia/random'));
  });
}); 