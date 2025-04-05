import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerList } from '../../app/components/PlayerList';
import { Room } from '../../app/contexts/SocketContext';

describe('PlayerList', () => {
  // モックルームデータ
  const mockRoom: Room = {
    id: 'test-room-id',
    creator: 'creator-id',
    players: [
      { id: 'player1', name: 'Player 1', goalPage: 'Goal 1', isReady: true, isWinner: false },
      { id: 'player2', name: 'Player 2', goalPage: 'Goal 2', isReady: true, isWinner: false },
      { id: 'player3', name: 'Player 3', goalPage: 'Goal 3', isReady: false, isWinner: false }
    ],
    status: 'waiting',
    currentPage: '',
    startingPage: '',
    currentPlayerIndex: 0
  };

  // 説明文付きのモックルームデータ
  const mockRoomWithDescriptions: Room = {
    id: 'test-room-id',
    creator: 'creator-id',
    players: [
      { 
        id: 'player1', 
        name: 'Player 1', 
        goalPage: 'Goal 1', 
        goalDescription: 'これはゴール1の説明文です。',
        isReady: true, 
        isWinner: false 
      },
      { 
        id: 'player2', 
        name: 'Player 2', 
        goalPage: 'Goal 2', 
        goalDescription: 'これはゴール2の説明文です。', 
        isReady: true, 
        isWinner: false 
      },
      { 
        id: 'player3', 
        name: 'Player 3', 
        goalPage: 'Goal 3', 
        goalDescription: 'これはゴール3の説明文です。', 
        isReady: false, 
        isWinner: false 
      }
    ],
    status: 'playing',
    currentPage: 'Current Page',
    startingPage: 'Start Page',
    currentPlayerIndex: 0
  };

  test('プレイヤーリストの見出しが表示されること', () => {
    render(<PlayerList room={mockRoom} currentPlayerId="player1" />);
    expect(screen.getByText('プレイヤー')).toBeInTheDocument();
  });

  test('全てのプレイヤー名が表示されること', () => {
    render(<PlayerList room={mockRoom} currentPlayerId="player1" />);
    expect(screen.getByText(/Player 1/)).toBeInTheDocument();
    expect(screen.getByText(/Player 2/)).toBeInTheDocument();
    expect(screen.getByText(/Player 3/)).toBeInTheDocument();
  });

  test('現在のプレイヤーが強調表示されること', () => {
    render(<PlayerList room={mockRoom} currentPlayerId="player1" />);
    
    // 「あなた」というテキストが存在することを確認
    expect(screen.getByText('(あなた)')).toBeInTheDocument();
    
    // プレイヤー2と3は「あなた」と表示されないことを確認
    const player2Text = screen.getByText(/Player 2/).textContent;
    const player3Text = screen.getByText(/Player 3/).textContent;
    expect(player2Text).not.toContain('あなた');
    expect(player3Text).not.toContain('あなた');
  });

  test('ゲーム中の場合にプレイヤーの進捗状況が表示されること', () => {
    // ゲームプレイ中のルーム
    const playingRoom: Room = {
      ...mockRoom,
      status: 'playing',
      currentPage: 'Current Page',
    };
    
    render(<PlayerList room={playingRoom} currentPlayerId="player1" />);
    
    // ゴールページが表示されていることを確認
    expect(screen.getAllByText(/ゴールページ/).length).toBeGreaterThan(0);
    
    // 各ゴールページ名が表示されていることを確認
    expect(screen.getByText('Goal 1')).toBeInTheDocument();
    expect(screen.getByText('Goal 2')).toBeInTheDocument();
    expect(screen.getByText('Goal 3')).toBeInTheDocument();
  });

  test('現在プレイ中のプレイヤーにマークが表示されること', () => {
    // ゲームプレイ中のルーム、プレイヤー1がプレイ中
    const playingRoom: Room = {
      ...mockRoom,
      status: 'playing',
      currentPlayerIndex: 0, // Player 1
    };
    
    render(<PlayerList room={playingRoom} currentPlayerId="player2" />);
    
    // プレイ中ラベルが表示されていることを確認
    expect(screen.getByText('プレイ中')).toBeInTheDocument();
  });

  // ここから説明文表示機能のテスト
  
  test('説明文があるプレイヤーに「説明を見る」ボタンが表示されること', () => {
    render(<PlayerList room={mockRoomWithDescriptions} currentPlayerId="player1" />);
    
    // 各プレイヤーの「説明を見る」ボタンが表示されていることを確認
    const viewButtons = screen.getAllByText('説明を見る');
    expect(viewButtons.length).toBe(3); // 3人のプレイヤー全員に表示される
  });
  
  test('「説明を見る」ボタンをクリックすると説明文が表示されること', () => {
    render(<PlayerList room={mockRoomWithDescriptions} currentPlayerId="player1" />);
    
    // 最初は説明文が表示されていないことを確認
    expect(screen.queryByText('これはゴール1の説明文です。')).not.toBeInTheDocument();
    
    // プレイヤー1の「説明を見る」ボタンをクリック
    const viewButtons = screen.getAllByText('説明を見る');
    fireEvent.click(viewButtons[0]); // 最初のプレイヤーのボタン
    
    // 説明文が表示されたことを確認
    expect(screen.getByText('これはゴール1の説明文です。')).toBeInTheDocument();
    
    // ボタンのテキストが「説明を隠す」に変わったことを確認
    expect(screen.getByText('説明を隠す')).toBeInTheDocument();
  });
  
  test('「説明を隠す」ボタンをクリックすると説明文が非表示になること', () => {
    render(<PlayerList room={mockRoomWithDescriptions} currentPlayerId="player1" />);
    
    // 「説明を見る」ボタンをクリック
    const viewButtons = screen.getAllByText('説明を見る');
    fireEvent.click(viewButtons[0]);
    
    // 説明文が表示されたことを確認
    expect(screen.getByText('これはゴール1の説明文です。')).toBeInTheDocument();
    
    // 「説明を隠す」ボタンをクリック
    const hideButton = screen.getByText('説明を隠す');
    fireEvent.click(hideButton);
    
    // 説明文が非表示になったことを確認
    expect(screen.queryByText('これはゴール1の説明文です。')).not.toBeInTheDocument();
    
    // ボタンのテキストが「説明を見る」に戻ったことを確認
    expect(screen.getAllByText('説明を見る').length).toBe(3);
  });
  
  test('一つのプレイヤーの説明文を表示しても、他のプレイヤーの説明文は表示されないこと', () => {
    render(<PlayerList room={mockRoomWithDescriptions} currentPlayerId="player1" />);
    
    // プレイヤー1の「説明を見る」ボタンをクリック
    const viewButtons = screen.getAllByText('説明を見る');
    fireEvent.click(viewButtons[0]); // 最初のプレイヤーのボタン
    
    // プレイヤー1の説明文が表示されることを確認
    expect(screen.getByText('これはゴール1の説明文です。')).toBeInTheDocument();
    
    // 他のプレイヤーの説明文は表示されないことを確認
    expect(screen.queryByText('これはゴール2の説明文です。')).not.toBeInTheDocument();
    expect(screen.queryByText('これはゴール3の説明文です。')).not.toBeInTheDocument();
  });
}); 