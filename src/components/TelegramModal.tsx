'use client';

import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { NewsArticle } from '@/lib/types';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  article?: NewsArticle | null;
  savedChannelId: string;
  onSaveChannelId: (channelId: string) => void;
  onSuccess: (message: string) => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  article,
  savedChannelId,
  onSaveChannelId,
  onSuccess,
}) => {
  const [channelId, setChannelId] = useState(savedChannelId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = channelId.trim();
    if (!cleanId) {
      setError('Please enter a channel username (e.g. @your_channel) or channel ID.');
      return;
    }

    onSaveChannelId(cleanId);
    setError(null);

    if (!article) {
      // Just saving configuration
      onSuccess(`Telegram channel configured: ${cleanId}`);
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/telegram/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: {
            title: article.title,
            link: article.link,
            snippet: article.snippet,
            imageUrl: article.imageUrl,
            sourceName: article.sourceName,
          },
          chatId: cleanId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to push to Telegram channel.');
      }

      onSuccess(`Successfully posted to ${cleanId}!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error communicating with Telegram.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="telegram-modal-backdrop" onClick={onClose}>
      <div
        className="telegram-config-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="telegram-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="telegram-icon-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.5 2.5L2 10.2L9.5 13.5L18.5 6.5L12.5 15.5L19.5 21.5L21.5 2.5Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {article ? 'Push Article to Telegram' : 'Configure Telegram Channel'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Powered by @nexussnewsbot
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handlePush} className="telegram-modal-body">
          {/* Article Preview Card if an article is selected */}
          {article && (
            <div className="telegram-article-preview">
              <span className="telegram-preview-tag">{article.sourceName}</span>
              <p className="telegram-preview-title">{article.title}</p>
            </div>
          )}

          {/* Channel Input Field */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="telegram-channel-input" className="form-label">
              Telegram Channel Username or Chat ID:
            </label>
            <input
              id="telegram-channel-input"
              type="text"
              placeholder="@your_channel_name or -100xxxxxxxxxx"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="search-input"
              style={{ width: '100%', height: '42px', paddingLeft: '14px' }}
              autoFocus
            />
          </div>

          {/* Setup Instructions Box */}
          <div className="telegram-setup-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              <HelpCircle size={14} color="#0088cc" />
              <span>How to link your channel:</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>
                Open your Telegram Channel settings → <b>Administrators</b> → <b>Add Admin</b>.
              </li>
              <li>
                Search for <b>@nexussnewsbot</b> and grant permission to <b>Post Messages</b>.
              </li>
              <li>
                Enter your channel&apos;s public <b>@username</b> (or channel ID) above.
              </li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="telegram-error-banner">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              style={{ height: '38px', padding: '0 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-telegram-submit"
              id="telegram-submit-push-btn"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Posting...' : article ? 'Push to Channel' : 'Save Channel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
