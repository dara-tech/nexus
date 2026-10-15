import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramSettings,
  updateTelegramSettings,
  getDatabaseStats,
} from '@/lib/configService';

export async function GET() {
  try {
    const telegram = await getTelegramSettings();
    const stats = await getDatabaseStats();

    return NextResponse.json({
      success: true,
      telegram,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch admin config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramPayload = body.telegram || (body.botToken !== undefined || body.channelId !== undefined ? body : null);

    let updatedTelegram = null;
    if (telegramPayload) {
      updatedTelegram = await updateTelegramSettings(telegramPayload);
    }

    const stats = await getDatabaseStats();

    return NextResponse.json({
      success: true,
      telegram: updatedTelegram,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update admin config' },
      { status: 500 }
    );
  }
}
