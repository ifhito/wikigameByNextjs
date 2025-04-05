import { NextResponse } from 'next/server';

// Socket.IOの実際の実装はserver.jsに移行されたため、
// このAPIルートは単にステータスを返すだけのダミーエンドポイントになっています
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Socket.IO server is handled by custom server.js implementation' 
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 