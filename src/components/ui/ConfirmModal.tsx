import { useEffect } from 'react';
import { AlertTriangle, Info, X, LogOut } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'logout';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, onConfirm]);

  const variants = {
    danger: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      btnClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      Icon: AlertTriangle,
    },
    primary: {
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
      btnClass: 'bg-brand hover:bg-blue-600 shadow-brand/20',
      Icon: Info,
    },
    logout: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-500 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
      Icon: LogOut,
    },
  };

  const v = variants[variant];
  const Icon = v.Icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${v.iconBg}`}>
              <Icon size={20} className={v.iconColor} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-[2] py-2.5 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${v.btnClass}`}
          >
            <Icon size={15} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
