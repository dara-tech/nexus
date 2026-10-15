'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { NewsArticle } from '@/lib/types';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { ArticleCard } from './ArticleCard';
import { ArticleSkeleton } from './ArticleSkeleton';
import { Pagination } from './Pagination';
import { ReaderModal } from './ReaderModal';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const PAGE_SIZE = 12;

interface ToastNotification {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const NewsDashboard: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reader Modal state
  const [activeReaderArticle, setActiveReaderArticle] = useState<{
    url: string;
    title?: string;
  } | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<NewsArticle[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_news_bookmarks');
      if (saved) {
        setBookmarks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    }
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveBookmarks = (newBookmarks: NewsArticle[]) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem('nexus_news_bookmarks', JSON.stringify(newBookmarks));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  };

  const handleToggleBookmark = (article: NewsArticle) => {
    const exists = bookmarks.some((b) => b.id === article.id);
    if (exists) {
      saveBookmarks(bookmarks.filter((b) => b.id !== article.id));
    } else {
      saveBookmarks([article, ...bookmarks]);
    }
  };

  const handleImageDiscovered = (url: string, newImage: string) => {
    if (!url || !newImage) return;
    setArticles((prev) =>
      prev.map((art) => (art.link === url ? { ...art, imageUrl: newImage } : art))
    );
    setBookmarks((prev) => {
      const updated = prev.map((art) => (art.link === url ? { ...art, imageUrl: newImage } : art));
      try {
        localStorage.setItem('nexus_news_bookmarks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const loadNews = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (selectedSource !== 'all') params.set('source', selectedSource);
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const res = await fetch(`/api/news?${params.toString()}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch news articles.');
        }

        setArticles(data.articles || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching news.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedSource, selectedCategory, searchQuery]
  );

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowBookmarks(false);
    setCurrentPage(1);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSource('all');
    setShowBookmarks(false);
    setCurrentPage(1);
  };

  const handleSourceSelect = (src: string) => {
    setSelectedSource(src);
    setShowBookmarks(false);
    setCurrentPage(1);
  };

  const handleToggleBookmarksView = () => {
    setShowBookmarks(!showBookmarks);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination calculation
  const displayedArticles = showBookmarks ? bookmarks : articles;
  const totalPages = Math.ceil(displayedArticles.length / PAGE_SIZE);
  const paginatedArticles = displayedArticles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Header
        onSearch={handleSearch}
        activeSearch={searchQuery}
        bookmarkCount={bookmarks.length}
        showBookmarks={showBookmarks}
        onToggleBookmarks={handleToggleBookmarksView}
      />

      {/* BBC-style horizontal Category & Source Navigation */}
      {!showBookmarks && (
        <FilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          selectedSource={selectedSource}
          onSelectSource={handleSourceSelect}
        />
      )}

      {/* Main Content Area */}
      <main className="container" style={{ flexGrow: 1, paddingBottom: '32px' }}>
        {/* Bookmarks Header indicator */}
        {showBookmarks && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0 12px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Saved Articles ({bookmarks.length})</h2>
            <button
              onClick={() => setShowBookmarks(false)}
              className="btn-outline"
              style={{ fontSize: '0.8rem', height: '30px' }}
            >
              Back to Live Feed
            </button>
          </div>
        )}

        {/* Feed Grid */}
        {loading ? (
          <div className="news-feed-grid">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ArticleSkeleton key={i} hasThumbnail={true} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-feed-card">
            <AlertCircle size={32} color="var(--accent-red)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 600 }}>Feed Unavailable</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
              {error}
            </p>
            <button onClick={() => loadNews()} className="btn-outline">
              <span>Retry</span>
            </button>
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="empty-feed-card">
            <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>
              {showBookmarks ? 'No Saved Articles' : 'No Articles Found'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
              {showBookmarks
                ? 'Click the bookmark icon on any article to save it here for later reading.'
                : 'No articles matched your criteria.'}
            </p>
            {showBookmarks && (
              <button onClick={() => setShowBookmarks(false)} className="btn-outline">
                Back to Live Feed
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="news-feed-grid">
              {paginatedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onReadFull={(art) =>
                    setActiveReaderArticle({ url: art.link, title: art.title })
                  }
                  isBookmarked={bookmarks.some((b) => b.id === article.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>

            {/* Reusable Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={displayedArticles.length}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </main>

      {/* Reader Modal */}
      {activeReaderArticle && (
        <ReaderModal
          url={activeReaderArticle.url}
          initialTitle={activeReaderArticle.title}
          onClose={() => setActiveReaderArticle(null)}
          onImageDiscovered={handleImageDiscovered}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="floating-toast-container">
          <div className={`floating-toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertTriangle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Editorial Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '20px 0',
          marginTop: 'auto',
          backgroundColor: 'var(--bg-secondary)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>Nexus Wire • Clean Editorial Real-Time Syndication</span>
          <span>Sources: BBC, The Guardian, NPR, TechCrunch, Hacker News, The Verge, CNN</span>
        </div>
      </footer>
    </div>
  );
};
