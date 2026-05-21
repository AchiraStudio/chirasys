import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export default function TitleBar() {
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
    /* The entire bar is the drag region; buttons use stopPropagation to avoid
       accidentally starting a drag while clicking */
    <div
      data-tauri-drag-region
      className="
        h-9 shrink-0 w-full
        bg-white dark:bg-[#0B0F19]
        border-b border-slate-200 dark:border-slate-800
        select-none relative flex items-center
        transition-colors duration-300
      "
    >
      {/* Centered title – absolutely positioned so it's truly centred
          regardless of how wide the button group is */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-600 dark:text-slate-400">
          ChiraSys ERP
        </span>
      </div>

      {/* Left: spacer so title stays centred (mirrors button group width) */}
      <div data-tauri-drag-region className="flex-1" />

      {/* Right: Windows-style window controls */}
      <div className="flex h-full shrink-0">
        {/* Minimize */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={minimize}
          className="
            h-full w-11 flex items-center justify-center
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors
          "
        >
          <Minus size={14} strokeWidth={2} />
        </button>

        {/* Maximize / Restore */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={toggleMax}
          className="
            h-full w-11 flex items-center justify-center
            text-slate-600 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors
          "
        >
          {isMaximized
            ? <Copy size={12} strokeWidth={2} />
            : <Square size={12} strokeWidth={2} />}
        </button>

        {/* Close */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={close}
          className="
            h-full w-11 flex items-center justify-center
            text-slate-600 dark:text-slate-400
            hover:bg-rose-500 hover:text-white
            transition-colors
          "
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
