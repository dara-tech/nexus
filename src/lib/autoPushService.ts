import { fetchAggregatedNews, resolveArticleImage } from './scraper';
import { pushArticleToTelegram } from './telegram';
import { getTelegramSettings, getBroadcastLogs } from './configService';
import { NewsArticle } from './types';

export interface AutoPushResult {
  success: boolean;
  pushed: boolean;
  article?: {
    title: string;
    link: string;
    sourceName: string;
  };
  messageId?: number;
  message?: string;
  error?: string;
}

/**
 * Checks for the newest unpublished article and pushes it to Telegram
 */
export async function runAutoPushCheck(): Promise<AutoPushResult> {
  try {
    const settings = await getTelegramSettings();
    const channelId = settings.channelId || process.env.TELEGRAM_CHAT_ID;
    if (!channelId) {
      return {
        success: false,
        pushed: false,
        error: 'No Telegram channel configured. Please set channel in Admin.',
      };
    }

    // 1. Fetch latest articles across all active MongoDB sources
    const articles = await fetchAggregatedNews({ category: 'all' });
    if (!articles || articles.length === 0) {
      return {
        success: true,
        pushed: false,
        message: 'No articles currently available from active sources.',
      };
    }

    // 2. Fetch past broadcast logs from MongoDB Atlas to prevent duplicate pushes
    const pastLogs = await getBroadcastLogs(200);
    const publishedLinks = new Set(pastLogs.map((l) => l.link));
    const publishedTitles = new Set(
      pastLogs.map((l) => l.title?.trim().toLowerCase())
    );

    // 3. Find the newest candidate article not yet published
    const candidate = articles.find(
      (art: NewsArticle) =>
        art.link &&
        !publishedLinks.has(art.link) &&
        !publishedTitles.has(art.title?.trim().toLowerCase())
    );

    if (!candidate) {
      return {
        success: true,
        pushed: false,
        message: 'All current top stories already broadcasted to Telegram.',
      };
    }

    // 4. Ensure candidate has the real high-definition hero image
    let finalImageUrl = candidate.imageUrl;
    if (!finalImageUrl && candidate.link) {
      finalImageUrl = await resolveArticleImage(candidate.link);
    }

    // Push candidate article to Telegram channel
    const result = await pushArticleToTelegram(
      {
        title: candidate.title,
        link: candidate.link,
        snippet: candidate.snippet,
        imageUrl: finalImageUrl,
        sourceName: candidate.sourceName,
      },
      channelId
    );

    if (result.success) {
      return {
        success: true,
        pushed: true,
        article: {
          title: candidate.title,
          link: candidate.link,
          sourceName: candidate.sourceName,
        },
        messageId: result.messageId,
      };
    } else {
      return {
        success: false,
        pushed: false,
        error: result.error || 'Failed to push article to Telegram',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      pushed: false,
      error: err.message || 'Auto-push execution error',
    };
  }
}
