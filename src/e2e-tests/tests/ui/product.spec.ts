import { expect, test } from '@playwright/test';
import { ProductPage } from '../../pages/product.page.js';
import { products } from '../../support/marketplace.js';

test('selecting the +$10 keyboard option updates its price @pricing', async ({ page }) => {
  const product = new ProductPage(page);
  await product.goto(products.keyboard.path);
  // Read the base option rather than relying on a fixed catalog price.
  await page.getByTestId('variant-option-p105-v2').click();
  await expect(page.locator('input[value="p105-v2"]')).toBeChecked();
  const basePrice = await product.price();
  await expect(page.getByTestId('variant-option-p105-v3')).toContainText('+$10.00');
  await page.getByTestId('variant-option-p105-v3').click();
  await expect(page.locator('input[value="p105-v3"]')).toBeChecked();
  await expect.poll(() => product.price()).toBe(basePrice + 1000);
});

test('out-of-stock products cannot be added to the cart', async ({ page }) => {
  const product = new ProductPage(page);
  await product.goto(products.kettle.path);
  await expect(page.getByTestId('stock-status')).toContainText('Out of stock');
  await expect(page.getByTestId('add-to-cart')).toBeDisabled();
});

test('quantity cannot decrease below one', async ({ page }) => {
  const product = new ProductPage(page);
  await product.goto(products.keyboard.path);
  await expect(page.getByTestId('qty-input')).toHaveValue('1');
  await expect(page.getByTestId('qty-decrease')).toBeDisabled();
  await expect(page.getByTestId('qty-input')).toHaveValue('1');
});
