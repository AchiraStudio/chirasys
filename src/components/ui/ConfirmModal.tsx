import { useEffect } from 'react';
import { AlertTriangle, Info, LogOut } from 'lucide-react';
import Modal from './Modal';

export interface ConfirmModalProps {
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
  // Enter key confirms
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm]);

  const variants = {
    danger: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white',
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      btnClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white',
      Icon: AlertTriangle,
    },
    primary: {
      iconBg: 'bg-brand/10 text-brand dark:bg-brand/20',
      btnClass: 'bg-brand hover:bg-blue-600 shadow-brand/20 text-white',
      Icon: Info,
    },
    logout: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400',
      btnClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white',
      Icon: LogOut,
    },
  };

  const v = variants[variant];
  const Icon = v.Icon;

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={title}
      icon={Icon}
      iconBg={v.iconBg}
      size="sm"
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-[2] py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${v.btnClass}`}
          >
            <Icon size={15} />
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
    </Modal>
  );
}
