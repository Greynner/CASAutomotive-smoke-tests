import { expect, test } from '@playwright/test';
import { publicRoutes } from '../../support/marketplace.js';

for (const route of publicRoutes) {
  test(`public route ${route} serves HTML without a server error`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    // Next.js embeds a not-found fallback in successful RSC payloads too.
    expect(await response.text()).not.toMatch(/<title>404:/);
  });
}

test('unknown product returns 404 rather than a successful product page', async ({ request }) => {
  const response = await request.get('/products/qa-product-that-does-not-exist');
  expect(response.status()).toBe(404);
});

test('Terms of Service linked by the site must be available @legal', async ({ request }) => {
  const response = await request.get('/terms');
  expect(response.status(), 'The footer and registration link to /terms').toBe(200);
  expect(await response.text()).not.toContain('This page could not be found');
});
