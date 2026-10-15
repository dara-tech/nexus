import { NextRequest, NextResponse } from 'next/server';
import {
  getConfiguredSources,
  saveSource,
  deleteSource,
  StoredNewsSource,
} from '@/lib/configService';

export async function GET() {
  try {
    const sources = await getConfiguredSources();
    return NextResponse.json({
      success: true,
      sources,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StoredNewsSource;

    if (!body.id || !body.name || !body.rssUrl) {
      return NextResponse.json(
        { success: false, error: 'Source ID, Name, and RSS URL are required' },
        { status: 400 }
      );
    }

    await saveSource({
      id: body.id.trim(),
      name: body.name.trim(),
      category: body.category || 'all',
      rssUrl: body.rssUrl.trim(),
      website: body.website || '',
      brandColor: body.brandColor || '#bb1919',
      badgeBg: body.badgeBg || 'rgba(187, 25, 25, 0.15)',
      badgeColor: body.badgeColor || '#ff6b6b',
      logoUrl:
        body.logoUrl ||
        `https://www.google.com/s2/favicons?domain=${new URL(body.rssUrl).hostname}&sz=64`,
      enabled: body.enabled !== false,
      order: body.order || 0,
    });

    const sources = await getConfiguredSources();
    return NextResponse.json({
      success: true,
      sources,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save source' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Source ID parameter is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteSource(id);
    const sources = await getConfiguredSources();

    return NextResponse.json({
      success: deleted,
      sources,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete source' },
      { status: 500 }
    );
  }
}
