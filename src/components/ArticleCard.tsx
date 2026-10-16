'use client';

import React, { useState } from 'react';
import { NewsArticle } from '@/lib/types';
import { ExternalLink, Bookmark, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

interface ArticleCardProps {
  article: NewsArticle;
  onReadFull: (article: NewsArticle) => void;
  isBookmarked: boolean;
  onToggleBookmark: (article: NewsArticle) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onReadFull,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [imgError, setImgError] = useState(false);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const hasValidImage = Boolean(article.imageUrl && !imgError);

  return (
    <article
      className={`article-item ${!hasValidImage ? 'text-only-card' : ''}`}
      id={`article-${article.id}`}
      onClick={() => onReadFull(article)}
      style={{ cursor: 'pointer' }}
    >
      {/* Thumbnail: Render ONLY when high-res image exists */}
      {hasValidImage && (
        <div className="article-thumbnail-box">
          <span className="article-source-label">
            {article.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.logoUrl}
                alt=""
                className="card-logo-icon"
                width={18}
                height={18}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <span>{article.sourceName}</span>
          </span>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title}
            className="article-thumbnail-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Content Body */}
      <div className="article-body-content">
        {/* If text-only card, show source badge inside the content header */}
        <div className="article-meta-line">
          {!hasValidImage && (
            <span className="article-source-inline-badge">
              {article.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.logoUrl}
                  alt=""
                  className="card-logo-icon"
                  width={18}
                  height={18}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <span>{article.sourceName}</span>
            </span>
          )}

          <span className="article-time-tag">
            <Clock size={12} />
            <span>{formatTime(article.isoDate || article.pubDate)}</span>
          </span>

          {article.author && <span className="article-author-tag">• {article.author}</span>}
        </div>

        <h3 className="article-headline" title={article.title}>
          {article.title}
        </h3>

        <p className="article-excerpt">
          {article.snippet || 'Tap to extract and read full article.'}
        </p>

        {/* Action Bar */}
        <div
          className="article-footer-bar"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            id={`read-btn-${article.id}`}
            href={`/read?url=${encodeURIComponent(article.link)}&title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.sourceName || '')}`}
            className="btn-read-article"
            title="Read in Instant View"
          >
            <Zap size={13} fill="currentColor" />
            <span>Instant View</span>
          </Link>

          <div className="article-actions-group">
            <button
              id={`bookmark-btn-${article.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(article);
              }}
              className={`btn-card-action ${isBookmarked ? 'active' : ''}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
              aria-label="Bookmark"
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            <a
              id={`ext-link-${article.id}`}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-card-action"
              title="Open original website"
              aria-label="Open source"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
