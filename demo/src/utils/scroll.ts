/**
 * Silky-smooth custom scrolling engine for Kivo Marketing Site.
 * Provides custom ease-in-out cubic interpolation, sticky header offset (80px),
 * target highlighting, and user interruption handling.
 */

const NAV_OFFSET = 80;

const ALIASES: Record<string, string> = {
  lan: 'how',
  product: 'top',
  day: 'features',
  onboarding: 'download',
  ecosystem: 'top',
  reports: 'accounting',
};

let currentAnimationId: number | null = null;
let cleanupListenersFn: (() => void) | null = null;

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const cancelSmoothScroll = () => {
  if (currentAnimationId !== null) {
    cancelAnimationFrame(currentAnimationId);
    currentAnimationId = null;
  }
  if (cleanupListenersFn) {
    cleanupListenersFn();
    cleanupListenersFn = null;
  }
};

export interface ScrollOptions {
  offset?: number;
  duration?: number;
  highlight?: boolean;
  updateHistory?: boolean;
}

export const scrollToTarget = (
  target: string | HTMLElement,
  options?: ScrollOptions
): boolean => {
  const {
    offset = NAV_OFFSET,
    highlight = true,
    updateHistory = true,
  } = options || {};

  let el: HTMLElement | null = null;
  let rawHash = '';

  if (typeof target === 'string') {
    rawHash = target.startsWith('#') ? target.slice(1) : target;
    const resolvedId = ALIASES[rawHash] || rawHash;
    el = document.getElementById(resolvedId);
  } else {
    el = target;
    rawHash = el.id;
  }

  // Handle special case for top/home/empty
  if (rawHash === 'top' || rawHash === 'home' || rawHash === '') {
    cancelSmoothScroll();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
    } else {
      smoothScrollInternal(0, 500, updateHistory ? '#top' : null, null);
    }
    return true;
  }

  if (!el) {
    console.warn(`[Scroll] Target element '#${rawHash}' not found.`);
    return false;
  }

  cancelSmoothScroll();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rect = el.getBoundingClientRect();
  const currentY = window.pageYOffset || document.documentElement.scrollTop;
  const targetY = Math.max(0, Math.round(rect.top + currentY - offset));

  if (prefersReducedMotion) {
    window.scrollTo(0, targetY);
    if (updateHistory && rawHash) {
      window.history.pushState(null, '', `#${rawHash}`);
    }
    if (highlight) {
      pulseElement(el);
    }
    return true;
  }

  const diff = targetY - currentY;
  // Calculate dynamic duration based on distance
  const calculatedDuration = options?.duration ?? Math.min(750, Math.max(380, Math.round(Math.abs(diff) * 0.22 + 320)));

  smoothScrollInternal(targetY, calculatedDuration, updateHistory ? `#${rawHash}` : null, highlight ? el : null);
  return true;
};

const pulseElement = (el: HTMLElement) => {
  el.classList.remove('nav-target-pulse');
  // Trigger reflow to restart animation if already applied
  void el.offsetWidth;
  el.classList.add('nav-target-pulse');
  setTimeout(() => {
    el.classList.remove('nav-target-pulse');
  }, 1600);
};

const smoothScrollInternal = (
  targetY: number,
  duration: number,
  hashToPush: string | null,
  highlightEl: HTMLElement | null
) => {
  const startY = window.pageYOffset || document.documentElement.scrollTop;
  const diff = targetY - startY;

  if (Math.abs(diff) < 2) {
    if (hashToPush) {
      window.history.pushState(null, '', hashToPush);
    }
    if (highlightEl) {
      pulseElement(highlightEl);
    }
    return;
  }

  const startTime = performance.now();

  const handleInterrupt = () => {
    cancelSmoothScroll();
  };

  const cleanup = () => {
    window.removeEventListener('wheel', handleInterrupt);
    window.removeEventListener('touchmove', handleInterrupt);
  };
  cleanupListenersFn = cleanup;

  window.addEventListener('wheel', handleInterrupt, { passive: true, once: true });
  window.addEventListener('touchmove', handleInterrupt, { passive: true, once: true });

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + diff * eased);

    if (progress < 1) {
      currentAnimationId = requestAnimationFrame(step);
    } else {
      currentAnimationId = null;
      cleanup();
      cleanupListenersFn = null;

      if (hashToPush) {
        window.history.pushState(null, '', hashToPush);
      }
      if (highlightEl) {
        pulseElement(highlightEl);
      }
    }
  };

  currentAnimationId = requestAnimationFrame(step);
};

