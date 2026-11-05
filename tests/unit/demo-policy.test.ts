import { describe, expect, test } from 'bun:test';
import { approvedAccountOrigin } from '../../src/e2e-tests/support/account-policy.js';
import {
  assertDemoPaymentDisclosure,
  assertOwnedDemoCartItem,
  assertOwnedDemoCartSnapshot,
  assertSyntheticDemoCheckout,
  type DemoScope,
  demoCards,
  isAllowedDemoRequest,
} from '../../src/e2e-tests/support/demo-policy.js';

const qa = approvedAccountOrigin;
const disclosure = `No real payments are taken. ${Object.values(demoCards).join(' ')}`;
const base: DemoScope = {
  role: 'buyer',
  allowBuyerCreation: false,
  allowShopCreation: false,
  allowProductCreation: false,
  orderIds: ['owned-order'],
  productId: 'owned-product',
  checkoutArmed: false,
  checkoutAttempts: 0,
};
const payload = {
  addressId: null,
  saveAddress: false,
  shippingMethod: 'standard',
  address: {
    fullName: 'QA Demo Buyer',
    line1: '123 QA Test Street',
    city: 'Test City',
    state: 'CA',
    zip: '94105',
    phone: '2025550123',
  },
  card: { number: demoCards.approved, name: 'QA Demo Buyer', expiry: '12/35', cvc: '123' },
};

test('demo checkout is not armed by a vague test-card heading alone', () => {
  expect(() => assertDemoPaymentDisclosure('Demo store: test cards')).toThrow();
});
test('explicit no-real-payment disclosure and all three test cards are required', () => {
  expect(() => assertDemoPaymentDisclosure(disclosure)).not.toThrow();
  expect(() =>
    assertDemoPaymentDisclosure(`No real payments are taken. ${demoCards.approved}`),
  ).toThrow();
});
test('cart-prefixed payment endpoints cannot bypass the explicit checkout gate', () => {
  expect(isAllowedDemoRequest('POST', `${qa}/api/cart/checkout`, base)).toBe(false);
});

