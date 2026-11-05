import { expect, type Page } from '@playwright/test';
import { moneyToCents } from '../support/marketplace.js';

export class CartPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/cart');
  }

  async mutate(action: () => Promise<unknown>) {
    const response = this.page.waitForResponse(
      (r) => new URL(r.url()).pathname.startsWith('/api/cart') && r.request().method() !== 'GET',
    );
    await action();
    expect((await response).ok(), 'Cart mutation should succeed').toBe(true);
    // Read persisted server state, not a pre-update React render.
    await this.page.reload();
  }

  async clear() {
    await this.goto();
    while ((await this.page.getByTestId('cart-line-remove').count()) > 0) {
      await this.mutate(() => this.page.getByTestId('cart-line-remove').first().click());
    }
    await expect(this.page.getByTestId('cart-empty')).toBeVisible();
  }

  async cents(id: string) {
    const text = (await this.page.getByTestId(id).textContent()) ?? '';
    return /free/i.test(text) ? 0 : moneyToCents(text);
  }

  async applyCoupon(code: string) {
    await this.page.getByTestId('coupon-input').fill(code);
    await this.mutate(() => this.page.getByTestId('coupon-apply').click());
    await expect(this.page.getByTestId('coupon-remove')).toBeVisible();
  }
}
