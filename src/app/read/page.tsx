import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { InstantViewReader } from '@/components/InstantViewReader';

export const metadata: Metadata = {
  title: 'Instant View Reader • Nexus Wire',
  description: 'Distraction-free high-speed article reader with clean typography and Instant View formatting.',
  openGraph: {
    title: 'Instant View Reader • Nexus Wire',
    description: 'Clean, distraction-free reading experience for news articles with Instant View formatting.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Instant View Reader • Nexus Wire',
    description: 'Clean, distraction-free reading experience for news articles.',
  },
};

function ReaderLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b1120',
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #1e293b',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px',
        }}
      />
      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Instant View Story...</p>
      <style>{`
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<ReaderLoadingFallback />}>
      <InstantViewReader />
    </Suspense>
  );
}
