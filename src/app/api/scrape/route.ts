import { NextRequest, NextResponse } from 'next/server';
import { scrapeFullArticle } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'Target URL is required (?url=...)' },
        { status: 400 }
      );
    }

    const article = await scrapeFullArticle(targetUrl);
    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('API /api/scrape error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to scrape article from target URL',
      },
      { status: 500 }
    );
  }
}
