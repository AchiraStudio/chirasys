// src/components/common/ConfirmModal.tsx
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmText?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle = 'Tindakan ini tidak dapat dibatalkan.',
  message,
  confirmText = 'Ya, Hapus',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl p-6 max-w-sm w-full border border-line animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger-soft dark:bg-danger/10 flex items-center justify-center text-danger">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-heading">{title}</h3>
            {subtitle && <p className="text-xs text-dim mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="text-sm text-body mb-5">{message}</div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-line rounded-xl text-sm font-bold text-body hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-danger hover:bg-danger text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
