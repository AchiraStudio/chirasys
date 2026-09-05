import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface TitleBarProps {
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightExtra?: React.ReactNode;
}

export default function TitleBar({
  className = '',
  theme = 'auto',
  leftContent,
  centerContent,
  rightExtra,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const themeContext = useTheme();

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);

    let unlisten: (() => void) | undefined;
    win.onResized(async () => {
      const max = await win.isMaximized();
      setIsMaximized(max);
    }).then(fn => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const minimize   = () => getCurrentWindow().minimize();
  const toggleMax  = () => isMaximized ? getCurrentWindow().unmaximize() : getCurrentWindow().maximize();
  const close      = () => getCurrentWindow().close();

  // Determine active theme
  const effectiveTheme = theme === 'auto' ? (themeContext?.theme || 'dark') : theme;
  const isDark = effectiveTheme === 'dark';

  const barBg = isDark
    ? 'bg-[#0B0F19] border-b border-slate-800/80 text-slate-300'
    : 'bg-white border-b border-slate-200 text-slate-700';

  const btnStyle = isDark
    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

  return (
    <div
      data-tauri-drag-region
      className={`
        h-9 shrink-0 w-full
        ${barBg}
        select-none relative flex items-center justify-between
        transition-colors duration-200
        z-50
        ${className}
      `}
    >
      {/* Left side: custom leftContent or spacer */}
      <div data-tauri-drag-region className="flex items-center h-full z-10 pl-3">
        {leftContent}
      </div>

      {/* Centered title – absolutely positioned for perfect balance */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {centerContent || (
          <span className={`text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <span>Kivo</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand/10 text-brand font-mono">Platform</span>
          </span>
        )}
      </div>

      {/* Right: extra actions + Windows window controls */}
      <div className="flex items-center h-full shrink-0 z-10">
        {rightExtra}

        {/* Minimize */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={minimize}
          className={`h-full w-11 flex items-center justify-center transition-colors ${btnStyle}`}
          title="Minimize"
        >
          <Minus size={14} strokeWidth={2} />
        </button>

        {/* Maximize / Restore */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={toggleMax}
          className={`h-full w-11 flex items-center justify-center transition-colors ${btnStyle}`}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized
            ? <Copy size={12} strokeWidth={2} />
            : <Square size={12} strokeWidth={2} />}
        </button>

        {/* Close */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={close}
          className="h-full w-11 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors text-slate-400 hover:text-white"
          title="Close"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

