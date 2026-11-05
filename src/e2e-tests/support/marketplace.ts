// Public QA seed products. Update only if the seed catalog changes, not to hide failures.
export const products = {
  keyboard: { path: '/products/p105', name: 'Mechanical Keyboard K87' },
  kettle: { path: '/products/p112', name: 'Electric Gooseneck Kettle' },
} as const;

export const publicRoutes = ['/', '/products', '/help', '/login', '/register', '/cart', '/sell'];

export function moneyToCents(text: string): number {
  const match = text.replaceAll(',', '').match(/\$(\d+(?:\.\d{2})?)/);
  if (!match) throw new Error(`Expected a USD price, received: ${text}`);
  return Math.round(Number(match[1]) * 100);
}
