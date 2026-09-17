import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const KivoMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <rect width="48" height="48" rx="11" fill="#CB3CFF" />
    <path d="M13.5 11.5h5.6v25h-5.6z" fill="#fff" />
    <path d="M23.5 24 33.6 11.5h6.9L30 24z" fill="#fff" />
    <path d="M23.5 24H30l10.5 12.5h-6.9z" fill="#00C2FF" />
  </svg>
);

export const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, showText = true, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <KivoMark size={size} />
      {showText && <span className="text-heading text-lg font-extrabold tracking-tight">Kivo</span>}
    </span>
  );
};

export default BrandLogo;
