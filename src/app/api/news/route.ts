import { NextRequest, NextResponse } from 'next/server';
import { fetchAggregatedNews } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const startTime = Date.now();
    const articles = await fetchAggregatedNews({
      sourceId: source,
      category,
      search,
    });
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      count: articles.length,
      durationMs,
      articles,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('API /api/news error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch news',
      },
      { status: 500 }
    );
  }
}
