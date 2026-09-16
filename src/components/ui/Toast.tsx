import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, LucideIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TYPE_META: Record<ToastType, { icon: LucideIcon; tone: string }> = {
  success: { icon: CheckCircle2, tone: 'text-success' },
  error: { icon: XCircle, tone: 'text-danger' },
  info: { icon: Info, tone: 'text-info' },
  warning: { icon: AlertTriangle, tone: 'text-warning' },
};

// Standalone emitter so `toast.success(...)` works anywhere (no hook required).
// The ToastProvider mounted at the app root registers itself as the sink.
type ToastListener = (type: ToastType, title: string, description?: string) => void;
let toastListener: ToastListener | null = null;

export const toast: ToastApi = {
  success: (t, d) => toastListener?.('success', t, d),
  error: (t, d) => toastListener?.('error', t, d),
  info: (t, d) => toastListener?.('info', t, d),
  warning: (t, d) => toastListener?.('warning', t, d),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
      window.setTimeout(() => dismiss(id), type === 'error' ? 6500 : 4000);
    },
    [dismiss],
  );

  useEffect(() => {
    toastListener = push;
    return () => {
      toastListener = null;
    };
  }, [push]);

  const api: ToastApi = {
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    info: (t, d) => push('info', t, d),
    warning: (t, d) => push('warning', t, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[1100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((toast) => {
            const meta = TYPE_META[toast.type];
            const Icon = meta.icon;
            return (
              <div
                key={toast.id}
                role="status"
                className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-elevated p-3 shadow-lg shadow-black/20 animate-slide-in-up"
              >
                <Icon size={18} className={`mt-0.5 shrink-0 ${meta.tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-body break-words">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Tutup notifikasi"
                  className="shrink-0 rounded-md p-0.5 text-dim transition-colors hover:bg-muted hover:text-heading"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
