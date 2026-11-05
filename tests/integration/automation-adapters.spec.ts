import { test as base, expect } from '@playwright/test';
import { CartPage } from '../../src/e2e-tests/pages/cart.page.js';
import { approvedAccountOrigin } from '../../src/e2e-tests/support/account-policy.js';
import { guardAccountContext } from '../../src/e2e-tests/support/synthetic-account.js';
import { startMarketplaceFixture } from './fixtures/marketplace-server.js';

type MarketplaceFixture = Awaited<ReturnType<typeof startMarketplaceFixture>>;
const test = base.extend<{ marketplace: MarketplaceFixture }>({
  baseURL: async ({ marketplace }, use) => {
    await use(marketplace.url);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured fixture dependencies; this fixture has none.
  marketplace: async ({}, use) => {
    const server = await startMarketplaceFixture();
    try {
      await use(server);
    } finally {
      await server.close();
    }
  },
});

test('CartPage integrates browser DOM and the shared USD parser', async ({ page, marketplace }) => {
  await page.goto(`${marketplace.url}/cart`);
  const cart = new CartPage(page);
  expect(await cart.cents('cart-subtotal')).toBe(5000);
  expect(await cart.cents('cart-shipping')).toBe(0);
});

test('CartPage removes an item through real HTTP and reads the persisted empty state', async ({
  page,
  marketplace,
}) => {
  await page.goto(`${marketplace.url}/cart`);
  const cart = new CartPage(page);
  await cart.clear();
  await page.reload();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  const requests = await (await page.request.get(`${marketplace.url}/diagnostics`)).json();
  expect(requests).toContainEqual({ method: 'DELETE', path: '/api/cart/items/local-fixture' });
});

test('CartPage does not report a successful mutation when the HTTP server rejects it', async ({
  page,
  marketplace,
}) => {
  marketplace.state.failWrites = true;
  await page.goto(`${marketplace.url}/cart`);
  const cart = new CartPage(page);
  await expect(cart.mutate(() => page.getByTestId('cart-line-remove').click())).rejects.toThrow(
    'Cart mutation should succeed',
  );
  await page.reload();
  await expect(page.getByTestId('cart-line')).toBeVisible();
});

test('malformed server-rendered prices fail loudly instead of corrupting comparisons', async ({
  page,
  marketplace,
}) => {
  marketplace.state.priceText = '$12.3';
  await page.goto(`${marketplace.url}/cart`);
  await expect(new CartPage(page).cents('cart-subtotal')).rejects.toThrow('Expected a USD price');
});

test('browser guard permits a read-only request to the local HTTP fixture', async ({
  page,
  context,
  marketplace,
}) => {
  await guardAccountContext(context, approvedAccountOrigin);
  await page.goto(marketplace.url);
  const result = await page.evaluate(async () => (await fetch('/api/cart')).json());
  expect(result).toEqual({ quantity: 1 });
});

for (const path of ['/api/orders', '/api/payments', '/api/auth/forgot-password', '/api/account']) {
  test(`browser guard blocks a local out-of-origin write before transport: ${path}`, async ({
    page,
    context,
    marketplace,
  }) => {
    await guardAccountContext(context, approvedAccountOrigin);
    await page.goto(marketplace.url);
    const blocked = await page.evaluate(async (endpoint) => {
      try {
        await fetch(endpoint, { method: 'POST' });
        return false;
      } catch {
        return true;
      }
    }, path);
    expect(blocked).toBe(true);
    const requests = await (await page.request.get(`${marketplace.url}/diagnostics`)).json();
    expect(requests.some((request: { method: string }) => request.method === 'POST')).toBe(false);
  });
}

test('browser guard refuses an unapproved configured origin before installing routes', async ({
  context,
  marketplace,
}) => {
  await expect(guardAccountContext(context, marketplace.url)).rejects.toThrow(
    'only on the original QA origin',
  );
});
