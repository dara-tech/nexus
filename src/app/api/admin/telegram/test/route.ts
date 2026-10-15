import { NextRequest, NextResponse } from 'next/server';
import { getTelegramSettings, recordBroadcastLog } from '@/lib/configService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, botToken: bodyToken, chatId, channelId: bodyChat, message } = body;

    const currentSettings = await getTelegramSettings();
    const botToken = bodyToken || token || currentSettings.botToken;
    const targetChat = bodyChat || chatId || currentSettings.channelId;
    const resolvedAction = (action === 'verify_token' || action === 'verify_bot') ? 'verify_bot' : ((action === 'send_test_message' || action === 'send_test') ? 'send_test' : action);

    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token is required' },
        { status: 400 }
      );
    }

    // Action 1: Verify Bot Credentials (getMe)
    if (resolvedAction === 'verify_bot') {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json(
          { success: false, error: data.description || 'Invalid Telegram Bot Token' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        bot: data.result,
      });
    }

    // Action 2: Send Test Message to Channel
    if (resolvedAction === 'send_test') {
      if (!targetChat) {
        return NextResponse.json(
          { success: false, error: 'Channel Username or Chat ID is required' },
          { status: 400 }
        );
      }

      const testMsg = message?.trim() || `<b>🧪 Nexus News • Channel Test Message</b>\n\nTelegram Bot <code>@nexussnewsbot</code> is successfully configured and connected to <b>${targetChat}</b>.\n\n📡 <i>Published via Nexus Admin Portal</i>`;

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChat.trim(),
          text: testMsg,
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              data.description ||
              'Failed to send message. Make sure the bot is added as an administrator to the channel.',
          },
          { status: 400 }
        );
      }

      const messageId = data.result?.message_id;

      // Record in Atlas broadcast_logs
      try {
        await recordBroadcastLog({
          title: testMsg.replace(/<[^>]+>/g, '').substring(0, 80),
          link: 'https://t.me/nexussnew',
          sourceName: 'Admin Control Center',
          channelId: targetChat.trim(),
          status: 'success',
          messageId: messageId,
        });
      } catch (logErr) {
        console.error('Failed to log test broadcast:', logErr);
      }

      return NextResponse.json({
        success: true,
        messageId: messageId,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Telegram API test error' },
      { status: 500 }
    );
  }
}
