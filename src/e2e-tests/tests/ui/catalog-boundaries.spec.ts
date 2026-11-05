import { expect, test } from '@playwright/test';
import { CatalogPage } from '../../pages/catalog.page.js';

for (const query of ['KEYBOARD MECHANICAL', '  mechanical   keyboard  ', 'Volt & Wire']) {
  test(`search matches case, word order and shop contract: ${query}`, async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto(`?q=${encodeURIComponent(query)}`);
    await expect(page.locator('[data-product-id="p105"]')).toBeVisible();
    if (query === 'Volt & Wire') {
      for (const card of await catalog.cards.all()) {
        await expect(card.getByTestId('product-card-shop')).toHaveText('Volt & Wire');
      }
    }
  });
}

test('category navigation includes matching seed and excludes another category', async ({
  page,
}) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();
  await page.getByTestId('category-link-electronics').click();
  await expect(page).toHaveURL(/category=electronics/);
  await expect(page.locator('[data-product-id="p105"]')).toBeVisible();
  await expect(page.locator('[data-product-id="p108"]')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-product-id="p105"]')).toBeVisible();
});

test('in-stock filter excludes the seeded out-of-stock kettle', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto('?q=Electric%20Gooseneck%20Kettle');
  await expect(page.locator('[data-product-id="p112"]')).toBeVisible();
  await page.getByTestId('filter-in-stock').check();
  await page.getByTestId('filter-apply').click();
  await expect(page).toHaveURL(/inStock=1/);
  await expect(page.locator('[data-product-id="p112"]')).toHaveCount(0);
  await expect(page.getByTestId('results-summary')).toContainText('No products found');
});

test('maximum price includes products exactly at the selected boundary', async ({ page }) => {
  const catalog = new CatalogPage(page);
  // Control: proves the known $50 item exists and is returned just above the boundary.
  await catalog.goto('?min=50&max=51');
  await expect(page.locator('[data-product-id="p108"]')).toBeVisible();
  await catalog.goto('?min=50&max=50');
  await expect(page.locator('[data-product-id="p108"]')).toBeVisible();
});
