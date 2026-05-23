import { useEffect, useRef } from 'react';

/**
 * Hook to listen for hardware barcode scanner inputs globally.
 * Hardware scanners emulate keyboards but type extremely fast (<50ms between keys)
 * and usually suffix the string with an "Enter" key.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef('');
  const lastKeyTime = useRef(Date.now());
  const onScanRef = useRef(onScan);

  // Always keep the latest callback without re-binding the listener
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const timeElapsed = currentTime - lastKeyTime.current;

      if (timeElapsed > 50) {
        buffer.current = '';
      }

      if (e.key === 'Enter') {
        if (buffer.current.length > 2) {
          onScanRef.current(buffer.current);
          buffer.current = '';
        }
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }

      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
