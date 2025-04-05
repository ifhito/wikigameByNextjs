import { NextResponse } from 'next/server';

// Wikipediaの環境変数を設定
const WIKIPEDIA_BASE_URL = process.env.WIKIPEDIA_BASE_URL || 'https://ja.wikipedia.org';
const WIKIPEDIA_API_PATH = process.env.WIKIPEDIA_API_PATH || '/w/api.php';

interface WikipediaLink {
  '*': string;
  ns: number;
}

interface WikipediaResponse {
  parse: {
    text: {
      '*': string;
    };
    links: WikipediaLink[];
  };
  error?: {
    code: string;
    info: string;
  };
}

// WikipediaからページコンテンツとリンクをリクエストするAPI
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: 'タイトルが必要です' }, { status: 400 });
  }

  try {
    // ページコンテンツを取得
    const contentResponse = await fetch(
      `${WIKIPEDIA_BASE_URL}${WIKIPEDIA_API_PATH}?action=parse&page=${encodeURIComponent(
        title
      )}&prop=text&format=json&origin=*`
    );

    const contentData = await contentResponse.json() as WikipediaResponse;

    if (contentData.error) {
      return NextResponse.json({ error: 'ページが見つかりません' }, { status: 404 });
    }

    // リンクを取得
    const linksResponse = await fetch(
      `${WIKIPEDIA_BASE_URL}${WIKIPEDIA_API_PATH}?action=parse&page=${encodeURIComponent(
        title
      )}&prop=links&format=json&origin=*`
    );

    const linksData = await linksResponse.json() as WikipediaResponse;

    // 結果を結合して返す
    return NextResponse.json({
      title: title,
      content: contentData.parse.text['*'],
      links: linksData.parse.links.map((link: WikipediaLink) => ({
        title: link['*'],
        ns: link.ns,
      })).filter((link) => link.ns === 0), // メインの名前空間のリンクのみをフィルタリング
    });
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    return NextResponse.json({ error: 'ウィキペディアからのデータ取得に失敗しました' }, { status: 500 });
  }
} 