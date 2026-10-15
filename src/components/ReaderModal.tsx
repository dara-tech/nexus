'use client';

import React, { useEffect, useState } from 'react';
import { ScrapedFullArticle } from '@/lib/types';
import { X, ExternalLink, Clock, User, Globe, AlertCircle } from 'lucide-react';
import { ReaderSkeleton } from './ReaderSkeleton';

interface ReaderModalProps {
  url: string;
  initialTitle?: string;
  onClose: () => void;
  onImageDiscovered?: (url: string, imageUrl: string) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  url,
  initialTitle,
  onClose,
  onImageDiscovered,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapedFullArticle | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadScrapedContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Unable to extract article text.');
        }
        if (isMounted) {
          setData(json.article);
          if (json.article?.leadImage && onImageDiscovered) {
            onImageDiscovered(url, json.article.leadImage);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to extract article content.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadScrapedContent();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [url, onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="editorial-reader"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Reader Top Bar */}
        <div className="editorial-reader-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Globe size={14} />
            <span style={{ fontWeight: 600 }}>{data?.domain || 'Web Article'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              id="reader-view-original-link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{ height: '30px', fontSize: '0.78rem' }}
            >
              <ExternalLink size={13} />
              <span>Open source</span>
            </a>

            <button
              id="reader-close-btn"
              onClick={onClose}
              className="btn-icon"
              style={{ width: '30px', height: '30px' }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Reader Body */}
        <div className="editorial-reader-content">
          {loading && (
            <ReaderSkeleton initialTitle={initialTitle} />
          )}

          {error && !loading && (
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={28} color="var(--accent-red)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, marginBottom: '6px' }}>Direct extraction limited</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {error}
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-action"
              >
                Read directly on publisher site
              </a>
            </div>
          )}

          {data && !loading && (
            <div>
              <h1 className="reader-headline">{data.title || initialTitle}</h1>

              <div className="reader-meta-row">
                {data.byline && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    {data.byline}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} />
                  {data.readingTimeMinutes} min read
                </span>
                {data.publishedTime && (
                  <span>{new Date(data.publishedTime).toLocaleDateString()}</span>
                )}
              </div>

              {data.leadImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.leadImage}
                  alt={data.title}
                  className="reader-lead-image"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              <div>
                {data.paragraphs.length > 0 ? (
                  data.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
                ) : (
                  <p>
                    Full article text is behind a paywall or JavaScript wall. Click &apos;Open source&apos; to view on publisher site.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
