interface KivoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  variant?: 'gradient' | 'white' | 'monochrome';
}

/**
 * Kivo Platform Mark
 * An abstract, geometric "K" platform node motif representing connected business operations
 * (POS, Inventory, Accounting, Cloud, and AI).
 */
export default function KivoLogo({
  size = 32,
  className = '',
  showText = false,
  textClassName = '',
  variant = 'gradient',
}: KivoLogoProps) {
  const isWhite = variant === 'white';
  const isMono = variant === 'monochrome';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
      >
        <defs>
          <linearGradient id="kivo-grad-primary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="0.5" stopColor="#4F46E5" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="kivo-grad-accent" x1="18" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="kivo-grad-bottom" x1="20" y1="20" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A855F7" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
          <filter id="kivo-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366F1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Rounded Container */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill={isWhite ? '#ffffff' : isMono ? 'currentColor' : 'url(#kivo-grad-primary)'}
          filter={!isWhite && !isMono ? 'url(#kivo-glow)' : undefined}
        />

        {/* Abstract "K" Geometric Platform Nodes */}
        {/* Central Vertical Spine / Pillar */}
        <rect
          x="12"
          y="12"
          width="6.5"
          height="24"
          rx="3.25"
          fill={isWhite ? '#4F46E5' : isMono ? '#000000' : '#FFFFFF'}
        />

        {/* Upper Dynamic Diagonal Arm / Node */}
        <path
          d="M21.5 24.5C21.5 22.8 22.6 21.2 24.2 20.2L32.2 15C33.8 14 36 15.2 36 17.1C36 18.2 35.4 19.3 34.4 20L27.5 24.5L34.6 30.2C35.6 31 36 32.2 36 33.3C36 35.2 33.8 36.3 32.2 35.1L24.2 28.8C22.6 27.8 21.5 26.2 21.5 24.5Z"
          fill={isWhite ? '#6366F1' : isMono ? '#ffffff' : '#F1F5F9'}
        />

        {/* Hub Accent Core Dot (representing the sync node / platform center) */}
        <circle
          cx="21.5"
          cy="24.5"
          r="3"
          fill={isWhite ? '#38BDF8' : '#38BDF8'}
        />
      </svg>

      {showText && (
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`font-black tracking-tight text-slate-900 dark:text-white ${textClassName || 'text-xl'}`}
          >
            Kivo
          </span>
          <span className="text-[10px] font-semibold text-brand tracking-widest uppercase opacity-90">
            Platform
          </span>
        </div>
      )}
    </div>
  );
}
