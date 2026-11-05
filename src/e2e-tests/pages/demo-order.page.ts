import { expect, type Page } from '@playwright/test';
import { gotoAccountPage, reloadAccountPage } from '../support/account-navigation.js';
import type { DemoRun } from '../support/demo-session.js';
import { moneyToCents } from '../support/marketplace.js';

export class DemoOrderPage {
  constructor(
    readonly page: Page,
    readonly run: DemoRun,
  ) {}

  async goto(id: string) {
    if (!this.run.orderIds.includes(id)) throw new Error('Order is not owned by this demo run.');
    await gotoAccountPage(this.page, `/orders/${id}`);
    await expect(this.page.getByTestId('order-item')).toContainText(this.run.product.title);
  }

  async status() {
    return (await this.page.getByTestId('order-status').textContent())?.trim() ?? '';
  }

  async total() {
    return moneyToCents((await this.page.getByTestId('order-total').textContent()) ?? '');
  }

  async cancel(id: string) {
    await this.goto(id);
    if ((await this.status()).toLowerCase() === 'cancelled') return;
    await expect(this.page.getByTestId('order-status')).toHaveText('Processing');
    await this.page.getByTestId('cancel-order').click();
    await expect(this.page.getByTestId('cancel-dialog')).toBeVisible();
    const response = this.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/orders/${id}/cancel` && r.request().method() === 'POST',
    );
    await this.page.getByTestId('cancel-confirm').click();
    expect((await response).ok(), 'Owned Processing demo order must be cancellable').toBe(true);
    await reloadAccountPage(this.page);
    await expect(this.page.getByTestId('order-status')).toHaveText('Cancelled');
  }
}
