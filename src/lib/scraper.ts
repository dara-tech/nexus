import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { NEWS_SOURCES } from './sources';
import { NewsArticle, ScrapedFullArticle } from './types';
import { getConfiguredSources } from './configService';

// Custom fields to capture media, enclosures, and thumbnails from diverse RSS feeds
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Upgrade low-resolution CDN thumbnails to crisp, high-definition imagery
 */
function upgradeToHighQualityImage(url?: string): string | undefined {
  if (!url) return undefined;

  let upgraded = url.trim();

  // BBC News: Upgrade 128px / 240px / 320px / 480px thumbnails to 1024px HD
  if (upgraded.includes('bbci.co.uk')) {
    upgraded = upgraded.replace(/\/(standard|news)\/\d+\//i, '/$1/1024/');
    upgraded = upgraded.replace(/_\d+x\d+\.(jpg|png|webp)/i, '_976x549.$1');
  }

  // The Guardian: Only upgrade width if not signed with s= signature
  if (upgraded.includes('guim.co.uk') && !upgraded.includes('s=')) {
    if (upgraded.includes('width=')) {
      upgraded = upgraded.replace(/width=\d+/, 'width=1000');
    } else {
      upgraded += (upgraded.includes('?') ? '&' : '?') + 'width=1000';
    }
  }

  // NPR News: Upgrade -s300- / -s400- to -s1200-
  if (upgraded.includes('npr.org')) {
    upgraded = upgraded.replace(/-s\d+-/i, '-s1200-');
  }

  // TechCrunch / WordPress VIP: Upgrade ?w=300 to ?w=1024 and remove downscale resize
  if (upgraded.includes('techcrunch.com') || upgraded.includes('wp.com')) {
    upgraded = upgraded.replace(/(\?|&)w=\d+/, '$1w=1024');
    upgraded = upgraded.replace(/(\?|&)resize=\d+,\d+/, '');
  }

  // Vox Media / The Verge: Upgrade w_300 to w_1024
  if (upgraded.includes('vox-cdn.com')) {
    upgraded = upgraded.replace(/w_\d+/i, 'w_1024');
  }

  // CNN: Upgrade _small / _medium / _large to _super
  if (upgraded.includes('cnn.com')) {
    upgraded = upgraded.replace(/_(small|medium|large|extra_large)_16x9/i, '_super_16x9');
  }

  // Reuters
  if (upgraded.includes('reuters.com')) {
    upgraded = upgraded.replace(/w=\d+/, 'w=1024');
  }

  return upgraded;
}

/**
 * Extract image URL from diverse RSS formats, then upgrade to high quality
 */
function extractImage(item: any): string | undefined {
  let rawUrl: string | undefined = undefined;

  // 1. Check enclosure (audio/video vs image)
  if (item.enclosure?.url) {
    const type = item.enclosure.type || '';
    if (!type || type.startsWith('image') || item.enclosure.url.match(/\.(jpg|jpeg|png|webp)/i)) {
      rawUrl = item.enclosure.url;
    }
  }

  // 2. Check media:content (array or single object) - pick highest width (e.g. 700px in Guardian)
  if (!rawUrl && item.mediaContent) {
    const list = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    let bestUrl: string | undefined = undefined;
    let maxWidth = 0;
    for (const m of list) {
      const u = m?.['$']?.url || m?.url;
      const w = parseInt(m?.['$']?.width || m?.width || '0', 10);
      if (u) {
        if (w >= maxWidth) {
          maxWidth = w;
          bestUrl = u;
        }
      }
    }
    rawUrl = bestUrl || (list[0]?.['$']?.url || list[0]?.url);
  }

  // 3. Check media:group -> media:content
  if (!rawUrl && item.mediaGroup?.['media:content']) {
    const groupContent = item.mediaGroup['media:content'];
    const list = Array.isArray(groupContent) ? groupContent : [groupContent];
    for (const m of list) {
      const u = m?.['$']?.url || m?.url;
      if (u) {
        rawUrl = u;
        break;
      }
    }
  }

  // 4. Check media:thumbnail
  if (!rawUrl && item.mediaThumbnail) {
    const list = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
    for (const m of list) {
      const u = m?.['$']?.url || m?.url;
      if (u) {
        rawUrl = u;
        break;
      }
    }
  }

  // 5. Check HTML inside content:encoded, content, summary, or description
  if (!rawUrl) {
    const htmlContent = item.contentEncoded || item.content || item.summary || (item as any).description || '';
    if (htmlContent && typeof htmlContent === 'string') {
      const match = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        const candidate = match[1];
        if (
          !candidate.includes('feedburner') &&
          !candidate.includes('1x1') &&
          !candidate.includes('pixel') &&
          !candidate.includes('beacon') &&
          !candidate.includes('gravatar')
        ) {
          rawUrl = candidate;
        }
      }
    }
  }

  return upgradeToHighQualityImage(rawUrl);
}

