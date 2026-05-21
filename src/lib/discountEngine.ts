import { calculateDiscounts, CartLineForDiscount, DiscountResult } from './api';

// Simple debounce implementation
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export const applyDiscountsToCart = (
  lines: CartLineForDiscount[],
  customerTier: string | undefined,
  callback: (result: DiscountResult) => void
) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = setTimeout(async () => {
    try {
      const result = await calculateDiscounts(lines, customerTier);
      callback(result);
    } catch (error) {
      console.error('Failed to calculate discounts:', error);
    }
  }, 400); // 400ms debounce
};
