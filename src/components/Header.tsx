'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Moon, Sun, Bookmark, X, Settings } from 'lucide-react';
import { NexusLogo } from './NexusLogo';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeSearch: string;
  bookmarkCount: number;
  showBookmarks: boolean;
  onToggleBookmarks: () => void;
  articleCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  activeSearch,
  bookmarkCount,
  showBookmarks,
  onToggleBookmarks,
}) => {
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
    if (window.innerWidth <= 768) {
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          {/* Brand */}
          <div className="brand-section">
            <NexusLogo size={32} />
          </div>

          {/* Desktop Search */}
          <div className="desktop-search-container desktop-only">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <span className="search-icon">
                <Search size={15} />
              </span>
              <input
                id="header-search-input"
                type="text"
                placeholder="Search headlines..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input"
              />
            </form>
          </div>

          {/* Header Action Buttons */}
          <div className="header-actions">
            {/* Mobile Search Toggle Button */}
            <button
              id="mobile-search-toggle-btn"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`btn-icon mobile-only ${mobileSearchOpen ? 'active' : ''}`}
              title="Search"
              aria-label="Toggle Search"
            >
              {mobileSearchOpen ? <X size={16} /> : <Search size={16} />}
            </button>

            {/* Bookmarks Toggle */}
            <button
              id="bookmarks-toggle-btn"
              onClick={onToggleBookmarks}
              className={`btn-icon ${showBookmarks ? 'active' : ''}`}
              title="Saved Articles"
              aria-label="Saved Articles"
              style={{ position: 'relative' }}
            >
              <Bookmark size={16} fill={showBookmarks ? 'currentColor' : 'none'} />
              {bookmarkCount > 0 && (
                <span className="bookmark-counter-badge">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="btn-icon"
              title="Toggle Dark / Light Mode"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Admin Control Dashboard link */}
            <Link
              href="/admin"
              className="btn-icon"
              title="Open Admin Control Center"
              aria-label="Admin Control"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--border-color)',
              }}
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        {mobileSearchOpen && (
          <div className="mobile-search-bar mobile-only">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <span className="search-icon" style={{ left: '10px' }}>
                  <Search size={15} />
                </span>
                <input
                  id="mobile-search-input"
                  type="text"
                  autoFocus
                  placeholder="Search headlines or topics..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', height: '40px' }}
                />
              </div>
              <button type="submit" className="btn-primary-action" style={{ height: '40px', padding: '0 14px' }}>
                Search
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};
