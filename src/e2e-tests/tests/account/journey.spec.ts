import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { CartPage } from '../../pages/cart.page.js';
import {
  eraseAndVerify,
  guardAccountContext,
  ownedAccount,
  signIn,
  verifyOwner,
} from '../../support/synthetic-account.js';

test('owned synthetic account: authentication, cart, checkout preview, export and erasure', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await guardAccountContext(context, baseURL ?? '');
  const account = await ownedAccount(page);
  const cart = new CartPage(page);
  try {
    await test.step('login, logout and login again using only the owned account', async () => {
      expect((await signIn(page, account)).ok()).toBe(true);
      await verifyOwner(page, account);
      const logout = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/auth/logout' && r.request().method() === 'POST',
      );
      await page.getByTestId('account-sign-out').click();
      expect((await logout).ok()).toBe(true);
      await page.goto('/account');
      await expect(page).toHaveURL(/\/login/);
      const invalidLogin = await signIn(page, {
        ...account,
        password: `${account.password}-invalid`,
      });
      expect(invalidLogin.status(), 'Wrong password must not authenticate').toBe(401);
      expect((await signIn(page, account)).ok()).toBe(true);
      await verifyOwner(page, account);
    });

    await test.step('cart arithmetic and free-shipping threshold at $50', async () => {
      await cart.clear();
      await page.goto('/products/p108');
      await expect(page.getByTestId('stock-status')).toContainText('In stock');
      const added = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/cart/items' && r.request().method() === 'POST',
      );
      await page.getByTestId('add-to-cart').click();
      expect((await added).status()).toBe(201);
      await cart.goto();
      await expect(page.getByTestId('cart-qty-input')).toHaveValue('1');
      expect(await cart.cents('cart-subtotal')).toBe(5000);
      expect
        .soft(await cart.cents('cart-shipping'), 'CAS-008: standard shipping is free at $50')
        .toBe(0);
      expect.soft(await cart.cents('cart-tax')).toBe(400);
      expect
        .soft(await cart.cents('cart-total'), 'CAS-008: $50 + $4 tax + free shipping')
        .toBe(5400);
      await cart.mutate(() => page.getByTestId('cart-qty-increase').click());
      await expect(page.getByTestId('cart-qty-input')).toHaveValue('2');
      expect(await cart.cents('cart-subtotal')).toBe(10000);
      expect
        .soft(await cart.cents('cart-shipping'), 'CAS-008: standard shipping is free above $50')
        .toBe(0);
      await cart.mutate(() => page.getByTestId('cart-qty-decrease').click());
      await expect(page.getByTestId('cart-qty-input')).toHaveValue('1');
    });

    await test.step('case-insensitive WELCOME10 and tax on discounted merchandise', async () => {
      await cart.applyCoupon('welcome10');
      const subtotal = await cart.cents('cart-subtotal');
      const discounted = subtotal - Math.round(subtotal * 0.1);
      const tax = Math.round(discounted * 0.08);
      const shipping = discounted >= 5000 ? 0 : 599;
      expect
        .soft(await cart.cents('cart-tax'), 'CAS-010: 8% tax on subtotal after discount')
        .toBe(tax);
      expect.soft(await cart.cents('cart-shipping')).toBe(shipping);
      expect
        .soft(await cart.cents('cart-total'), 'CAS-010: discounted items + shipping + tax')
        .toBe(discounted + shipping + tax);
    });

    await test.step('checkout preview is reachable; never submit address, payment or order', async () => {
      await page.getByTestId('checkout-button').click();
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByTestId('place-order')).toBeVisible();
      expect
        .soft(await cart.cents('checkout-tax'), 'CAS-010: checkout tax after WELCOME10')
        .toBe(360);
      // Deliberately do not fill payment details, click Place order or submit checkout-form.
      await page.getByTestId('checkout-edit-cart').click();
      await expect(page).toHaveURL(/\/cart$/);
    });

    await test.step('export includes a saved synthetic address and the promised sections', async () => {
      await page.goto('/account/addresses');
      if ((await page.getByTestId('address-card').count()) === 0) {
        await page.getByTestId('address-add').click();
        for (const [field, value] of Object.entries({
          label: 'CAS Synthetic QA',
          'full-name': 'QA Synthetic',
          line1: '123 QA Test Street',
          city: 'Test City',
          zip: '94105',
          phone: '2025550123',
        })) {
          await page.getByTestId(`address-input-${field}`).fill(value);
        }
        await page.getByTestId('address-input-state').selectOption('CA');
        const saved = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === '/api/account/addresses' &&
            r.request().method() === 'POST',
        );
        await page.getByTestId('address-save').click();
        expect((await saved).status()).toBe(201);
        await page.reload();
      }
      await expect(page.getByTestId('address-card')).toHaveCount(1);
      await expect(page.getByTestId('address-label')).toHaveText('CAS Synthetic QA');
      await page.goto('/account/privacy');
      const downloadEvent = page.waitForEvent('download');
      await page.getByTestId('privacy-download').click();
      const download = await downloadEvent;
      const path = await download.path();
      if (!path) throw new Error('Export download missing');
      const exported = JSON.parse(await readFile(path, 'utf8'));
      expect(exported.profile?.email === account.email, 'Export belongs to the owned account').toBe(
        true,
      );
      expect
        .soft(Array.isArray(exported.addresses), 'CAS-009: export must include saved addresses')
        .toBe(true);
      expect
        .soft(
          JSON.stringify(exported).includes('123 QA Test Street'),
          'CAS-009: saved synthetic address must appear in export',
        )
        .toBe(true);
      expect
        .soft(Array.isArray(exported.orders), 'CAS-009: export must include orders, even if empty')
        .toBe(true);
      expect
        .soft(
          JSON.stringify(exported).includes(account.password),
          'Export must not include the password',
        )
        .toBe(false);
      await download.delete();
    });
  } finally {
    await test.step('remove test cart/address data, then request erasure and verify login denial', async () => {
      // Only the owned synthetic account is touched. Retain its private recovery ledger if erasure fails.
      expect((await signIn(page, account)).ok()).toBe(true);
      await verifyOwner(page, account);
      await cart.clear();
      await page.goto('/account/addresses');
      while ((await page.getByTestId('address-delete').count()) > 0) {
        await page.getByTestId('address-delete').first().click();
        const removed = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname.startsWith('/api/account/addresses/') &&
            r.request().method() === 'DELETE',
        );
        await page.getByTestId('address-delete-confirm').click();
        expect((await removed).ok()).toBe(true);
        // Cleanup needs the address DOM, not completion of every page resource.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('address-card')).toHaveCount(0);
      }
      await eraseAndVerify(page, account);
    });
  }
});
