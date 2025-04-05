import { NextResponse } from 'next/server';
import { setupSocketIO } from './socketIO';
import { createServer } from 'http';

// Socket.IOサーバーインスタンスを保持する
const httpServer = createServer();
let isServerInitialized = false;

// ソケットエンドポイントの処理
export function GET() {
  try {
    // Socket.IOサーバーを初期化（初回のみ）
    if (!isServerInitialized) {
      setupSocketIO(httpServer);
      
      // 開発環境では別ポートでlistenする
      if (process.env.NODE_ENV === 'development') {
        const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
        httpServer.listen(port);
        console.log(`Socket.IO server listening on port ${port} (development mode)`);
      }
      
      isServerInitialized = true;
      console.log('Socket.IO server initialized successfully');
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Socket.IO server is running',
      serverTime: new Date().toISOString(),
      mode: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Socket.IO server initialization error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to initialize Socket.IO server',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 