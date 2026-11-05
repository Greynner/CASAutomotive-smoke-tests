import { expect, test } from '@playwright/test';
import { HomePage } from '../../pages/home.page.js';

test('mobile home has no horizontal overflow and shopping is reachable', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.rejectCookies();
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await page.getByTestId('hero-shop-cta').click();
  await expect(page.getByTestId('catalog-title')).toBeVisible();
});

test('mobile filters are operable and sale results show sale prices', async ({ page }) => {
  await page.goto('/products');
  await page.getByTestId('cookie-reject').click();
  await page.getByTestId('filters-toggle').click();
  await page.getByTestId('filter-on-sale').check();
  await page.getByTestId('filter-apply').click();
  await expect(page).toHaveURL(/onSale=1/);
  const cards = page.getByTestId('product-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    await expect(card.getByTestId('product-card-compare-price')).toBeVisible();
  }
});
