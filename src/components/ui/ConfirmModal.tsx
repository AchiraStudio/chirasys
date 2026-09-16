import { useEffect } from 'react';
import { AlertTriangle, Info, LogOut } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'logout';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Enter key confirms
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, loading]);

  const variants = {
    danger: {
      iconBg: 'bg-danger-soft text-danger',
      btnVariant: 'danger' as const,
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-warning-soft text-warning',
      btnVariant: 'primary' as const,
      Icon: AlertTriangle,
    },
    primary: {
      iconBg: 'bg-primary-soft text-primary',
      btnVariant: 'primary' as const,
      Icon: Info,
    },
    logout: {
      iconBg: 'bg-danger-soft text-danger',
      btnVariant: 'danger' as const,
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
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={v.btnVariant}
            className="flex-[2]"
            onClick={onConfirm}
            loading={loading}
          >
            <Icon size={15} />
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-body leading-relaxed">{message}</p>
    </Modal>
  );
}
