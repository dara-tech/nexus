export type NewsCategory = 
  | 'all'
  | 'world'
  | 'technology'
  | 'business'
  | 'science'
  | 'entertainment';

export interface NewsSourceConfig {
  id: string;
  name: string;
  category: NewsCategory;
  rssUrl: string;
  website: string;
  brandColor: string;
  badgeBg: string;
  badgeColor: string;
  logoUrl: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  sourceId: string;
  sourceName: string;
  category: NewsCategory;
  pubDate: string;
  isoDate?: string;
  snippet: string;
  imageUrl?: string;
  author?: string;
  brandColor: string;
  logoUrl?: string;
}

export interface ScrapedFullArticle {
  url: string;
  title: string;
  byline?: string;
  publishedTime?: string;
  leadImage?: string;
  contentHtml: string;
  paragraphs: string[];
  readingTimeMinutes: number;
  domain: string;
}
