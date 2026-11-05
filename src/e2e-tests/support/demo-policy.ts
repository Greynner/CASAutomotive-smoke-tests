import { approvedAccountOrigin } from './account-policy.js';

// Publicly documented, non-real demo cards. Never replace with real payment details.
export const demoCards = {
  approved: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
} as const;

export function assertDemoPaymentDisclosure(text: string): void {
  const digits = text.replace(/\D/g, '');
  if (
    !text.includes('No real payments are taken.') ||
    !Object.values(demoCards).every((card) => digits.includes(card))
  ) {
    throw new Error(
      'Checkout must explicitly disclose no real payments and list all approved demo cards.',
    );
  }
}

export type DemoScope = {
  role: 'seller' | 'buyer';
  allowBuyerCreation: boolean;
  allowShopCreation: boolean;
  allowProductCreation: boolean;
  productId?: string;
  orderIds: string[];
  checkoutArmed: boolean;
  checkoutAttempts: number;
};

export function isAllowedDemoRequest(method: string, address: string, scope: DemoScope): boolean {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return false;
  }
  if (url.origin !== approvedAccountOrigin || url.username || url.password) return false;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return false;
  const path = url.pathname;
  if (method === 'POST' && /^\/api\/auth\/(login|logout)$/.test(path)) return true;
  if (method === 'POST' && path === '/api/auth/register')
    return scope.role === 'buyer' && scope.allowBuyerCreation;
  if (method === 'POST' && path === '/api/cart/items') return true;
  if (method === 'DELETE' && /^\/api\/cart\/items\/[a-zA-Z0-9_-]+$/.test(path)) return true;
  if (path === '/api/account') return ['PATCH', 'DELETE'].includes(method);
  if (method === 'POST' && path === '/api/checkout') {
    return (
      scope.role === 'buyer' &&
      scope.checkoutArmed &&
      scope.checkoutAttempts < 4 &&
      scope.orderIds.length < 2
    );
  }
  if (scope.role === 'seller') {
    if (method === 'POST' && path === '/api/seller/shop') return scope.allowShopCreation;
    if (method === 'POST' && path === '/api/seller/products') return scope.allowProductCreation;
    if (scope.productId && path === `/api/seller/products/${scope.productId}`)
      return ['PATCH', 'PUT', 'DELETE'].includes(method);
    return (
      scope.orderIds.some(
        (id) =>
          path === `/api/seller/orders/${id}/ship` || path === `/api/seller/orders/${id}/deliver`,
      ) && method === 'POST'
    );
  }
  return scope.orderIds.some((id) => path === `/api/orders/${id}/cancel`) && method === 'POST';
}

export function assertOwnedDemoCartSnapshot(value: unknown, productId: string): void {
  const cart = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  const lines = cart?.lines;
  const line =
    Array.isArray(lines) && lines.length === 1 ? (lines[0] as Record<string, unknown>) : undefined;
  if (cart?.itemCount !== 1 || line?.productId !== productId || line?.qty !== 1) {
    throw new Error(
      'Checkout requires exactly one unit of the owned product in the authenticated cart snapshot.',
    );
  }
}

export function assertOwnedDemoCartItem(value: unknown, productId: string): void {
  const payload =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  if (
    payload?.productId !== productId ||
    payload?.qty !== 1 ||
    (payload.variantId !== null && payload.variantId !== undefined)
  ) {
    throw new Error('Only one unit of the owned, non-variant demo product may be added.');
  }
}

export function assertSyntheticDemoCheckout(value: unknown): void {
  if (!value || typeof value !== 'object') throw new Error('Invalid demo checkout payload.');
  const payload = value as Record<string, unknown>;
  const card = payload.card as Record<string, unknown> | undefined;
  const address = payload.address as Record<string, unknown> | undefined;
  const number = typeof card?.number === 'string' ? card.number.replace(/\s/g, '') : '';
  if (
    !Object.values(demoCards).some((allowed) => allowed === number) ||
    card?.name !== 'QA Demo Buyer' ||
    card?.cvc !== '123' ||
    typeof card?.expiry !== 'string' ||
    !/^\d{2}\/\d{2}$/.test(card.expiry) ||
    payload.addressId !== null ||
    payload.saveAddress !== false ||
    payload.shippingMethod !== 'standard' ||
    address?.fullName !== 'QA Demo Buyer' ||
    address?.line1 !== '123 QA Test Street' ||
    address?.city !== 'Test City' ||
    address?.state !== 'CA' ||
    address?.zip !== '94105' ||
    address?.phone !== '2025550123'
  ) {
    throw new Error(
      'Refusing checkout with non-allowlisted cards, non-synthetic data or unexpected delivery settings.',
    );
  }
}
