'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  User,
  Globe,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Type,
  Sun,
  Moon,
  BookOpen,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ScrapedFullArticle, NewsArticle } from '@/lib/types';

type ReaderTheme = 'light' | 'sepia' | 'dark';
type FontFamily = 'serif' | 'sans';

export function InstantViewReader() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get('url');
  const initialTitle = searchParams.get('title') || '';
  const initialSource = searchParams.get('source') || '';

  const [url, setUrl] = useState<string>(rawUrl || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapedFullArticle | null>(null);

  // Reader customization state
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<ReaderTheme>('dark');
  const [fontFamily, setFontFamily] = useState<FontFamily>('serif');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Audio Text-to-speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Bookmark & Share status
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize preferences
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('nexus_reader_theme') as ReaderTheme;
      if (savedTheme) setTheme(savedTheme);

      const savedFont = localStorage.getItem('nexus_reader_font') as FontFamily;
      if (savedFont) setFontFamily(savedFont);

      const savedSize = localStorage.getItem('nexus_reader_size');
      if (savedSize) setFontSize(Number(savedSize));

      if (rawUrl) {
        const savedBookmarks = localStorage.getItem('nexus_news_bookmarks');
        if (savedBookmarks) {
          const list: NewsArticle[] = JSON.parse(savedBookmarks);
          setIsBookmarked(list.some((b) => b.link === rawUrl));
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage preferences', e);
    }
  }, [rawUrl]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch article content
  const loadArticle = async (targetUrl: string) => {
    if (!targetUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Unable to extract clean article text.');
      }
      setData(json.article);
    } catch (err: any) {
      setError(err.message || 'Failed to extract content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rawUrl) {
      setUrl(rawUrl);
      loadArticle(rawUrl);
    } else {
      setLoading(false);
      setError('No article URL specified. Return to the dashboard to select an article.');
    }

    return () => {
      // Cancel speech synthesis if leaving page
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [rawUrl]);

  // Toggle Theme
  const changeTheme = (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('nexus_reader_theme', newTheme);
    } catch {}
  };

  // Toggle Font Family
  const changeFontFamily = (family: FontFamily) => {
    setFontFamily(family);
    try {
      localStorage.setItem('nexus_reader_font', family);
    } catch {}
  };

  // Adjust Font Size
  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(26, Math.max(14, prev + delta));
      try {
        localStorage.setItem('nexus_reader_size', String(next));
      } catch {}
      return next;
    });
  };

  // Text-To-Speech Controller
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const titleText = data?.title || initialTitle;
    const bodyText = (data?.paragraphs || []).join('. ');
    const fullText = `${titleText}. ${bodyText}`;

    if (!fullText.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Bookmark toggle
  const toggleBookmark = () => {
    if (!url) return;
    try {
      const saved = localStorage.getItem('nexus_news_bookmarks');
      let list: NewsArticle[] = saved ? JSON.parse(saved) : [];
      if (isBookmarked) {
        list = list.filter((b) => b.link !== url);
        setIsBookmarked(false);
      } else {
        const item: NewsArticle = {
          id: `bookmark-${Date.now()}`,
          title: data?.title || initialTitle || 'Saved Article',
          link: url,
          sourceName: data?.domain || initialSource || 'Web',
          sourceId: 'custom',
          category: 'all',
          pubDate: data?.publishedTime || new Date().toISOString(),
          snippet: data?.paragraphs?.[0]?.slice(0, 200) || '',
          imageUrl: data?.leadImage,
          brandColor: '#38bdf8',
        };
        list.unshift(item);
        setIsBookmarked(true);
      }
      localStorage.setItem('nexus_news_bookmarks', JSON.stringify(list));
    } catch (e) {
      console.error('Bookmark toggle failed', e);
    }
  };

  // Copy link
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const domainName = useMemo(() => {
    if (data?.domain) return data.domain;
    if (initialSource) return initialSource;
    try {
      if (url) return new URL(url).hostname.replace(/^www\./, '');
    } catch {}
    return 'Web Article';
  }, [data?.domain, initialSource, url]);

  // Visual Theme styles
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'sepia':
        return {
          bg: '#fbf0d9',
          bodyBg: '#f4e6c7',
          text: '#2c2217',
          muted: '#6f5e4f',
          border: '#e4d3b6',
          cardBg: '#fef7e7',
          accent: '#b45309',
        };
      case 'light':
        return {
          bg: '#ffffff',
          bodyBg: '#f8fafc',
          text: '#0f172a',
          muted: '#475569',
          border: '#e2e8f0',
          cardBg: '#ffffff',
          accent: '#2563eb',
        };
      case 'dark':
      default:
        return {
          bg: '#0f172a',
          bodyBg: '#0b1120',
          text: '#f1f5f9',
          muted: '#94a3b8',
          border: '#1e293b',
          cardBg: '#131d33',
          accent: '#38bdf8',
        };
    }
  }, [theme]);

  return (
    <div
      className="instant-view-container"
      style={{
        backgroundColor: themeStyles.bodyBg,
        color: themeStyles.text,
        minHeight: '100vh',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* 1. Scroll Progress Bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'transparent',
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollProgress}%`,
            backgroundColor: themeStyles.accent,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* 2. Top Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          backgroundColor: themeStyles.bg,
          borderBottom: `1px solid ${themeStyles.border}`,
          backdropFilter: 'blur(8px)',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Left: Back button & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/"
              className="iv-action-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: themeStyles.text,
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${themeStyles.border}`,
                backgroundColor: themeStyles.cardBg,
              }}
              title="Return to Nexus Wire"
            >
              <ArrowLeft size={16} />
              <span className="desktop-text">Feed</span>
            </Link>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Zap size={13} fill="currentColor" />
              <span>Instant View</span>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Audio Text to Speech */}
            <button
              onClick={toggleSpeech}
              className={`iv-action-btn ${isSpeaking ? 'active-pulse' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: `1px solid ${isSpeaking ? themeStyles.accent : themeStyles.border}`,
                backgroundColor: isSpeaking ? 'rgba(56, 189, 248, 0.15)' : themeStyles.cardBg,
                color: isSpeaking ? themeStyles.accent : themeStyles.text,
                cursor: 'pointer',
              }}
              title={isSpeaking ? 'Stop audio playback' : 'Listen to story'}
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span className="desktop-text">{isSpeaking ? 'Stop' : 'Listen'}</span>
            </button>

            {/* Typography Controls (Size & Font) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: themeStyles.cardBg,
                border: `1px solid ${themeStyles.border}`,
                borderRadius: '6px',
                padding: '2px',
              }}
            >
              <button
                onClick={() => adjustFontSize(-2)}
                disabled={fontSize <= 14}
                style={{
                  background: 'none',
                  border: 'none',
                  color: themeStyles.text,
                  padding: '4px 8px',
                  cursor: fontSize <= 14 ? 'not-allowed' : 'pointer',
                  opacity: fontSize <= 14 ? 0.4 : 1,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
                title="Decrease font size"
              >
                A-
              </button>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: themeStyles.muted,
                  padding: '0 4px',
                  userSelect: 'none',
                }}
              >
                {fontSize}
              </span>
              <button
                onClick={() => adjustFontSize(2)}
                disabled={fontSize >= 26}
                style={{
                  background: 'none',
                  border: 'none',
                  color: themeStyles.text,
                  padding: '4px 8px',
                  cursor: fontSize >= 26 ? 'not-allowed' : 'pointer',
                  opacity: fontSize >= 26 ? 0.4 : 1,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
                title="Increase font size"
              >
                A+
              </button>
              <button
                onClick={() => changeFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
                style={{
                  background: 'none',
                  borderLeft: `1px solid ${themeStyles.border}`,
                  color: themeStyles.text,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
                title={`Switch to ${fontFamily === 'serif' ? 'Sans-serif' : 'Serif'}`}
              >
                {fontFamily === 'serif' ? 'Serif' : 'Sans'}
              </button>
            </div>

            {/* Theme Picker */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: themeStyles.cardBg,
                border: `1px solid ${themeStyles.border}`,
                borderRadius: '6px',
                padding: '2px',
              }}
            >
              <button
                onClick={() => changeTheme('light')}
                style={{
                  background: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  color: themeStyles.text,
                  padding: '5px 7px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                title="Light Theme"
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => changeTheme('sepia')}
                style={{
                  background: theme === 'sepia' ? 'rgba(180, 83, 9, 0.18)' : 'none',
                  border: 'none',
                  color: '#b45309',
                  padding: '5px 7px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                title="Sepia Paper Theme"
              >
                <BookOpen size={14} />
              </button>
              <button
                onClick={() => changeTheme('dark')}
                style={{
                  background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'none',
                  border: 'none',
                  color: themeStyles.text,
                  padding: '5px 7px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                title="OLED Dark Theme"
              >
                <Moon size={14} />
              </button>
            </div>

            {/* Bookmark button */}
            <button
              onClick={toggleBookmark}
              style={{
                background: themeStyles.cardBg,
                border: `1px solid ${themeStyles.border}`,
                color: isBookmarked ? '#eab308' : themeStyles.text,
                padding: '6px 9px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
            >
              <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            {/* Share / Copy button */}
            <button
              onClick={copyShareLink}
              style={{
                background: themeStyles.cardBg,
                border: `1px solid ${themeStyles.border}`,
                color: copied ? '#10b981' : themeStyles.text,
                padding: '6px 9px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
              title="Copy instant view link"
            >
              {copied ? <Check size={15} /> : <Share2 size={15} />}
              {copied && <span style={{ fontSize: '0.72rem' }}>Copied</span>}
            </button>

            {/* Open Source */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
                title="Open original article on publisher site"
              >
                <ExternalLink size={14} />
                <span className="desktop-text">Source</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Editorial Reader Body */}
      <main
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '40px 20px 80px',
        }}
      >
        {/* Source metadata pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: themeStyles.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Globe size={14} />
              {domainName}
            </span>

            {data?.readingTimeMinutes && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  color: themeStyles.muted,
                }}
              >
                • <Clock size={13} /> {data.readingTimeMinutes} min read
              </span>
            )}
          </div>

          {data?.publishedTime && (
            <span style={{ fontSize: '0.8rem', color: themeStyles.muted }}>
              {new Date(data.publishedTime).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Article Headline */}
        <h1
          style={{
            fontSize: 'clamp(1.9rem, 4vw, 2.7rem)',
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: '-0.025em',
            marginBottom: '20px',
            fontFamily:
              fontFamily === 'serif'
                ? 'Georgia, Cambria, "Times New Roman", serif'
                : 'var(--font-sans)',
          }}
        >
          {data?.title || initialTitle || 'Loading Article...'}
        </h1>

        {/* Byline / Author */}
        {data?.byline && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              color: themeStyles.muted,
              marginBottom: '24px',
              fontStyle: 'italic',
            }}
          >
            <User size={15} />
            <span>By {data.byline}</span>
          </div>
        )}

        {/* Lead Hero Image */}
        {data?.leadImage && (
          <div
            style={{
              margin: '28px 0 34px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: themeStyles.cardBg,
              border: `1px solid ${themeStyles.border}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.leadImage}
              alt={data.title || 'Story image'}
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div
              style={{
                padding: '8px 14px',
                fontSize: '0.76rem',
                color: themeStyles.muted,
                borderTop: `1px solid ${themeStyles.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Editorial wire photograph</span>
              <span>{domainName}</span>
            </div>
          </div>
        )}

        {/* Loading state skeleton */}
        {loading && (
          <div style={{ marginTop: '24px' }}>
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '100%',
                marginBottom: '12px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '94%',
                marginBottom: '12px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '98%',
                marginBottom: '12px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '85%',
                marginBottom: '28px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '97%',
                marginBottom: '12px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
            <div
              className="iv-skeleton"
              style={{
                height: '18px',
                width: '90%',
                marginBottom: '12px',
                borderRadius: '4px',
                background: themeStyles.border,
              }}
            />
          </div>
        )}

        {/* Error notification banner */}
        {error && !loading && (
          <div
            style={{
              padding: '24px',
              borderRadius: '10px',
              backgroundColor: themeStyles.cardBg,
              border: `1px solid ${themeStyles.border}`,
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
              Full Extraction Restricted
            </h3>
            <p style={{ fontSize: '0.88rem', color: themeStyles.muted, marginBottom: '18px' }}>
              {error} (The publisher site may require a direct login or paywall subscription).
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: themeStyles.accent,
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <ExternalLink size={15} />
                <span>Read Full Story on Publisher Site</span>
              </a>
            )}
          </div>
        )}

        {/* Clean Article Paragraphs */}
        {data && !loading && (
          <article
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.82,
              fontFamily:
                fontFamily === 'serif'
                  ? 'Georgia, Cambria, "Times New Roman", serif'
                  : 'var(--font-sans)',
            }}
          >
            {data.paragraphs && data.paragraphs.length > 0 ? (
              data.paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  style={{
                    marginBottom: '1.4em',
                    letterSpacing: '-0.005em',
                  }}
                  className={idx === 0 ? 'iv-first-paragraph' : ''}
                >
                  {para}
                </p>
              ))
            ) : (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: themeStyles.cardBg,
                  border: `1px solid ${themeStyles.border}`,
                  textAlign: 'center',
                }}
              >
                <p style={{ marginBottom: '12px', color: themeStyles.muted }}>
                  The publisher content requires an active browser session or subscription.
                </p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: themeStyles.accent,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Open on {domainName} <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </article>
        )}

        {/* End of article footer banner */}
        {!loading && (data || error) && (
          <div
            style={{
              marginTop: '50px',
              paddingTop: '24px',
              borderTop: `1px solid ${themeStyles.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: themeStyles.cardBg,
                  border: `1px solid ${themeStyles.border}`,
                  color: themeStyles.text,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <ArrowLeft size={15} />
                <span>Return to Live Wire</span>
              </Link>

              {url && (
                <button
                  onClick={() => loadArticle(url)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: themeStyles.cardBg,
                    border: `1px solid ${themeStyles.border}`,
                    color: themeStyles.text,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Re-extract article"
                >
                  <RefreshCw size={14} />
                  <span>Refresh Text</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.78rem', color: themeStyles.muted }}>
              ⚡ Nexus Instant View • Clean Ad-Free Wire
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .iv-action-btn:hover {
          opacity: 0.85;
        }
        .active-pulse {
          animation: pulseGlow 1.5s infinite;
        }
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(56, 189, 248, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0);
          }
        }
        .iv-skeleton {
          animation: skeletonShimmer 1.4s ease-in-out infinite;
        }
        @keyframes skeletonShimmer {
          0% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0.4;
          }
        }
        @media (max-width: 640px) {
          .desktop-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
