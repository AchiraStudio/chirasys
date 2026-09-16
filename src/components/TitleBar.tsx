import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

interface TitleBarProps {
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightExtra?: React.ReactNode;
}

export default function TitleBar({
  className = '',
  leftContent,
  centerContent,
  rightExtra,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

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

  return (
    <div
      data-tauri-drag-region
      className={`
        h-9 shrink-0 w-full
        bg-card border-b border-line text-body
        select-none relative flex items-center justify-between
        transition-colors duration-200
        z-50
        ${className}
      `}
    >
      {/* Left side: custom leftContent or default brand logo */}
      <div data-tauri-drag-region className="flex items-center gap-2 h-full z-10 pl-3">
        {leftContent || (
          <div className="flex items-center gap-2 select-none">
            <img src="/kivo.png" alt="Kivo" className="w-4 h-4 rounded-sm object-contain" />
            <span className="text-[11px] font-bold text-heading tracking-tight">Kivo</span>
          </div>
        )}
      </div>

      {/* Centered title – absolutely positioned for perfect balance */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {centerContent || (
          <span className="text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5 text-body">
            <span>Kivo</span>
            <span className="text-[9px] px-1.5 py-px rounded bg-primary-soft text-primary font-mono">Platform</span>
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
          className="h-full w-11 flex items-center justify-center text-dim hover:text-heading hover:bg-muted transition-colors"
          title="Minimize"
        >
          <Minus size={14} strokeWidth={2} />
        </button>

        {/* Maximize / Restore */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={toggleMax}
          className="h-full w-11 flex items-center justify-center text-dim hover:text-heading hover:bg-muted transition-colors"
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
          className="h-full w-11 flex items-center justify-center text-dim hover:bg-danger hover:text-white transition-colors"
          title="Close"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
