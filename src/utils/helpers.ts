import { clsx, type ClassValue } from 'clsx';

/**
 * Combines multiple class names using clsx
 */
export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

/**
 * Formats a number with commas and specified decimal places
 */
export const formatNumber = (value: number, decimals = 4): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats a number as currency (USD)
 */
export const formatCurrency = (value: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Shortens an address for display
 */
export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};

/**
 * Calculates the maximum borrowable amount based on user positions
 */
export const calculateMaxBorrowable = (
  collateralValue: number,
  currentBorrowValue: number,
  ltv: number
): number => {
  return Math.max(0, (collateralValue * ltv) - currentBorrowValue);
};

/**
 * Adds commas to a number string while typing
 */
export const addCommasToNumber = (value: string): string => {
  // Remove existing commas and validate input
  const sanitized = value.replace(/,/g, '');
  if (!/^\d*\.?\d*$/.test(sanitized)) return value;
  
  // Split by decimal point
  const parts = sanitized.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]}`;
  }
  
  return integerPart;
};

/**
 * Wait function for simulating delays
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};