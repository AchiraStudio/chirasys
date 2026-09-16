import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Explicit options list — or pass <option> elements as children */
  options?: SelectOption[];
  children?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Panel alignment when it would overflow the trigger width */
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  ariaLabel?: string;
  /** Accepted for native-select API compatibility; not used */
  required?: boolean;
  name?: string;
}

function optionsFromChildren(children: React.ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
    if (child.type === 'option') {
      out.push({ value: props.value ?? '', label: props.children, disabled: props.disabled });
    } else if (child.type === 'optgroup') {
      React.Children.forEach(props.children, (opt) => {
        if (React.isValidElement(opt) && opt.type === 'option') {
          const o = opt.props as { value?: string; children?: React.ReactNode; disabled?: boolean };
          out.push({ value: o.value ?? '', label: o.children, disabled: o.disabled });
        }
      });
    }
  });
  return out;
}

/**
 * Custom themed dropdown — replaces every native <select> in the app.
 * Accepts either `options={[{value,label}]}` or `<option>` children so existing
 * JSX converts mechanically. Popover panel, keyboard nav, check-mark selection.
 */
export default function Select({
  value,
  onChange,
  options,
  children,
  disabled = false,
  placeholder = 'Pilih...',
  className = '',
  align = 'left',
  size = 'md',
  ariaLabel,
}: SelectProps) {
  const opts = options ?? optionsFromChildren(children);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = opts.find((o) => o.value === value);
  const selectedIndex = opts.findIndex((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Reset active index on open
  useEffect(() => {
    if (open) setActiveIdx(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  // Keep the active option scrolled into view
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const openPanel = () => {
    if (disabled || opts.length === 0) return;
    setOpen(true);
  };

  const commit = (val: string) => {
    setOpen(false);
    if (val !== value) onChange?.(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(opts.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && !opts[activeIdx].disabled) commit(opts[activeIdx].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const triggerBase =
    size === 'sm'
      ? 'h-8 px-2.5 text-xs'
      : 'h-9 px-3 text-sm';

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`${triggerBase} w-full flex items-center justify-between gap-2 rounded-lg border border-line bg-input text-heading font-semibold text-left cursor-pointer transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:border-line-strong ${
          open ? 'border-primary ring-2 ring-primary/25' : ''
        }`}
      >
        <span className="truncate">
          {selected ? selected.label : <span className="text-dim font-normal">{placeholder}</span>}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-dim transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute z-50 mt-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-max min-w-full max-w-80 max-h-60 overflow-y-auto custom-scrollbar rounded-lg border border-line bg-elevated shadow-lg shadow-black/25 p-1 animate-pop-in`}
        >
          {opts.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIdx;
            return (
              <button
                key={`${opt.value}-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onClick={() => commit(opt.value)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-primary-soft text-primary font-semibold'
                    : isActive
                    ? 'bg-muted text-heading'
                    : 'text-body'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
