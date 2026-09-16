interface KivoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  variant?: 'gradient' | 'white' | 'monochrome';
}

/**
 * Official Kivo App Logo
 */
export default function KivoLogo({
  size = 32,
  className = '',
  showText = false,
  textClassName = '',
}: KivoLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/kivo.png"
        alt="Kivo"
        width={size}
        height={size}
        className="shrink-0 object-contain rounded-xl shadow-xs transition-transform duration-200"
        style={{ width: size, height: size }}
      />

      {showText && (
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`font-black tracking-tight text-heading ${textClassName || 'text-xl'}`}
          >
            Kivo
          </span>
          <span className="text-[10px] font-semibold text-primary tracking-widest uppercase opacity-90">
            Platform
          </span>
        </div>
      )}
    </div>
  );
}
