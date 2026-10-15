'use client';

import React from 'react';

interface NexusLogoProps {
  className?: string;
  size?: number;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({ className = '', size = 34 }) => {
  return (
    <div className={`nexus-brand-wrapper ${className}`} title="Nexus News Wire">
      {/* 1. High-Resolution Generated Editorial Emblem */}
      <div className="nexus-brand-emblem" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nexus-logo.jpg"
          alt="Nexus Logo"
          className="nexus-brand-img"
          width={size}
          height={size}
        />
      </div>

      {/* 2. Authoritative Brand Title */}
      <span className="nexus-brand-title">
        NEXUS
      </span>

      {/* 3. Rounded-Full Button Badge */}
      <span className="nexus-brand-badge-pill">
        <span className="nexus-pill-live-dot" />
        WIRE
      </span>
    </div>
  );
};
