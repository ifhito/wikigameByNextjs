import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocketProvider, SocketContext } from '../../app/contexts/SocketContext';
import { io } from 'socket.io-client';
import React, { useContext } from 'react';

// Socket.ioのモック
jest.mock('socket.io-client');

describe('SocketContext', () => {
  // テスト前にフェッチAPIをモック
  beforeEach(() => {
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)
    );
    
    // Socket.ioのモック実装
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      id: 'mock-socket-id'
    };
    (io as jest.Mock).mockReturnValue(mockSocket);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
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
    
    // 非同期処理が完了するのを待つ
    await waitFor(() => {
      // Socket.ioが初期化されていることを確認
      expect(io).toHaveBeenCalled();
    });
  });

  test('ゲーム再開時にroom状態を正しく更新すること', async () => {
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
        },
        {
          id: 'player2',
          name: 'テスト2',
          goalPage: 'IOTV',
          isReady: true,
          isWinner: false,
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

    // モックソケットにイベントハンドラを保存するオブジェクト
    const eventHandlers: Record<string, (data: unknown) => void> = {};
    
    // モックソケットインターフェース
    interface MockSocket {
      on: (event: string, handler: (data: unknown) => void) => MockSocket;
      emit: jest.Mock;
      disconnect: jest.Mock;
      id: string;
    }
    
    // モックソケットの設定
    const mockSocket: MockSocket = {
      on: jest.fn((event: string, handler: (data: unknown) => void) => {
        eventHandlers[event] = handler;
        return mockSocket;
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
      id: 'mock-socket-id'
    };
    
    // モックソケットを返すように設定
    (io as jest.Mock).mockReturnValue(mockSocket);
    
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
    
    // Socket.ioの初期化を待つ
    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // ゲーム終了イベントをトリガー
    act(() => {
      if (eventHandlers['game-finished']) {
        eventHandlers['game-finished']({ room: finishedRoom });
      }
    });

    // roomの状態が'finished'になっていることを確認
    await waitFor(() => {
      expect(getByTestId('room-status').textContent).toBe('finished');
    });

    // ゲーム再開イベントをトリガー
    act(() => {
      if (eventHandlers['game-started']) {
        eventHandlers['game-started']({ room: restartedRoom });
      }
    });
    
    // roomの状態が'playing'に更新されていることを確認
    await waitFor(() => {
      expect(getByTestId('room-status').textContent).toBe('playing');
    });
  });
}); 