import { NextResponse } from 'next/server';

// サーバーの起動確認用のAPIエンドポイント
export function GET() {
  return NextResponse.json({ status: 'ok', message: 'Socket.IO connection check endpoint' });
} 