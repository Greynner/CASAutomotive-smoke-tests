import { expect, test } from '@playwright/test';
import { CartPage } from '../../pages/cart.page.js';
import { gotoAccountPage, reloadAccountPage } from '../../support/account-navigation.js';
import {
  guardAccountContext,
  ownedAccount,
  signIn,
  verifyOwner,
} from '../../support/synthetic-account.js';

test('owned account extended: profile correction, marketing withdrawal and coupon thresholds', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(360_000);
  await guardAccountContext(context, baseURL ?? '');
  const account = await ownedAccount(page);
  expect((await signIn(page, account)).ok()).toBe(true);
  await verifyOwner(page, account);
  const originalName = await page.getByTestId('profile-last-name').inputValue();
  const cart = new CartPage(page);

  const saveProfileName = async (name: string) => {
    await gotoAccountPage(page, '/account');
    await page.getByTestId('profile-last-name').fill(name);
    const saved = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/account' && r.request().method() === 'PATCH',
    );
    await page.getByTestId('profile-save').click();
    expect((await saved).ok()).toBe(true);
    await reloadAccountPage(page);
    await expect(page.getByTestId('profile-last-name')).toHaveValue(name);
  };
  const setMarketing = async (value: boolean) => {
    await gotoAccountPage(page, '/account');
    const toggle = page.getByTestId('marketing-toggle');
    if ((await toggle.getAttribute('aria-checked')) !== String(value)) {
      const saved = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/account' && r.request().method() === 'PATCH',
      );
      await toggle.click();
      expect((await saved).ok()).toBe(true);
    }
    await reloadAccountPage(page);
    await expect(toggle).toHaveAttribute('aria-checked', String(value));
    const response = await page.request.get('/api/account/export');
    expect(response.ok()).toBe(true);
    const exported = await response.json();
    expect(exported.profile?.email === account.email, 'Only inspect the owned export').toBe(true);
    expect
      .soft(
        exported.marketingConsent?.emailOffers,
        'Export reflects the saved marketing preference',
      )
      .toBe(value);
  };
  const rejectedCoupon = async (code: string) => {
    await page.getByTestId('coupon-input').fill(code);
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname.startsWith('/api/cart') && r.request().method() === 'POST',
    );
    await page.getByTestId('coupon-apply').click();
    expect([400, 422], 'Invalid or ineligible coupon must return a validation error').toContain(
      (await response).status(),
    );
    await reloadAccountPage(page);
    await expect(page.getByTestId('coupon-remove')).toHaveCount(0);
  };

  try {
    await test.step('profile correction persists and export reflects the correction', async () => {
      await saveProfileName('Synthetic QA Updated');
      const response = await page.request.get('/api/account/export');
      expect(response.ok()).toBe(true);
      const exported = await response.json();
      expect(exported.profile?.email === account.email).toBe(true);
      expect.soft(exported.profile?.lastName).toBe('Synthetic QA Updated');
    });
    await test.step('marketing opt-in then withdrawal persist; no email delivery is requested', async () => {
      await setMarketing(true);
      await setMarketing(false);
    });
    await test.step('SAVE20 minimum and invalid coupon are enforced', async () => {
      await cart.clear();
      await page.goto('/products/p108');
      const added = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/cart/items' && r.request().method() === 'POST',
      );
      await page.getByTestId('add-to-cart').click();
      expect((await added).status()).toBe(201);
      await cart.goto();
      expect(await cart.cents('cart-subtotal')).toBe(5000);
      await rejectedCoupon('NOT-A-REAL-CAS-CODE');
      await rejectedCoupon('SAVE20');
      await cart.mutate(() => page.getByTestId('cart-qty-increase').click());
      expect(await cart.cents('cart-subtotal')).toBe(10000);
      await cart.applyCoupon('save20');
      await expect(page.getByTestId('coupon-remove')).toHaveAttribute('aria-label', /SAVE20/);
      await cart.mutate(() => page.getByTestId('cart-qty-decrease').click());
      expect(await cart.cents('cart-subtotal')).toBe(5000);
      await expect
        .soft(
          page.getByTestId('coupon-remove'),
          'SAVE20 must be removed when the subtotal drops below $100',
        )
        .toHaveCount(0);
      if ((await page.getByTestId('coupon-remove').count()) > 0) {
        await cart.mutate(() => page.getByTestId('coupon-remove').click());
      }
      await cart.applyCoupon('take5');
      await expect(page.getByTestId('cart-summary')).toContainText('Discount (TAKE5)');
      await cart.mutate(() => page.getByTestId('coupon-remove').click());
      await expect(page.getByTestId('coupon-remove')).toHaveCount(0);
      expect(await cart.cents('cart-subtotal')).toBe(5000);
    });
  } finally {
    await test.step('restore synthetic profile, withdraw marketing and empty cart', async () => {
      expect((await signIn(page, account)).ok()).toBe(true);
      await verifyOwner(page, account);
      await saveProfileName(originalName);
      await setMarketing(false);
      await cart.clear();
    });
  }
});
