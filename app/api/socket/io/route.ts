import { NextResponse } from 'next/server';
import { setupSocketIO } from './socketIO';

// ソケットエンドポイントの処理
export function GET() {
  try {
    // Socket.IOサーバーをセットアップ
    setupSocketIO();
    
    return NextResponse.json({ status: 'ok', message: 'Socket.IO endpoint is available at /api/socket/io' });
  } catch (error) {
    console.error('Socket.IO server initialization error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to initialize Socket.IO server' }, { status: 500 });
  }
} 