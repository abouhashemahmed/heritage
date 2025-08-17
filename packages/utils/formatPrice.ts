// packages/utils/formatPrice.ts

type Currency = 'USD' | 'EUR' | 'GBP' | 'ILS' | 'SAR' | 'AED'; // Extend as needed

interface FormatPriceOptions {
  currency?: Currency;
  locale?: string;
  showCurrencySymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const CURRENCY_DISPLAY_MAP: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  SAR: '﷼',
  AED: 'د.إ'
};

const DEFAULT_OPTIONS: FormatPriceOptions = {
  currency: 'USD',
  locale: 'en-US',
  showCurrencySymbol: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

export function formatPrice(
  price: number | string,
  options: FormatPriceOptions = {}
): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const numericPrice =
    typeof price === 'number' ? price : parseFloat(price as string);

  if (isNaN(numericPrice)) {
    throw new Error(`Invalid price value: ${price}`);
  }

  const formatter = new Intl.NumberFormat(mergedOptions.locale, {
    style: 'currency',
    currency: mergedOptions.currency,
    currencyDisplay: mergedOptions.showCurrencySymbol ? 'symbol' : 'code',
    minimumFractionDigits: mergedOptions.minimumFractionDigits,
    maximumFractionDigits: mergedOptions.maximumFractionDigits
  });

  let formatted = formatter.format(numericPrice);

  // Patch missing symbols (for rare Intl cases or fallback display)
  if (
    mergedOptions.showCurrencySymbol &&
    !formatted.includes(CURRENCY_DISPLAY_MAP[mergedOptions.currency])
  ) {
    formatted = formatted.replace(
      mergedOptions.currency,
      CURRENCY_DISPLAY_MAP[mergedOptions.currency]
    );
  }

  return formatted;
}

// Utility for preset formatting styles
export const PriceFormats = {
  arabicPrice(price: number): string {
    return formatPrice(price, { locale: 'ar-EG', currency: 'AED' });
  },
  euroPrice(price: number): string {
    return formatPrice(price, { currency: 'EUR', locale: 'de-DE' });
  },
  usdPrice(price: number): string {
    return formatPrice(price, { currency: 'USD' });
  }
};
