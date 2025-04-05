import { NextResponse } from 'next/server';

// ソケットサーバーが起動していることを確認するためのエンドポイント
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Socket.IO server is running'
  });
} 