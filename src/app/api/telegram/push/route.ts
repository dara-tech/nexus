import { NextRequest, NextResponse } from 'next/server';
import { pushArticleToTelegram } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article, chatId } = body;

    if (!article || !article.title || !article.link) {
      return NextResponse.json(
        { success: false, error: 'Missing article title or link' },
        { status: 400 }
      );
    }

    const result = await pushArticleToTelegram(article, chatId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/telegram/push:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
