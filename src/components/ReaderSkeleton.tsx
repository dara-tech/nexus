'use client';

import React from 'react';

interface ReaderSkeletonProps {
  initialTitle?: string;
}

export const ReaderSkeleton: React.FC<ReaderSkeletonProps> = ({ initialTitle }) => {
  return (
    <div className="reader-skeleton-wrap" aria-busy="true" aria-label="Loading article content">
      {/* 1. Headline Skeleton or Initial Title */}
      {initialTitle ? (
        <h1 className="reader-headline" style={{ opacity: 0.9 }}>
          {initialTitle}
        </h1>
      ) : (
        <div className="reader-skeleton-title-group">
          <div className="skeleton-pulse-block skeleton-line-title" style={{ width: '92%' }} />
          <div className="skeleton-pulse-block skeleton-line-title" style={{ width: '78%' }} />
        </div>
      )}

      {/* 2. Meta Row Skeleton */}
      <div className="reader-skeleton-meta-row">
        <div className="skeleton-pulse-block skeleton-pill-small" style={{ width: '110px' }} />
        <div className="skeleton-pulse-block skeleton-pill-small" style={{ width: '85px' }} />
        <div className="skeleton-pulse-block skeleton-pill-small" style={{ width: '95px' }} />
      </div>

      {/* 3. Hero / Lead Image Skeleton */}
      <div className="reader-skeleton-hero-image">
        <div className="skeleton-pulse-block full-size" />
      </div>

      {/* 4. Article Paragraphs Prose Skeleton */}
      <div className="reader-skeleton-prose">
        {/* Paragraph 1 */}
        <div className="reader-skeleton-paragraph">
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '100%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '98%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '92%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '74%' }} />
        </div>

        {/* Paragraph 2 */}
        <div className="reader-skeleton-paragraph">
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '100%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '95%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '88%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '60%' }} />
        </div>

        {/* Paragraph 3 */}
        <div className="reader-skeleton-paragraph">
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '97%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '94%' }} />
          <div className="skeleton-pulse-block skeleton-line-body" style={{ width: '68%' }} />
        </div>
      </div>
    </div>
  );
};
