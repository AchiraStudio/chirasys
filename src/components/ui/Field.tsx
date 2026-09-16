import React from 'react';

/* ── Field: label + control + hint/error wrapper ─────────────── */

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Field({ label, hint, error, required, className = '', children, id }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-heading">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-dim">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Base control classes (shared) ───────────────────────────── */

export const CONTROL_CLASS =
  'w-full rounded-lg border border-line bg-input text-sm text-heading placeholder:text-dim transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-55 disabled:cursor-not-allowed';

/* ── Input ───────────────────────────────────────────────────── */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...rest }, ref) => {
    if (icon) {
      return (
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim">
            {icon}
          </span>
          <input
            ref={ref}
            className={`h-9 pl-9 pr-3 ${CONTROL_CLASS} ${className}`}
            {...rest}
          />
        </div>
      );
    }
    return <input ref={ref} className={`h-9 px-3 ${CONTROL_CLASS} ${className}`} {...rest} />;
  },
);
Input.displayName = 'Input';

/* ── Textarea ────────────────────────────────────────────────── */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={`py-2 px-3 ${CONTROL_CLASS} ${className}`}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

/* ── Select — themed custom dropdown (see ui/Select.tsx) ─────── */

export { default as Select } from './Select';

/* ── Checkbox ────────────────────────────────────────────────── */

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, ...rest }, ref) => (
    <label className={`inline-flex cursor-pointer items-center gap-2 select-none ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer rounded border-line accent-primary"
        {...rest}
      />
      {label && <span className="text-sm text-body">{label}</span>}
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';
