import { NextResponse } from 'next/server';

// アプリケーションはserver.jsでSocket.IOサーバーを実行しているので、
// このAPIエンドポイントはステータスメッセージのみを返します。
export async function GET() {
  return new NextResponse('Socket.IO server is running on custom server', { status: 200 });
} 