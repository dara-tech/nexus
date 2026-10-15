'use client';

import React from 'react';

interface ArticleSkeletonProps {
  hasThumbnail?: boolean;
}

export const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ hasThumbnail = true }) => {
  return (
    <div className={`article-item skeleton-card-item ${!hasThumbnail ? 'text-only-card' : ''}`} aria-hidden="true">
      {/* 1. 16:9 Thumbnail Header with Floating Source Pill Skeleton */}
      {hasThumbnail && (
        <div className="article-thumbnail-box skeleton-thumb-box">
          {/* Floating Outlet Pill Badge Skeleton */}
          <div className="skeleton-floating-pill">
            <div className="skeleton-pulse-block skeleton-pill-circle" />
            <div className="skeleton-pulse-block skeleton-pill-text" />
          </div>

          {/* 16:9 Image Shimmer */}
          <div className="skeleton-pulse-block full-size" />
        </div>
      )}

      {/* 2. Body Content */}
      <div className="article-body-content">
        {/* Timestamp Row (e.g. 5m ago) */}
        <div className="skeleton-time-row">
          <div className="skeleton-pulse-block skeleton-time-icon" />
          <div className="skeleton-pulse-block skeleton-time-text" />
        </div>

        {/* Headline (2 lines) */}
        <div className="skeleton-headline-row">
          <div className="skeleton-pulse-block line-full" />
          <div className="skeleton-pulse-block line-70" />
        </div>

        {/* Excerpt Snippet (2 lines) */}
        <div className="skeleton-excerpt-row">
          <div className="skeleton-pulse-block line-90" />
          <div className="skeleton-pulse-block line-50" />
        </div>

        {/* Footer Actions (Read full + bookmark + external link) */}
        <div className="article-footer-bar" style={{ marginTop: 'auto', paddingTop: '10px' }}>
          <div className="skeleton-pulse-block button-block" />
          <div style={{ display: 'flex', gap: '6px' }}>
            <div className="skeleton-pulse-block icon-block" />
            <div className="skeleton-pulse-block icon-block" />
          </div>
        </div>
      </div>
    </div>
  );
};
