import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameRoom } from '../../app/components/GameRoom';
import { useSocket } from '../../app/contexts/SocketContext';
import { Room } from '../../app/contexts/SocketContext';

// SocketContextをモック
jest.mock('../../app/contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

describe('GameRoom', () => {
  // クリップボードAPIのモック
  const originalClipboard = { ...global.navigator.clipboard };
  const mockClipboard = {
    writeText: jest.fn(() => Promise.resolve()),
  };

  beforeAll(() => {
    // クリップボードAPIをモック化
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      configurable: true,
    });
  });

  afterAll(() => {
    // テスト後に元に戻す
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  // モックルームデータ
  const mockRoom: Room = {
    id: 'test-room-id',
    creator: 'creator-id',
    players: [
      { id: 'player1', name: 'Player 1', goalPage: '', isReady: true, isWinner: false, consecutiveTurnsLeft: 3 },
      { id: 'player2', name: 'Player 2', goalPage: '', isReady: true, isWinner: false, consecutiveTurnsLeft: 3 }
    ],
    status: 'waiting',
    currentPage: '',
    startingPage: '',
    currentPlayerIndex: 0
  };

  // モックソケットデータ
  const mockSocket = { id: 'player1' };

  // モックstartGame関数
  const mockStartGame = jest.fn();

  beforeEach(() => {
    // useSocketモックの設定
    (useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      room: mockRoom,
      startGame: mockStartGame
    });
    
    // クリップボードのモックをリセット
    mockClipboard.writeText.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('読み込み中のステータスを表示すること', () => {
    // socketがnullの場合
    (useSocket as jest.Mock).mockReturnValue({
      socket: null,
      room: null
    });

    render(<GameRoom roomId="test-room-id" />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('roomIdを表示すること', () => {
    render(<GameRoom roomId="test-room-id" />);
    expect(screen.getByText(/部屋ID:/)).toBeInTheDocument();
    expect(screen.getByText(/test-room-id/)).toBeInTheDocument();
  });

  test('部屋IDをクリックするとクリップボードにコピーされること', async () => {
    render(<GameRoom roomId="test-room-id" />);
    
    // 部屋IDを含む要素を取得
    const roomIdElement = screen.getByText(/test-room-id/);
    
    // クリックイベントを発火
    fireEvent.click(roomIdElement);
    
    // クリップボードにコピーされたことを確認
    expect(mockClipboard.writeText).toHaveBeenCalledWith('test-room-id');
    
    // コピー成功のフィードバックメッセージが表示されることを確認
    expect(await screen.findByText('コピーしました！')).toBeInTheDocument();
    
    // フィードバックメッセージが数秒後に消えることをテスト（省略可）
    // jest.advanceTimersByTime(3000); 
    // expect(screen.queryByText('コピーしました！')).not.toBeInTheDocument();
  });

  test('ゲームクリエイターの場合にゲーム開始ボタンを表示すること', () => {
    // プレイヤーをクリエイターに設定
    (useSocket as jest.Mock).mockReturnValue({
      socket: { id: 'creator-id' },
      room: mockRoom,
      startGame: mockStartGame
    });

    render(<GameRoom roomId="test-room-id" />);
    const startButton = screen.getByText('ゲーム開始');
    expect(startButton).toBeInTheDocument();
  });

  test('待機中の場合に適切なメッセージを表示すること', () => {
    render(<GameRoom roomId="test-room-id" />);
    expect(screen.getByText('ゲーム開始を待っています')).toBeInTheDocument();
  });

  test('プレイヤーが1人の場合に警告メッセージを表示すること', () => {
    // プレイヤーが1人のルームにする
    const singlePlayerRoom = {
      ...mockRoom,
      players: [{ id: 'player1', name: 'Player 1', goalPage: '', isReady: true, isWinner: false, consecutiveTurnsLeft: 3 }]
    };
    
    // クリエイターとしてログイン
    (useSocket as jest.Mock).mockReturnValue({
      socket: { id: 'creator-id' },
      room: singlePlayerRoom,
      startGame: mockStartGame
    });

    render(<GameRoom roomId="test-room-id" />);
    
    // 複数の要素が同じテキストを持つ可能性があるため、getAllByTextを使用
    const warningMessages = screen.getAllByText('ゲームを開始するには2人以上のプレイヤーが必要です');
    expect(warningMessages.length).toBeGreaterThan(0);
    
    // ボタンが無効化されていることを確認
    const startButton = screen.getByText('ゲーム開始');
    expect(startButton).toBeDisabled();
  });

  test('プレイ中かつ自分のターンで連続ターンが残っている場合に連続ターン設定が表示されること', () => {
    // プレイ中のルーム
    const playingRoom = {
      ...mockRoom,
      status: 'playing',
      currentPage: 'テストページ',
      currentPlayerIndex: 0
    };

    // 自分のターンとして設定
    (useSocket as jest.Mock).mockReturnValue({
      socket: { id: 'player1' },
      room: playingRoom,
      startGame: mockStartGame,
      useContinuousTurn: false,
      toggleContinuousTurn: jest.fn()
    });

    render(<GameRoom roomId="test-room-id" />);
    
    // 連続ターン設定が表示されていることを確認
    expect(screen.getByText('連続ターン設定')).toBeInTheDocument();
    expect(screen.getByText(/次の手番も自分の手番にする/)).toBeInTheDocument();
    expect(screen.getByText(/残り3回/)).toBeInTheDocument();
  });

  test('プレイ中だが連続ターンが残っていない場合、連続ターン設定が表示されないこと', () => {
    // 連続ターンが残っていないプレイヤーのルーム
    const noTurnsRoom = {
      ...mockRoom,
      status: 'playing',
      currentPage: 'テストページ',
      currentPlayerIndex: 0,
      players: [
        { id: 'player1', name: 'Player 1', goalPage: '', isReady: true, isWinner: false, consecutiveTurnsLeft: 0 },
        { id: 'player2', name: 'Player 2', goalPage: '', isReady: true, isWinner: false, consecutiveTurnsLeft: 3 }
      ]
    };

    // 自分のターンとして設定
    (useSocket as jest.Mock).mockReturnValue({
      socket: { id: 'player1' },
      room: noTurnsRoom,
      startGame: mockStartGame,
      useContinuousTurn: false,
      toggleContinuousTurn: jest.fn()
    });

    render(<GameRoom roomId="test-room-id" />);
    
    // 連続ターン設定が表示されていないことを確認
    expect(screen.queryByText('連続ターン設定')).not.toBeInTheDocument();
  });

  test('他のプレイヤーのターンでは連続ターン設定が表示されないこと', () => {
    // プレイ中のルームで、player2のターン
    const otherPlayerTurnRoom = {
      ...mockRoom,
      status: 'playing',
      currentPage: 'テストページ',
      currentPlayerIndex: 1
    };

    // player1としてログイン
    (useSocket as jest.Mock).mockReturnValue({
      socket: { id: 'player1' },
      room: otherPlayerTurnRoom,
      startGame: mockStartGame,
      useContinuousTurn: false,
      toggleContinuousTurn: jest.fn()
    });

    render(<GameRoom roomId="test-room-id" />);
    
    // 連続ターン設定が表示されていないことを確認
    expect(screen.queryByText('連続ターン設定')).not.toBeInTheDocument();
  });
}); 