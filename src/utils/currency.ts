/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  switch (currencyCode) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'VES':
      return 'Bs.';
    case 'MXN':
    case 'USD':
    default:
      return '$';
  }
}

export function formatPrice(price: number, currencyCode: string = 'USD'): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${price.toFixed(2)}`;
}
