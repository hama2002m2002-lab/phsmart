export function formatNumber(value: number | string | undefined | null, maxDecimals: number = 0): string {
  if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
    return '0';
  }
  const num = Number(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

export function formatPrice(value: number | string | undefined | null, currencySymbol: string = '$'): string {
  return `${currencySymbol}${formatNumber(value)}`;
}
