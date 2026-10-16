import { getDatabase } from './mongodb';
import { NEWS_SOURCES } from './sources';
import { NewsSourceConfig } from './types';

export interface TelegramSettings {
  botToken: string;
  channelId: string;
  autoPush: boolean;
  siteUrl?: string;
  template?: string;
  updatedAt?: Date;
}

export interface GeneralSettings {
  siteTitle: string;
  refreshIntervalMinutes: number;
  defaultCategory: string;
  updatedAt?: Date;
}

export interface StoredNewsSource extends NewsSourceConfig {
  enabled: boolean;
  order: number;
  updatedAt?: Date;
}

export interface BroadcastLog {
  _id?: string;
  title: string;
  link: string;
  sourceName?: string;
  channelId: string;
  messageId?: number;
  status: 'success' | 'failed';
  error?: string;
  createdAt: Date;
}

const DEFAULT_TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_CHANNEL_ID = process.env.TELEGRAM_CHAT_ID || '';

/**
 * Get Telegram settings from MongoDB (seeds if missing)
 */
export async function getTelegramSettings(): Promise<TelegramSettings> {
  try {
    const db = await getDatabase();
    const settings = await db.collection('settings').findOne({ _id: 'telegram' as any });
    if (settings) {
      return {
        botToken: settings.botToken || DEFAULT_TELEGRAM_TOKEN,
        channelId: settings.channelId || DEFAULT_CHANNEL_ID,
        autoPush: Boolean(settings.autoPush),
        siteUrl: settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '',
        template: settings.template || '',
        updatedAt: settings.updatedAt,
      };
    }

    // Seed default
    const initial: TelegramSettings = {
      botToken: DEFAULT_TELEGRAM_TOKEN,
      channelId: DEFAULT_CHANNEL_ID,
      autoPush: false,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
      template: '<b>📢 [{source}]</b>\n\n<b>{title}</b>\n\n{snippet}\n\n🔗 {link}',
      updatedAt: new Date(),
    };
    await db.collection('settings').insertOne({ _id: 'telegram' as any, ...initial });
    return initial;
  } catch (err) {
    console.warn('[configService] MongoDB offline or query failed, using fallback:', err);
    return {
      botToken: DEFAULT_TELEGRAM_TOKEN,
      channelId: DEFAULT_CHANNEL_ID,
      autoPush: false,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
    };
  }
}

/**
 * Update Telegram settings in MongoDB
 */
export async function updateTelegramSettings(
  settings: Partial<TelegramSettings>
): Promise<TelegramSettings> {
  const db = await getDatabase();
  const current = await getTelegramSettings();
  const updated: TelegramSettings = {
    ...current,
    ...settings,
    updatedAt: new Date(),
  };

  await db
    .collection('settings')
    .updateOne({ _id: 'telegram' as any }, { $set: updated }, { upsert: true });

  return updated;
}

/**
 * Get all configured RSS Sources from MongoDB (seeds defaults if empty)
 */
export async function getConfiguredSources(): Promise<StoredNewsSource[]> {
  try {
    const db = await getDatabase();
    const count = await db.collection('sources').countDocuments();

    if (count === 0) {
      // Seed default sources
      const seeded: StoredNewsSource[] = NEWS_SOURCES.map((s, idx) => ({
        ...s,
        enabled: true,
        order: idx,
        updatedAt: new Date(),
      }));
      await db.collection('sources').insertMany(seeded.map((s) => ({ _id: s.id as any, ...s })));
      return seeded;
    }

    const docs = await db.collection('sources').find().sort({ order: 1 }).toArray();
    return docs.map((d: any) => ({
      id: d.id || d._id,
      name: d.name,
      category: d.category,
      rssUrl: d.rssUrl,
      website: d.website,
      brandColor: d.brandColor,
      badgeBg: d.badgeBg,
      badgeColor: d.badgeColor,
      logoUrl: d.logoUrl,
      enabled: d.enabled !== false,
      order: d.order || 0,
      updatedAt: d.updatedAt,
    }));
  } catch (err) {
    console.warn('[configService] MongoDB sources error, fallback to static sources:', err);
    return NEWS_SOURCES.map((s, idx) => ({
      ...s,
      enabled: true,
      order: idx,
    }));
  }
}

/**
 * Save or update an RSS News Source
 */
export async function saveSource(source: StoredNewsSource): Promise<void> {
  const db = await getDatabase();
  await db
    .collection('sources')
    .updateOne(
      { _id: source.id as any },
      { $set: { ...source, updatedAt: new Date() } },
      { upsert: true }
    );
}

/**
 * Delete an RSS News Source
 */
export async function deleteSource(sourceId: string): Promise<boolean> {
  const db = await getDatabase();
  const res = await db.collection('sources').deleteOne({ _id: sourceId as any });
  return res.deletedCount > 0;
}

/**
 * Record a Telegram Broadcast Log
 */
export async function recordBroadcastLog(log: Omit<BroadcastLog, '_id' | 'createdAt'>): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection('broadcast_logs').insertOne({
      ...log,
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn('[configService] Failed to record broadcast log:', e);
  }
}

/**
 * Get recent broadcast logs
 */
export async function getBroadcastLogs(limit = 25): Promise<BroadcastLog[]> {
  try {
    const db = await getDatabase();
    const docs = await db
      .collection('broadcast_logs')
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map((d: any) => ({
      _id: d._id.toString(),
      title: d.title,
      link: d.link,
      sourceName: d.sourceName,
      channelId: d.channelId,
      messageId: d.messageId,
      status: d.status,
      error: d.error,
      createdAt: d.createdAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Get system and database statistics
 */
export async function getDatabaseStats() {
  try {
    const db = await getDatabase();
    const sourcesCount = await db.collection('sources').countDocuments();
    const broadcastsCount = await db.collection('broadcast_logs').countDocuments();
    const tgSettings = await getTelegramSettings();

    return {
      connected: true,
      databaseName: db.databaseName,
      sourcesCount,
      broadcastsCount,
      telegramConfigured: Boolean(tgSettings.botToken && tgSettings.channelId),
      botToken: tgSettings.botToken,
      channelId: tgSettings.channelId,
      autoPush: tgSettings.autoPush,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Cannot connect to MongoDB',
      sourcesCount: 0,
      broadcastsCount: 0,
      telegramConfigured: false,
    };
  }
}
