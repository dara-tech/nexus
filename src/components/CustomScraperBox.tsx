'use client';

import React, { useState } from 'react';
import { Globe, ArrowRight } from 'lucide-react';

interface CustomScraperBoxProps {
  onScrapeUrl: (url: string) => void;
}

export const CustomScraperBox: React.FC<CustomScraperBoxProps> = ({ onScrapeUrl }) => {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onScrapeUrl(urlInput.trim());
    }
  };

  return (
    <div className="custom-scraper-section" id="custom-scraper-drawer">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Globe size={18} color="var(--accent-red)" />
        <strong style={{ fontSize: '0.95rem' }}>Extract & Read Any Article URL</strong>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        Paste any article link from BBC, NPR, Reuters, TechCrunch, or any blog to extract its text and imagery.
      </p>

      <form onSubmit={handleSubmit} className="custom-input-line">
        <input
          id="custom-scraper-url-input"
          type="url"
          required
          placeholder="https://www.bbc.com/news/articles/..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="custom-url-field"
        />
        <button
          id="custom-scraper-submit-btn"
          type="submit"
          className="btn-primary-action"
        >
          <span>Extract</span>
          <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
};
