import { expect, test } from '@playwright/test';
import { CatalogPage } from '../../pages/catalog.page.js';
import { moneyToCents } from '../../support/marketplace.js';

for (const direction of ['asc', 'desc'] as const) {
  test(`price sort ${direction} orders the displayed products numerically`, async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.sort(`price-${direction}`);
    const prices = await catalog.prices();
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => (direction === 'asc' ? a - b : b - a)));
  });
}

test('price range UI excludes products outside the selected bounds', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();
  await page.getByTestId('filter-min-price').fill('20');
  await page.getByTestId('filter-max-price').fill('50');
  await page.getByTestId('filter-apply').click();
  await expect(page).toHaveURL(/min=20/);
  await expect(catalog.cards.first()).toBeVisible();
  const prices = await catalog.prices();
  expect(prices.length).toBeGreaterThan(0);
  for (const price of prices) {
    expect(price).toBeGreaterThanOrEqual(2000);
    expect(price).toBeLessThanOrEqual(5000);
  }
});

test('pagination advances to a different set of products', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();
  const firstIds = await catalog.cards.evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-product-id')),
  );
  await page.getByTestId('pagination-next').click();
  await expect(page).toHaveURL(/page=2/);
  await expect(catalog.cards.first()).toBeVisible();
  const secondIds = await catalog.cards.evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-product-id')),
  );
  expect(secondIds.length).toBeGreaterThan(0);
  expect(secondIds.filter((id) => firstIds.includes(id))).toEqual([]);
});

test('sale badges calculate savings against the original price @pricing', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto('?onSale=1');
  await expect(catalog.cards.first()).toBeVisible();
  const count = await catalog.cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const card = catalog.cards.nth(i);
    const current = moneyToCents(
      (await card.getByTestId('product-card-price').textContent()) ?? '',
    );
    const original = moneyToCents(
      (await card.getByTestId('product-card-compare-price').textContent()) ?? '',
    );
    const badge = Number(
      ((await card.getByTestId('discount-badge').textContent()) ?? '').replace(/\D/g, ''),
    );
    const expected = Math.round(((original - current) / original) * 100);
    expect.soft(current).toBeLessThan(original);
    expect
      .soft(badge, `${await card.getAttribute('href')}: percentage off original price`)
      .toBe(expected);
  }
});