describe('scoped demo transport', () => {
  test.each([
    { method: 'GET', url: `${qa}/seller`, scope: base, allowed: true },
    { method: 'HEAD', url: `${qa}/help`, scope: base, allowed: true },
    { method: 'POST', url: `${qa}/api/auth/login`, scope: base, allowed: true },
    { method: 'DELETE', url: `${qa}/api/cart/items/fixture`, scope: base, allowed: true },
    { method: 'DELETE', url: `${qa}/api/account`, scope: base, allowed: true },
    { method: 'POST', url: `${qa}/api/checkout`, scope: base, allowed: false },
    {
      method: 'POST',
      url: `${qa}/api/checkout`,
      scope: { ...base, checkoutArmed: true, checkoutAttempts: 3 },
      allowed: true,
    },
    {
      method: 'POST',
      url: `${qa}/api/checkout`,
      scope: { ...base, checkoutArmed: true, checkoutAttempts: 4 },
      allowed: false,
    },
    {
      method: 'POST',
      url: `${qa}/api/checkout`,
      scope: { ...base, role: 'seller', checkoutArmed: true },
      allowed: false,
    },
    { method: 'POST', url: `${qa}/api/auth/register`, scope: base, allowed: false },
    {
      method: 'POST',
      url: `${qa}/api/auth/register`,
      scope: { ...base, allowBuyerCreation: true },
      allowed: true,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/shop`,
      scope: { ...base, role: 'seller', allowShopCreation: true },
      allowed: true,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/shop`,
      scope: { ...base, role: 'seller' },
      allowed: false,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/products`,
      scope: { ...base, role: 'seller', allowProductCreation: true },
      allowed: true,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/products`,
      scope: { ...base, role: 'seller' },
      allowed: false,
    },
    {
      method: 'PATCH',
      url: `${qa}/api/seller/products/owned-product`,
      scope: { ...base, role: 'seller' },
      allowed: true,
    },
    {
      method: 'PATCH',
      url: `${qa}/api/seller/products/unowned-product`,
      scope: { ...base, role: 'seller' },
      allowed: false,
    },
    {
      method: 'PATCH',
      url: `${qa}/api/seller/products/owned-product`,
      scope: base,
      allowed: false,
    },
    { method: 'POST', url: `${qa}/api/orders/owned-order/cancel`, scope: base, allowed: true },
    { method: 'POST', url: `${qa}/api/orders/unowned-order/cancel`, scope: base, allowed: false },
    { method: 'POST', url: `${qa}/api/orders/owned-order/return`, scope: base, allowed: false },
    {
      method: 'POST',
      url: `${qa}/api/checkout`,
      scope: { ...base, checkoutArmed: true, orderIds: ['one', 'two'] },
      allowed: false,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/orders/owned-order/deliver`,
      scope: { ...base, role: 'seller' },
      allowed: true,
    },
    {
      method: 'GET',
      url: 'https://user:secret@qa-marketplace-app-b9mpo.ondigitalocean.app/help',
      scope: base,
      allowed: false,
    },
    {
      method: 'POST',
      url: `${qa}/api/seller/orders/owned-order/ship`,
      scope: { ...base, role: 'seller' },
      allowed: true,
    },
    {
      method: 'PATCH',
      url: `${qa}/api/seller/orders/unowned-order`,
      scope: { ...base, role: 'seller' },
      allowed: false,
    },
    { method: 'POST', url: `${qa}/api/auth/forgot-password`, scope: base, allowed: false },
    { method: 'GET', url: 'https://gateway.example/pay', scope: base, allowed: false },
    { method: 'POST', url: 'https://gateway.example/pay', scope: base, allowed: false },
    { method: 'POST', url: 'not-a-url', scope: base, allowed: false },
    { method: 'TRACE', url: `${qa}/api/cart`, scope: base, allowed: false },
    { method: 'PATCH', url: `${qa}/api/cart/items/fixture`, scope: base, allowed: false },
    { method: 'PUT', url: `${qa}/api/cart/items/fixture`, scope: base, allowed: false },
    { method: 'POST', url: `${qa}/api/cart/coupon`, scope: base, allowed: false },
  ])('request policy case %#', ({ method, url, scope, allowed }) => {
    expect(isAllowedDemoRequest(method, url, scope as DemoScope)).toBe(allowed);
  });
});

describe('cart snapshot before checkout', () => {
  test('accepts exactly one owned unit', () => {
    expect(() =>
      assertOwnedDemoCartSnapshot(
        { itemCount: 1, lines: [{ productId: 'owned-product', qty: 1 }] },
        'owned-product',
      ),
    ).not.toThrow();
  });
  test.each([
    { snapshot: null },
    { snapshot: { itemCount: 1, lines: [{ productId: 'another-product', qty: 1 }] } },
    { snapshot: { itemCount: 2, lines: [{ productId: 'owned-product', qty: 2 }] } },
    { snapshot: { itemCount: 1, lines: [] } },
    {
      snapshot: {
        itemCount: 2,
        lines: [
          { productId: 'owned-product', qty: 1 },
          { productId: 'owned-product', qty: 1 },
        ],
      },
    },
  ])('rejects another product or quantity snapshot %#', ({ snapshot }) => {
    expect(() => assertOwnedDemoCartSnapshot(snapshot, 'owned-product')).toThrow();
  });
});

describe('owned demo cart contract', () => {
  test('accepts the actual qty field used by the purchase form', () => {
    expect(() =>
      assertOwnedDemoCartItem(
        { productId: 'owned-product', variantId: null, qty: 1 },
        'owned-product',
      ),
    ).not.toThrow();
  });
  test.each([
    { payload: null },
    { payload: { productId: 'other-product', qty: 1 } },
    { payload: { productId: 'owned-product', quantity: 1 } },
    { payload: { productId: 'owned-product', qty: 2 } },
    { payload: { productId: 'owned-product', qty: 1, variantId: 'another-variant' } },
  ])('rejects an out-of-scope cart payload %#', ({ payload }) => {
    expect(() => assertOwnedDemoCartItem(payload, 'owned-product')).toThrow();
  });
});

describe('demo payload allowlist', () => {
  test.each(Object.values(demoCards))('allows only documented synthetic card %s', (number) => {
    expect(() =>
      assertSyntheticDemoCheckout({ ...payload, card: { ...payload.card, number } }),
    ).not.toThrow();
  });
  test.each([
    { value: null },
    { value: { ...payload, card: { ...payload.card, number: '4111111111111111' } } },
    { value: { ...payload, card: { ...payload.card, name: 'Someone Else' } } },
    { value: { ...payload, card: { ...payload.card, cvc: '999' } } },
    { value: { ...payload, card: { ...payload.card, expiry: '2035' } } },
    { value: { ...payload, card: undefined } },
    { value: { ...payload, address: { ...payload.address, line1: 'A real address' } } },
    { value: { ...payload, saveAddress: true } },
    { value: { ...payload, addressId: 'saved-address' } },
    { value: { ...payload, shippingMethod: 'express' } },
  ])('rejects non-allowlisted checkout case %#', ({ value }) => {
    expect(() => assertSyntheticDemoCheckout(value)).toThrow();
  });
});
