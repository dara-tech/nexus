import { getTelegramSettings, recordBroadcastLog } from './configService';

export interface TelegramPushResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface TelegramArticlePayload {
  title: string;
  link: string;
  snippet?: string;
  imageUrl?: string;
  sourceName?: string;
}

/**
 * Escape HTML special characters for Telegram HTML parse_mode
 */
function escapeTelegramHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Push an article to a Telegram Channel using Telegram Bot API & MongoDB Config
 */
export async function pushArticleToTelegram(
  article: TelegramArticlePayload,
  targetChatId?: string,
  customToken?: string
): Promise<TelegramPushResult> {
  const settings = await getTelegramSettings();

  const token =
    customToken ||
    settings.botToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    '';

  const chatId = targetChatId || settings.channelId || process.env.TELEGRAM_CHAT_ID;

  if (!chatId || !chatId.trim()) {
    return {
      success: false,
      error:
        'Telegram Channel ID or Username is required (e.g. @your_channel or -100xxxxxxxxxx). Please configure your channel in the Admin Panel.',
    };
  }

  const cleanTitle = escapeTelegramHtml(article.title || 'Untitled Article');
  const cleanSource = escapeTelegramHtml(article.sourceName || 'Nexus Wire');
  const cleanSnippet = article.snippet
    ? escapeTelegramHtml(article.snippet.slice(0, 450))
    : '';

  const captionHtml = `<b>📢 [${cleanSource}]</b>\n\n<b>${cleanTitle}</b>\n\n${
    cleanSnippet ? `${cleanSnippet}\n\n` : ''
  }🔗 <a href="${article.link}">Read Full Article</a>\n📡 <i>Nexus Wire Syndication</i>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '📖 Read Full Story',
          url: article.link,
        },
      ],
    ],
  };

  let pushResult: TelegramPushResult | null = null;

  // 1. Try sending as photo with caption if high-definition image is available
  if (article.imageUrl && !article.imageUrl.includes('placeholder')) {
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          photo: article.imageUrl,
          caption: captionHtml,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });

      const photoData = await photoRes.json();
      if (photoData.ok) {
        pushResult = { success: true, messageId: photoData.result.message_id };
      } else {
        console.warn(
          '[Telegram] sendPhoto failed, falling back to sendMessage:',
          photoData.description
        );
      }
    } catch (e) {
      console.warn('[Telegram] sendPhoto network error, fallback to text:', e);
    }
  }

  // 2. Fallback to formatted text message with web page preview enabled
  if (!pushResult || !pushResult.success) {
    try {
      const textRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: captionHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          reply_markup: inlineKeyboard,
        }),
      });

      const textData = await textRes.json();
      if (textData.ok) {
        pushResult = { success: true, messageId: textData.result.message_id };
      } else {
        pushResult = {
          success: false,
          error:
            textData.description ||
            'Failed to post message to Telegram channel. Make sure the bot is an administrator in your channel.',
        };
      }
    } catch (err: any) {
      pushResult = {
        success: false,
        error: err.message || 'Network error communicating with Telegram API.',
      };
    }
  }

  // 3. Record in MongoDB broadcast history
  await recordBroadcastLog({
    title: article.title,
    link: article.link,
    sourceName: article.sourceName,
    channelId: chatId.trim(),
    messageId: pushResult.messageId,
    status: pushResult.success ? 'success' : 'failed',
    error: pushResult.error,
  });

  return pushResult;
}