// Global In-Memory Cache for fast O(1) OpenGraph image retrieval
const ogImageCache = new Map<string, string>();

/**
 * Fast resolution of OpenGraph / Twitter meta images directly from article webpages
 * Uses head-only streaming (up to 64KB) for < 250ms extraction and caches results.
 */
export async function resolveArticleImage(url?: string): Promise<string | undefined> {
  if (!url || !url.startsWith('http')) return undefined;
  if (ogImageCache.has(url)) return ogImageCache.get(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return undefined;

    const reader = res.body?.getReader();
    if (!reader) return undefined;

    let received = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += new TextDecoder().decode(value);
      if (received.includes('</head>') || received.length > 65536) {
        controller.abort();
        break;
      }
    }

    const $ = cheerio.load(received);
    const rawOgImg =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('meta[property="og:image:secure_url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content');

    const upgraded = upgradeToHighQualityImage(rawOgImg);
    if (upgraded) {
      ogImageCache.set(url, upgraded);
      return upgraded;
    }
  } catch {
    // Return undefined on error or abort
  }
  return undefined;
}


/**
 * Clean and decode HTML entities in article titles
 */
function cleanTitle(rawTitle?: string): string {
  if (!rawTitle) return 'Untitled Article';
  const $ = cheerio.load(rawTitle);
  return $.text().replace(/\s+/g, ' ').trim() || rawTitle;
}

/**
 * Clean HTML and extract clean text summary
 */
