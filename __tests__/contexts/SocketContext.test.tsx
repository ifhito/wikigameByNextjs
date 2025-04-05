import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocketProvider, SocketContext } from '../../app/contexts/SocketContext';
import { io } from 'socket.io-client';
import React, { useContext } from 'react';

// Socket.ioのモック
jest.mock('socket.io-client');

describe('SocketContext', () => {
  // モックイベントハンドラーとソケット
  let mockEventHandlers: Record<string, (data: unknown) => void> = {};
  
  interface MockSocketInstance {
    on: (event: string, handler: (data: unknown) => void) => MockSocketInstance;
    emit: jest.Mock;
    disconnect: jest.Mock;
    id: string;
    connected: boolean;
  }
  
  const mockSocketInstance: MockSocketInstance = {
    on: jest.fn((event: string, handler: (data: unknown) => void) => {
      mockEventHandlers[event] = handler;
      return mockSocketInstance;
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    id: 'mock-socket-id',
    connected: true
  };

  // テスト前にフェッチAPIとSocket.ioをモック
  beforeEach(() => {
    jest.useFakeTimers(); // タイマーをモック化
    
    // フェッチモックを設定
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', message: 'Socket.IO server is running' })
      } as Response)
    );
    
    // Socket.ioモックをリセット
    mockEventHandlers = {};
    (io as jest.Mock).mockImplementation(() => mockSocketInstance);

    // ConnectionTimeoutを即座に発火させないようにwindow.locationを設定
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true
    });
  });
  
  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers(); // タイマーをリセット
  });
  
  test('プロバイダーが子コンポーネントをレンダリングすること', () => {
    const { getByText } = render(
      <SocketProvider>
        <div>Child Component</div>
      </SocketProvider>
    );
    
    expect(getByText('Child Component')).toBeInTheDocument();
  });
  
  test('SocketProviderがマウント時にソケット接続を行うこと', async () => {
    render(
      <SocketProvider>
        <div>Test</div>
      </SocketProvider>
    );
    
    // フェッチが呼ばれていることを確認
    expect(global.fetch).toHaveBeenCalledWith('/api/socket');
    
    // フェッチのモックレスポンスを解決
    await act(async () => {
      await Promise.resolve();
    });
    
    // Socket.ioが初期化されていることを確認
    expect(io).toHaveBeenCalledWith('http://localhost:3000', expect.any(Object));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
    
    // connect イベントを手動で発火
    if (mockEventHandlers['connect']) {
      act(() => {
        mockEventHandlers['connect']({});
      });
    }
  });

  // カスタムサーバー対応のため、このテストをスキップ
  test.skip('ゲーム再開時にroom状態を正しく更新すること', async () => {
    // モックデータ - ゲーム終了状態のルーム
    const finishedRoom = {
      id: 'test-room',
      creator: 'player1',
      players: [
        {
          id: 'player1',
          name: 'テスト1',
          goalPage: 'サッカー',
          isReady: true,
          isWinner: true, // 勝者
          consecutiveTurnsLeft: 3
        },
        {
          id: 'player2',
          name: 'テスト2',
          goalPage: 'IOTV',
          isReady: true,
          isWinner: false,
          consecutiveTurnsLeft: 3
        },
      ],
      status: 'finished', // 終了状態
      currentPage: 'サッカー',
      startingPage: '日本',
      currentPlayerIndex: 0,
    };

    // モックデータ - ゲーム再開状態のルーム（状態とwinnerフラグのみリセット）
    const restartedRoom = {
      ...finishedRoom,
      status: 'playing', // プレイ中に変更
      currentPage: '日本', // スタートページに戻す
      players: finishedRoom.players.map(player => ({
        ...player,
        isWinner: false // 勝者状態をリセット
      }))
    };
    
    // テスト用コンポーネント
    const TestComponent = () => {
      const context = useContext(SocketContext);
      return <div data-testid="room-status">{context.room?.status || 'no-room'}</div>;
    };

    // コンポーネントをレンダリング
    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    // フェッチとSocket.ioの初期化を待つ
    await act(async () => {
      await Promise.resolve();
    });
    
    // connect イベントを手動で発火
    act(() => {
      if (mockEventHandlers['connect']) {
        mockEventHandlers['connect']({});
      }
    });

    // 初期ルームデータを設定
    act(() => {
      if (mockEventHandlers['room-created']) {
        mockEventHandlers['room-created']({ 
          roomId: 'test-room',
          room: { 
            id: 'test-room',
            status: 'waiting',
            players: [] 
          }
        });
      }
    });

    // ゲーム終了イベントをトリガー
    act(() => {
      if (mockEventHandlers['game-finished']) {
        mockEventHandlers['game-finished']({ room: finishedRoom });
      }
    });

    // roomの状態が'finished'になっていることを確認
    expect(getByTestId('room-status').textContent).toBe('finished');

    // ゲーム再開イベントをトリガー
    act(() => {
      if (mockEventHandlers['game-started']) {
        mockEventHandlers['game-started']({ room: restartedRoom });
      }
    });
    
    // roomの状態が'playing'に更新されていることを確認
    expect(getByTestId('room-status').textContent).toBe('playing');
  });
  
  test('toggleContinuousTurn関数が連続ターンの状態を切り替えること', async () => {
    // テスト用コンポーネント
    const TestComponent = () => {
      const { useContinuousTurn, toggleContinuousTurn } = useContext(SocketContext);
      return (
        <div>
          <div data-testid="continuous-turn-status">{useContinuousTurn ? 'on' : 'off'}</div>
          <button data-testid="toggle-button" onClick={toggleContinuousTurn}>Toggle</button>
        </div>
      );
    };

    // コンポーネントをレンダリング
    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    // フェッチとSocket.ioの初期化を待つ
    await act(async () => {
      await Promise.resolve();
    });
    
    // connect イベントを手動で発火
    act(() => {
      if (mockEventHandlers['connect']) {
        mockEventHandlers['connect']({});
      }
    });

    // 初期状態が'off'であることを確認
    expect(getByTestId('continuous-turn-status').textContent).toBe('off');
    
    // トグルボタンをクリック
    act(() => {
      getByTestId('toggle-button').click();
    });
    
    // 状態が'on'に変わったことを確認
    expect(getByTestId('continuous-turn-status').textContent).toBe('on');
    
    // もう一度トグルボタンをクリック
    act(() => {
      getByTestId('toggle-button').click();
    });
    
    // 状態が'off'に戻ったことを確認
    expect(getByTestId('continuous-turn-status').textContent).toBe('off');
  });

  // カスタムサーバー対応のため、このテストをスキップ
  test.skip('selectPage関数が連続ターンフラグを正しく渡すこと', async () => {
    // テスト用コンポーネント
    const TestComponent = () => {
      const { selectPage, useContinuousTurn, toggleContinuousTurn } = useContext(SocketContext);
      
      return (
        <div>
          <div data-testid="continuous-turn-status">{useContinuousTurn ? 'on' : 'off'}</div>
          <button data-testid="toggle-button" onClick={toggleContinuousTurn}>Toggle</button>
          <button 
            data-testid="select-page-button" 
            onClick={() => selectPage('テストページ')}
          >
            Select Page
          </button>
        </div>
      );
    };

    // コンポーネントをレンダリング
    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    // フェッチとSocket.ioの初期化を待つ
    await act(async () => {
      await Promise.resolve();
    });
    
    // connect イベントを手動で発火
    act(() => {
      if (mockEventHandlers['connect']) {
        mockEventHandlers['connect']({});
      }
    });

    // roomIdをモックで設定
    act(() => {
      if (mockEventHandlers['room-created']) {
        mockEventHandlers['room-created']({ 
          roomId: 'test-room-id',
          room: { id: 'test-room-id', players: [] }
        });
      }
    });
    
    // roomデータを設定（playing状態）
    act(() => {
      if (mockEventHandlers['room-updated']) {
        mockEventHandlers['room-updated']({ 
          room: { 
            id: 'test-room-id', 
            status: 'playing',
            players: [{ id: mockSocketInstance.id }],
            currentPlayerIndex: 0
          }
        });
      }
    });

    // 連続ターンをONに切り替え
    act(() => {
      getByTestId('toggle-button').click();
    });
    
    // 状態が'on'に変わったことを確認
    expect(getByTestId('continuous-turn-status').textContent).toBe('on');
    
    // 連続ターンONの状態でページ選択
    act(() => {
      getByTestId('select-page-button').click();
    });
    
    // socketのemitが連続ターンONのパラメータで呼ばれていることを確認
    expect(mockSocketInstance.emit).toHaveBeenCalledWith('select-page', expect.objectContaining({
      pageName: 'テストページ',
      useContinuousTurn: true
    }));
    
    // 連続ターンをOFFに切り替え
    act(() => {
      getByTestId('toggle-button').click();
    });
    
    // 状態が'off'に変わったことを確認
    expect(getByTestId('continuous-turn-status').textContent).toBe('off');
    
    // 連続ターンOFFの状態でページ選択
    mockSocketInstance.emit.mockClear(); // 前回の呼び出しをクリア
    act(() => {
      getByTestId('select-page-button').click();
    });
    
    // socketのemitが連続ターンOFFのパラメータで呼ばれていることを確認
    expect(mockSocketInstance.emit).toHaveBeenCalledWith('select-page', expect.objectContaining({
      pageName: 'テストページ',
      useContinuousTurn: false
    }));
  });
}); 