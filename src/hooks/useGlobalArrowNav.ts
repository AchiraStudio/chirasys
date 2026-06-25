import { useEffect } from 'react';

export function useGlobalArrowNav() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Allow default behavior for modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      const active = document.activeElement as HTMLElement;
      if (!active) return;

      const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT';
      
      // If we are in an input, let Left/Right arrow keys work normally for text navigation
      if (isInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return;
      }

      // Only handle arrow keys
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      // Get all focusable elements
      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      
      const elements = Array.from(document.querySelectorAll(focusableSelectors.join(',')))
        .filter((el): el is HTMLElement => {
          // Check if element is visible
          return el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden';
        });

      if (elements.length === 0) return;

      const getCenter = (rect: DOMRect) => ({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });

      const activeRect = active.getBoundingClientRect();
      const activeCenter = getCenter(activeRect);

      let bestElement: HTMLElement | null = null;
      let minScore = Infinity;

      elements.forEach(el => {
        if (el === active) return;
        const rect = el.getBoundingClientRect();
        const center = getCenter(rect);

        const dx = Math.max(0, Math.max(activeRect.left - rect.right, rect.left - activeRect.right));
        const dy = Math.max(0, Math.max(activeRect.top - rect.bottom, rect.top - activeRect.bottom));

        let isValidDirection = false;
        let score = Infinity;

        if (e.key === 'ArrowUp') {
          isValidDirection = rect.bottom <= activeCenter.y && center.y < activeCenter.y;
          if (isValidDirection) {
            score = Math.abs(center.y - activeCenter.y) + dx * 10;
          }
        } else if (e.key === 'ArrowDown') {
          isValidDirection = rect.top >= activeCenter.y && center.y > activeCenter.y;
          if (isValidDirection) {
            score = Math.abs(center.y - activeCenter.y) + dx * 10;
          }
        } else if (e.key === 'ArrowLeft') {
          isValidDirection = rect.right <= activeCenter.x && center.x < activeCenter.x;
          if (isValidDirection) {
            score = Math.abs(center.x - activeCenter.x) + dy * 10;
          }
        } else if (e.key === 'ArrowRight') {
          isValidDirection = rect.left >= activeCenter.x && center.x > activeCenter.x;
          if (isValidDirection) {
            score = Math.abs(center.x - activeCenter.x) + dy * 10;
          }
        }

        if (isValidDirection && score < minScore) {
          minScore = score;
          bestElement = el;
        }
      });

      if (bestElement) {
        e.preventDefault();
        bestElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
