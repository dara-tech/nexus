import React from 'react';

// Authentic Official Telegram Brand Logo
export const TelegramBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }}>
    <circle cx="12" cy="12" r="12" fill="#229ED9" />
    <path
      d="M5.4 12.06c3.96-1.72 6.6-2.86 7.93-3.41 3.78-1.57 4.56-1.84 5.08-1.85.11 0 .37.03.53.16.14.11.18.26.19.37.02.11.02.26.01.4-.18 1.94-.97 6.61-1.37 8.76-.17.91-.51 1.22-.83 1.25-.7.06-1.23-.46-1.91-.91-1.06-.7-1.66-1.13-2.69-1.81-1.19-.79-.42-1.22.26-1.92.18-.18 3.26-2.99 3.32-3.25.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.79 1.14-5.07 3.35-.48.33-.92.49-1.31.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.34-.37-1.29-.78.03-.22.33-.44.9-.66z"
      fill="#FFFFFF"
    />
  </svg>
);

// Authentic Official RSS Feed Brand Logo (Orange with white signal waves)
export const RssBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }}>
    <rect width="24" height="24" rx="5" fill="#FF7700" />
    <path
      d="M6.18 15.64a2.18 2.18 0 1 0 0 4.36 2.18 2.18 0 0 0 0-4.36zm-.18-6.14v3.1a7.4 7.4 0 0 1 7.4 7.4h3.1a10.5 10.5 0 0 0-10.5-10.5zm0-6.1v3.1c7.51 0 13.6 6.09 13.6 13.6h3.1C22.7 10.87 15.23 3.4 6 3.4z"
      fill="#FFFFFF"
    />
  </svg>
);

// Authentic Official MongoDB Atlas Leaf Brand Logo
export const MongoDbBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }}>
    <path
      d="M12.18 1.5a.72.72 0 0 0-.36.1C11.5 2 7.7 5.7 6.6 8.3c-1.3 3.1-.7 6.7 1.4 9.3 1.9 2.3 4.1 4.5 4.1 4.5s2.2-2.2 4.1-4.5c2.1-2.6 2.7-6.2 1.4-9.3-1.1-2.6-4.9-6.3-5.22-6.7a.72.72 0 0 0-.2-.1z"
      fill="#00ED64"
    />
    <path
      d="M12.18 1.5v20.7s2.2-2.2 4.1-4.5c2.1-2.6 2.7-6.2 1.4-9.3-1.1-2.6-4.9-6.3-5.22-6.7a.72.72 0 0 0-.28-.2z"
      fill="#00684A"
    />
    <path
      d="M12.18 22.2v-7.1c0-.1 0-.2.1-.2 1.2-1.3 2.1-2.9 2.5-4.6.1-.5.2-1 .2-1.5 0 0 .1.1.1.2 1.3 3.1.7 6.7-1.4 9.3-1.5 1.8-1.5 3.9-1.5 3.9z"
      fill="#023430"
    />
  </svg>
);

// Authentic Telemetry / Audit Log Console Icon
export const AuditLogBrandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block' }}>
    <rect width="24" height="24" rx="4" fill="#0D1F33" stroke="#1E3A5F" strokeWidth="1.5" />
    <path d="M5 8h4m-4 4h14m-14 4h9" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="8" r="2.2" fill="#10B981" />
  </svg>
);
