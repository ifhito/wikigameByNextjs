import { NextResponse } from 'next/server';

// ランダムなWikipediaページのタイトルを取得する関数
async function getRandomWikiTitle(): Promise<string> {
  try {
    const response = await fetch('https://ja.wikipedia.org/api/rest_v1/page/random/title');
    const data = await response.json();
    return data.items[0].title;
  } catch (error) {
    console.error('ランダムページの取得に失敗:', error);
    // エラーが発生した場合はデフォルトのページを返す
    return '日本';
  }
}

export async function GET() {
  try {
    // 2つのランダムページを取得
    const startPage = await getRandomWikiTitle();
    const goalPage = await getRandomWikiTitle();
    
    // スタートとゴールが同じ場合は別のゴールを取得
    if (startPage === goalPage) {
      return GET();
    }
    
    return NextResponse.json({
      startPage,
      goalPage
    });
  } catch (error) {
    console.error('ランダムページの取得に失敗:', error);
    return NextResponse.json(
      { error: 'ランダムページの取得に失敗しました' },
      { status: 500 }
    );
  }
} 