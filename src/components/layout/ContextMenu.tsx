import { useEffect, useState } from 'react';
import { Copy, Navigation, RefreshCw, Scissors, ClipboardPaste } from 'lucide-react';

export default function ContextMenu() {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow default context menu on input fields so users can easily paste/copy native text
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
      className="fixed z-[9999] w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-left"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ChiraSys Actions</span>
      </div>

      <button
        onClick={() => { navigator.clipboard.writeText(window.getSelection()?.toString() || ''); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Copy size={14} className="text-slate-400" /> Copy
      </button>

      <button
        onClick={() => { document.execCommand('paste'); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <ClipboardPaste size={14} className="text-slate-400" /> Paste
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

      <button
        onClick={() => window.location.reload()}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <RefreshCw size={14} className="text-brand" /> Reload App
      </button>
      
      <button
        onClick={() => { window.history.back(); setShow(false); }}
        className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Navigation size={14} className="text-slate-400 -rotate-90" /> Go Back
      </button>
    </div>
  );
}
