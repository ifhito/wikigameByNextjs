import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SoloGame } from '../../app/solo/SoloGame';
import '@testing-library/jest-dom';

// WikipediaAPI呼び出しのモック
global.fetch = jest.fn();

// AbortControllerとAbortSignalのモック
class MockAbortController {
  signal: MockAbortSignal;
  
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onabort: null
    } as unknown as MockAbortSignal;
  }
  
  abort() {
    this.signal.aborted = true;
  }
}

interface MockAbortSignal {
  aborted: boolean;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  dispatchEvent: jest.Mock;
  onabort: null;
}

// グローバルにモックを適用
global.AbortController = MockAbortController as unknown as typeof AbortController;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SoloGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // fetchのデフォルト動作を設定
    (global.fetch as jest.Mock).mockImplementation((_url: string, _options?: any) => {
      const url = _url as string;
      if (url.includes('/api/wikipedia?title=')) {
        // ゴールページ取得の場合はゴールの説明を含める
        const titleParam = new URL(url, 'http://localhost').searchParams.get('title');
        if (titleParam === 'ゴールページ') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              title: 'ゴールページ',
              content: '<div><p>これはゴールページの説明です。テスト用の説明文です。</p><div>その他の内容</div></div>',
            }),
          });
        }
        
        // 通常のウィキペディアコンテンツAPIのモック
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
    (global.fetch as jest.Mock).mockImplementation((_url: string, _options?: any) => {
      const url = _url as string;
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
    (global.fetch as jest.Mock).mockImplementation((_url: string, _options?: any) => {
      const url = _url as string;
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
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/wikipedia/random'), expect.objectContaining({ signal: expect.any(Object) }));
  });

  it('目標の説明が表示される', async () => {
    render(<SoloGame />);
    
    // ゲームがロードされるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // 目標の説明セクションが表示されることを確認
    expect(screen.getByText(/目標ページの説明:/)).toBeInTheDocument();
    
    // 目標の説明コンテンツが表示されることを確認
    const goalDescription = screen.getByTestId('goal-description');
    expect(goalDescription).toBeInTheDocument();
    expect(goalDescription.textContent).toContain('これはゴールページの説明です');
  });

  it('目標の説明が空の場合にプレースホルダーが表示される', async () => {
    // 説明なしのモックを設定
    (global.fetch as jest.Mock).mockImplementation((_url: string, _options?: any) => {
      const url = _url as string;
      if (url.includes('/api/wikipedia?title=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'テストページ',
            content: '<div>説明なし</div>',
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
      }
      return Promise.reject(new Error('Unknown API'));
    });
    
    render(<SoloGame />);
    
    // ゲームがロードされるのを待つ
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });
    
    // 目標の説明セクションが表示されることを確認
    expect(screen.getByText(/目標ページの説明:/)).toBeInTheDocument();
    
    // プレースホルダーが表示されることを確認
    const goalDescription = screen.getByTestId('goal-description');
    expect(goalDescription).toBeInTheDocument();
    expect(goalDescription.textContent).toContain('目標ページに関する情報を読み込み中');
  });

  it('AbortControllerが正しく動作すること', async () => {
    // 2回の連続したレンダリングをシミュレート
    const { unmount } = render(<SoloGame />);
    unmount();
    render(<SoloGame />);

    // ゲームが適切にロードされることを確認
    await waitFor(() => {
      expect(screen.getByText(/残りクリック回数: 6/)).toBeInTheDocument();
    });

    // オプションにsignalが含まれていることを確認
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/wikipedia/random'), 
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });
}); 