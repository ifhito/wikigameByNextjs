import { NextResponse } from 'next/server';

// サーバーの起動確認用のAPIエンドポイント
export async function GET() {
  return new NextResponse('Socket.IO server is running via /api/socket/io', { status: 200 });
} 