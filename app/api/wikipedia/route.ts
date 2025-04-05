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
    console.log('Fetching Wikipedia content for:', title);
    
    // ページコンテンツを取得（origin=*を追加してCORSを許可）
    const contentResponse = await fetch(
      `${WIKIPEDIA_BASE_URL}${WIKIPEDIA_API_PATH}?action=parse&page=${encodeURIComponent(
        title
      )}&prop=text&format=json&origin=*`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      }
    );
    
    if (!contentResponse.ok) {
      console.error('Wikipedia API error:', await contentResponse.text());
      return NextResponse.json({ error: 'ウィキペディアAPI応答エラー' }, { status: contentResponse.status });
    }

    const contentData = await contentResponse.json() as WikipediaResponse;

    if (contentData.error) {
      console.error('Wikipedia content error:', contentData.error);
      return NextResponse.json({ error: 'ページが見つかりません' }, { status: 404 });
    }

    // リンクを取得（origin=*を追加してCORSを許可）
    const linksResponse = await fetch(
      `${WIKIPEDIA_BASE_URL}${WIKIPEDIA_API_PATH}?action=parse&page=${encodeURIComponent(
        title
      )}&prop=links&format=json&origin=*`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      }
    );

    if (!linksResponse.ok) {
      console.error('Wikipedia links API error:', await linksResponse.text());
      return NextResponse.json({ error: 'ウィキペディアリンクAPI応答エラー' }, { status: linksResponse.status });
    }

    const linksData = await linksResponse.json() as WikipediaResponse;

    // コンテンツとリンクがあるか確認
    if (!contentData.parse?.text?.['*']) {
      console.error('No content found in response');
      return NextResponse.json({ error: 'コンテンツが見つかりません' }, { status: 404 });
    }

    // 結果を結合して返す
    return NextResponse.json({
      title: title,
      content: contentData.parse.text['*'],
      links: linksData.parse.links
        ? linksData.parse.links.map((link: WikipediaLink) => ({
            title: link['*'],
            ns: link.ns,
          })).filter((link) => link.ns === 0)  // メインの名前空間のリンクのみをフィルタリング
        : [],
    });
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    return NextResponse.json({ error: 'ウィキペディアからのデータ取得に失敗しました' }, { status: 500 });
  }
} 