import { describe, expect, test } from 'bun:test';
import {
  approvedAccountOrigin,
  assertApprovedAccountOrigin,
  assertSyntheticAccount,
  isAllowedAccountRequest,
} from '../../src/e2e-tests/support/account-policy.js';

const qa = approvedAccountOrigin;
const fixtureLedger = {
  email: 'cas-qa-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@example.com',
  password: 'unit-test-only-not-a-real-password',
  targetOrigin: qa,
  createdBy: 'cas-synthetic-qa',
  cleanupStatus: 'fixture only; no account is created',
};

test('denies an order submission even on the authorized QA origin', () => {
  expect(isAllowedAccountRequest('POST', `${qa}/api/orders`)).toBe(false);
});

test('rejects embedded credentials even when the hostname is authorized', () => {
  expect(() =>
    assertApprovedAccountOrigin('https://user:secret@qa-marketplace-app-b9mpo.ondigitalocean.app'),
  ).toThrow();
});

test('rejects a ledger with no usable password before any browser mutation', () => {
  const { password: _password, ...missingPassword } = fixtureLedger;
  expect(() => assertSyntheticAccount(missingPassword)).toThrow();
});

describe('authorized origin boundary', () => {
  test.each([qa, `${qa}/`, `${qa}/account`])('accepts the pinned origin: %s', (url) => {
    expect(() => assertApprovedAccountOrigin(url)).not.toThrow();
  });
  test.each([
    '',
    'not-a-url',
    'http://qa-marketplace-app-b9mpo.ondigitalocean.app',
    `${qa}.attacker.invalid`,
    'https://staging.example.com',
  ])('rejects another or invalid origin: %s', (url) => {
    expect(() => assertApprovedAccountOrigin(url)).toThrow();
  });
});

describe('browser request safety', () => {
  test.each([
    ['GET', `${qa}/products`],
    ['HEAD', `${qa}/help`],
    ['OPTIONS', 'https://assets.example.com/image.png'],
    ['GET', 'https://assets.example.com/image.png'],
    ['POST', `${qa}/api/auth/register`],
    ['POST', `${qa}/api/auth/login`],
    ['POST', `${qa}/api/auth/logout`],
    ['PATCH', `${qa}/api/account`],
    ['DELETE', `${qa}/api/account`],
    ['POST', `${qa}/api/account/addresses`],
    ['PATCH', `${qa}/api/account/addresses/fixture-id`],
    ['DELETE', `${qa}/api/account/addresses/fixture-id`],
    ['POST', `${qa}/api/cart/items`],
    ['PUT', `${qa}/api/cart/items/fixture-id`],
    ['PATCH', `${qa}/api/cart/items/fixture-id`],
    ['DELETE', `${qa}/api/cart/items/fixture-id`],
    ['POST', `${qa}/api/cart/coupon`],
    ['DELETE', `${qa}/api/cart/coupon`],
  ])('allows scoped request %s %s', (method, url) => {
    expect(isAllowedAccountRequest(method, url)).toBe(true);
  });
  test.each([
    ['POST', `${qa}/api/payments`],
    ['POST', `${qa}/checkout`],
    ['POST', `${qa}/api/cart/checkout`],
    ['POST', `${qa}/api/cart/Payment`],
    ['POST', `${qa}/api/auth/forgot-password`],
    ['POST', `${qa}/api/seller/products`],
    ['PATCH', `${qa}/api/private`],
    ['POST', 'https://other.example/api/cart/items'],
    ['POST', 'http://qa-marketplace-app-b9mpo.ondigitalocean.app/api/cart/items'],
    ['POST', 'https://user:secret@qa-marketplace-app-b9mpo.ondigitalocean.app/api/cart/items'],
    ['TRACE', `${qa}/api/cart/items`],
    ['GET', 'file:///tmp/private-file'],
    ['GET', 'data:text/plain,not-an-http-request'],
    ['POST', 'not-a-url'],
  ])('denies out-of-scope request %s %s', (method, url) => {
    expect(isAllowedAccountRequest(method, url)).toBe(false);
  });
});

describe('synthetic account ownership', () => {
  test('accepts only a complete owned fixture ledger', () => {
    expect(() => assertSyntheticAccount(fixtureLedger)).not.toThrow();
  });
  test.each(
    [
      null,
      undefined,
      [],
      'not an object',
      { ...fixtureLedger, targetOrigin: 'https://other.example' },
      { ...fixtureLedger, createdBy: 'someone-else' },
      { ...fixtureLedger, email: 'person@example.com' },
      { ...fixtureLedger, email: 'cas-qa-invalid-uuid@example.com' },
      { ...fixtureLedger, email: null },
      { ...fixtureLedger, password: null },
      { ...fixtureLedger, password: '   ' },
      { ...fixtureLedger, cleanupStatus: undefined },
    ].map((ledger) => ({ ledger })),
  )('rejects malformed or unowned ledger case %#', ({ ledger }) => {
    expect(() => assertSyntheticAccount(ledger)).toThrow();
  });
});
