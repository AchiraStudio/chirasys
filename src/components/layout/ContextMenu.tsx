import { useEffect, useState } from 'react';
import { Copy, Navigation, RefreshCw, ClipboardPaste, Code2 } from 'lucide-react';
import { invoke } from '../../lib/api';
import { isTauri } from '../../lib/runtime';

export default function ContextMenu() {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow native context menu (including Inspect) when Shift is held
      if (e.shiftKey) return;

      // In dev mode, allow F12 and native devtools shortcuts to still work
      // Don't intercept if target is an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      e.preventDefault();
      setShow(true);

      // Keep menu within viewport
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 250);
      setPosition({ x, y });
    };

    const handleClick = () => setShow(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed z-[9999] w-52 bg-card border border-line rounded-xl shadow-xl py-1.5 overflow-hidden animate-pop-in duration-150 origin-top-left"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-3 py-1.5 border-b border-line mb-1">
        <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Kivo Actions</span>
      </div>

      <button
        onClick={() => { navigator.clipboard.writeText(window.getSelection()?.toString() || ''); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-heading hover:bg-muted transition-colors"
      >
        <Copy size={14} className="text-dim" /> Copy
      </button>

      <button
        onClick={() => { document.execCommand('paste'); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-heading hover:bg-muted transition-colors"
      >
        <ClipboardPaste size={14} className="text-dim" /> Paste
      </button>

      <div className="h-px bg-muted my-1"></div>

      <button
        onClick={() => window.location.reload()}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-heading hover:bg-muted transition-colors"
      >
        <RefreshCw size={14} className="text-primary" /> Reload App
      </button>
      
      <button
        onClick={() => { window.history.back(); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-heading hover:bg-muted transition-colors"
      >
        <Navigation size={14} className="text-dim -rotate-90" /> Go Back
      </button>

      {isTauri() && (
        <>
          <div className="h-px bg-muted my-1"></div>
          <button
            onClick={async () => {
              setShow(false);
              try {
                await invoke('open_devtools');
              } catch (err) {
                console.error('Failed to open devtools:', err);
              }
            }}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-warning dark:text-warning hover:bg-warning-soft dark:hover:bg-warning/20 transition-colors cursor-pointer"
          >
            <Code2 size={14} /> Inspect Element
          </button>
        </>
      )}
    </div>
  );
}
