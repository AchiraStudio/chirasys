import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, LucideIcon } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

export interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;
  iconBg?: string;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  backdropClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  scrollable?: boolean;
  noPadding?: boolean;
  children?: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] h-[calc(100vh-2rem)]',
};

// Global counter for active open modals to safely lock/unlock body scroll
let activeModalCount = 0;

export default function Modal({
  isOpen = true,
  onClose,
  title,
  subtitle,
  icon: IconOrElement,
  iconBg = 'bg-primary-soft text-primary',
  badge,
  headerRight,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
  backdropClassName = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  scrollable = true,
  noPadding = false,
  children,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    activeModalCount++;
    if (activeModalCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc && onClose) {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (!IconOrElement) return null;
    if (React.isValidElement(IconOrElement)) {
      return IconOrElement;
    }
    const IconComponent = IconOrElement as React.ComponentType<{ size?: number; className?: string }>;
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <IconComponent size={20} />
      </div>
    );
  };

  const hasHeader = Boolean(title || subtitle || IconOrElement || headerRight || showCloseButton);

  const modalContent = (
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden ${backdropClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
        onClick={() => {
          if (closeOnBackdropClick && onClose) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-[calc(100vw-1.5rem)] sm:w-full ${SIZE_CLASSES[size]} bg-elevated text-heading rounded-xl border border-line shadow-2xl shadow-black/40 flex flex-col max-h-[90dvh] overflow-hidden animate-pop-in ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {hasHeader && (
          <div
            className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-line flex items-center justify-between gap-3 sm:gap-4 shrink-0 ${headerClassName}`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              {renderIcon()}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h2 id={titleId} className="text-sm sm:text-base font-bold text-heading truncate">
                      {title}
                    </h2>
                  )}
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-[11px] sm:text-xs text-dim mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {showCloseButton && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-dim hover:text-heading hover:bg-muted rounded-lg transition-colors cursor-pointer"
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div
          className={`flex-1 ${
            scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-visible'
          } ${noPadding ? '' : 'p-3.5 sm:p-5 md:p-6'} ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-line flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Subcomponents for custom layout needs
Modal.Header = function ModalHeader({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-line flex items-center justify-between gap-3 sm:gap-4 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};

Modal.Body = function ModalBody({
  className = '',
  noPadding = false,
  scrollable = true,
  children,
}: {
  className?: string;
  noPadding?: boolean;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex-1 ${
        scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-visible'
      } ${noPadding ? '' : 'p-3.5 sm:p-5 md:p-6'} ${className}`}
    >
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-line flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};
