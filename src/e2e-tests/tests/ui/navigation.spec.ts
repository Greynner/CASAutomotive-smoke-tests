import { expect, test } from '@playwright/test';
import { HomePage } from '../../pages/home.page.js';
import { products } from '../../support/marketplace.js';

test('shopping CTA opens the catalog and a product opens its matching detail', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.rejectCookies();
  await page.getByTestId('hero-shop-cta').click();
  await expect(page).toHaveURL(/\/products$/);
  await page.locator(`[data-product-id="p105"]`).click();
  await expect(page).toHaveURL(new RegExp(`${products.keyboard.path}$`));
  await expect(page.getByTestId('product-title')).toHaveText(products.keyboard.name);
});

test('search finds the seeded keyboard', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.search('Mechanical Keyboard');
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await expect(page.getByTestId('product-card-title')).toContainText([products.keyboard.name]);
});

test('search requires all words, not just one match', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.search('keyboard nonexistentxyz');
  await expect(page.getByTestId('results-summary')).toContainText('No products found');
  await expect(page.getByTestId('product-card')).toHaveCount(0);
});

test('guest cart requires sign-in and preserves a route to registration', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByTestId('cart-sign-in')).toHaveAttribute('href', /\/login/);
  await page.getByTestId('cart-sign-in').click();
  await expect(page.getByTestId('login-form')).toBeVisible();
  await page.getByTestId('login-register-link').click();
  await expect(page.getByTestId('register-email')).toBeVisible();
});

test('login password visibility can be toggled without submitting credentials', async ({
  page,
}) => {
  await page.goto('/login');
  const password = page.getByTestId('login-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByTestId('login-password-toggle').click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByTestId('login-password-toggle').click();
  await expect(password).toHaveAttribute('type', 'password');
});
