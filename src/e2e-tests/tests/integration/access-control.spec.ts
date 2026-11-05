import { expect, test } from '@playwright/test';

for (const path of ['/api/account', '/api/account/export', '/api/account/addresses', '/api/cart']) {
  test(`guest cannot read protected API ${path} @security-smoke`, async ({ request }) => {
    const response = await request.get(path, { timeout: 20_000 });
    expect(response.status()).toBe(401);
  });
}

for (const path of ['/account', '/account/addresses', '/account/privacy', '/orders']) {
  test(`guest route ${path} redirects to login @security-smoke`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0, timeout: 20_000 });
    expect([302, 303, 307, 308]).toContain(response.status());
    const destination = new URL(response.headers().location ?? '', response.url());
    expect(destination.origin).toBe(new URL(response.url()).origin);
    expect(destination.pathname).toBe('/login');
  });
}
