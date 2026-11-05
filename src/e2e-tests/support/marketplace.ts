// Public QA seed products. Update only if the seed catalog changes, not to hide failures.
export const products = {
  keyboard: { path: '/products/p105', name: 'Mechanical Keyboard K87' },
  kettle: { path: '/products/p112', name: 'Electric Gooseneck Kettle' },
} as const;

export const publicRoutes = ['/', '/products', '/help', '/login', '/register', '/cart', '/sell'];

export function moneyToCents(text: string): number {
  const match = text.match(/\$((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)(?![\d.,])/);
  if (!match) throw new Error(`Expected a USD price, received: ${text}`);
  const [dollars, fraction = '00'] = match[1].replaceAll(',', '').split('.');
  const cents = BigInt(dollars) * 100n + BigInt(fraction);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('USD price exceeds the safe integer-cent range');
  }
  return Number(cents);
}
