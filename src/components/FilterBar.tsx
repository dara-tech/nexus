'use client';

import React from 'react';
import { CATEGORIES, NEWS_SOURCES } from '@/lib/sources';
import { Layers } from 'lucide-react';

interface FilterBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  selectedSource: string;
  onSelectSource: (sourceId: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSource,
  onSelectSource,
}) => {
  return (
    <div>
      {/* Category Horizontal Navigation (BBC News style) */}
      <nav className="sub-nav">
        <div className="container">
          <div className="sub-nav-inner">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-nav-${cat.id}`}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`sub-nav-item ${isActive ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sources Strip with Consistent, Large Rounded-Full Logos */}
      <div className="container">
        <div className="sources-strip">
          <span className="outlets-heading">
            Outlets:
          </span>

          {/* All Outlets Button with Matching Circular Icon */}
          <button
            id="source-tag-all"
            onClick={() => onSelectSource('all')}
            className={`source-tag ${selectedSource === 'all' ? 'active' : ''}`}
          >
            <span className="source-all-icon-wrap">
              <Layers size={12} strokeWidth={2.5} />
            </span>
            <span>All Outlets</span>
          </button>

          {/* Individual Outlets with Circular Brand Logos */}
          {NEWS_SOURCES.map((source) => {
            const isActive = selectedSource === source.id;
            return (
              <button
                key={source.id}
                id={`source-tag-${source.id}`}
                onClick={() => onSelectSource(source.id)}
                className={`source-tag ${isActive ? 'active' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.logoUrl}
                  alt={source.name}
                  className="source-real-logo"
                  loading="lazy"
                  width={20}
                  height={20}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span>{source.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