function cleanSnippet(rawText: string, maxLength = 220): string {
  if (!rawText) return '';
  const $ = cheerio.load(rawText);
  const text = $.text().replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Fetch and parse news from RSS feeds with error handling and deduplication
 */
export async function fetchAggregatedNews(options: {
  sourceId?: string;
  category?: string;
  search?: string;
}): Promise<NewsArticle[]> {
  const { sourceId, category, search } = options;

  const dbSources = await getConfiguredSources();
  let sourcesToFetch = dbSources.filter((s) => s.enabled !== false);

  if (sourceId && sourceId !== 'all') {
    sourcesToFetch = sourcesToFetch.filter((s) => s.id === sourceId);
  } else if (category && category !== 'all') {
    sourcesToFetch = sourcesToFetch.filter((s) => s.category === category || s.category === 'all');
  }

  // Dynamic Google News Search RSS feed if search query provided
  const customFeeds: {
    sourceConfig: { id: string; name: string; brandColor: string; category: any };
    url: string;
  }[] = [];

  if (search && search.trim()) {
    const query = encodeURIComponent(search.trim());
    customFeeds.push({
      sourceConfig: {
        id: 'google-search',
        name: `Google News: "${search.trim()}"`,
        brandColor: '#4285f4',
        category: 'all',
      },
      url: `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
    });
  }

  // Fetch all in parallel with individual error handling
  const feedPromises = [
    ...sourcesToFetch.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.rssUrl);
        return (feed.items || []).slice(0, 15).map((item, idx): NewsArticle => {
          const rawSnippet = item.contentSnippet || item.summary || item.content || (item as any).description || '';
          return {
            id: `${source.id}-${item.guid || item.link || idx}`,
            title: cleanTitle(item.title),
            link: item.link || '#',
            sourceId: source.id,
            sourceName: source.name,
            category: source.category,
            pubDate: item.pubDate || new Date().toISOString(),
            isoDate: item.isoDate || item.pubDate,
            snippet: cleanSnippet(rawSnippet),
            imageUrl: extractImage(item),
            author: item.creator || (item as any)['dc:creator'] || undefined,
            brandColor: source.brandColor,
            logoUrl: source.logoUrl,
          };
        });
      } catch (err) {
        console.error(`[Scraper] Failed to fetch feed ${source.name}:`, err);
        return [];
      }
    }),
    ...customFeeds.map(async (custom) => {
      try {
        const feed = await parser.parseURL(custom.url);
        return (feed.items || []).slice(0, 20).map((item, idx): NewsArticle => {
          const rawSnippet = item.contentSnippet || item.summary || item.content || (item as any).description || '';
          return {
            id: `${custom.sourceConfig.id}-${item.guid || item.link || idx}`,
            title: cleanTitle(item.title),
            link: item.link || '#',
            sourceId: custom.sourceConfig.id,
            sourceName: custom.sourceConfig.name,
            category: 'all',
            pubDate: item.pubDate || new Date().toISOString(),
            isoDate: item.isoDate || item.pubDate,
            snippet: cleanSnippet(rawSnippet),
            imageUrl: extractImage(item),
            author: item.creator,
            brandColor: custom.sourceConfig.brandColor,
            logoUrl: 'https://www.google.com/s2/favicons?domain=news.google.com&sz=64',
          };
        });
      } catch (err) {
        console.error(`[Scraper] Failed custom search feed:`, err);
        return [];
      }
    }),
  ];

  const results = await Promise.allSettled(feedPromises);
  const allArticles: NewsArticle[] = [];

  for (const res of results) {
    if (res.status === 'fulfilled') {
      allArticles.push(...res.value);
    }
  }

  // Deduplicate by normalized title
  const seen = new Set<string>();
  const deduplicated: NewsArticle[] = [];

  for (const art of allArticles) {
    const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key) && art.title && art.link) {
      seen.add(key);
      deduplicated.push(art);
    }
  }

  // Sort by date descending
  deduplicated.sort((a, b) => {
    const dateA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const dateB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return dateB - dateA;
  });

  // Automatically enrich articles missing RSS images with their real OpenGraph hero images
  const missingImageArticles = deduplicated.filter(
    (art) => !art.imageUrl && art.link && art.link.startsWith('http')
  );
  if (missingImageArticles.length > 0) {
    await Promise.allSettled(
      missingImageArticles.slice(0, 15).map(async (art) => {
        const resolved = await resolveArticleImage(art.link);
        if (resolved) {
          art.imageUrl = resolved;
        }
      })
    );
  }

  return deduplicated;
}

/**
 * Scrape full article text & content from an external news article URL
 */
export async function scrapeFullArticle(targetUrl: string): Promise<ScrapedFullArticle> {
  const urlObj = new URL(targetUrl);
  const domain = urlObj.hostname.replace(/^www\./, '');

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article (Status: ${response.status} ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove clutter
  $('script, style, noscript, nav, header, footer, iframe, form, aside, .advertisement, .ad, .social-share, .newsletter-signup').remove();

  // Extract title
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Article';

  const byline =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text().trim() ||
    $('.byline, .author-name').first().text().trim() ||
    undefined;

  const publishedTime =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="pubdate"]').attr('content') ||
    $('time').first().text().trim() ||
    undefined;

  const rawLeadImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('article img').first().attr('src') ||
    undefined;

  const leadImage = upgradeToHighQualityImage(rawLeadImage);
  if (leadImage) {
    ogImageCache.set(targetUrl, leadImage);
  }

  // Extract paragraphs
  const paragraphs: string[] = [];
  const articleContainer = $('article, [role="main"], main, .article-body, .story-body, .post-content');
  const container = articleContainer.length > 0 ? articleContainer : $('body');

  container.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 40 && !text.toLowerCase().includes('subscribe') && !text.toLowerCase().includes('cookie')) {
      paragraphs.push(text);
    }
  });

  const totalWords = paragraphs.join(' ').split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.round(totalWords / 200));

  return {
    url: targetUrl,
    title,
    byline,
    publishedTime,
    leadImage,
    contentHtml: paragraphs.map((p) => `<p>${p}</p>`).join(''),
    paragraphs,
    readingTimeMinutes,
    domain,
  };
}
