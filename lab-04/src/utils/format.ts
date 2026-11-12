export function formatDate(iso: string, locale = 'uk-UA'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

export function formatPrice(value: number, currency = 'UAH', locale = 'uk-UA'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
