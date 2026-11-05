import { expect, type Page } from '@playwright/test';
import { gotoAccountPage } from '../support/account-navigation.js';
import { type DemoRun, saveDemoRun } from '../support/demo-session.js';
import { moneyToCents } from '../support/marketplace.js';

export class DemoSellerPage {
  constructor(
    readonly page: Page,
    readonly run: DemoRun,
  ) {}

  async edit() {
    await gotoAccountPage(this.page, `/seller/listings/${this.run.product.id}/edit`);
    await expect(this.page.getByTestId('listing-title-input')).toHaveValue(this.run.product.title);
  }

  async stock() {
    await this.edit();
    return Number(await this.page.getByTestId('listing-stock-input').inputValue());
  }

  async setStatus(status: 'active' | 'draft') {
    await this.edit();
    if (await this.page.getByTestId(`listing-status-${status}`).isChecked()) return;
    await this.page.getByTestId(`listing-status-${status}`).check();
    const response = this.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/seller/products/${this.run.product.id}` &&
        r.request().method() === 'PATCH',
    );
    await this.page.getByTestId('listing-submit').click();
    expect((await response).ok()).toBe(true);
    await this.edit();
    await expect(this.page.getByTestId(`listing-status-${status}`)).toBeChecked();
    if (status === 'draft') {
      this.run.cleanup.push('Owned synthetic listing is draft and hidden from public discovery.');
      await saveDemoRun(this.run);
    }
  }

  async orderRow(id: string) {
    if (!this.run.orderIds.includes(id))
      throw new Error('Seller order is outside this owned demo run.');
    await gotoAccountPage(this.page, '/seller/orders');
    const row = this.page.locator(`[data-testid="seller-order-row"][data-order-id="${id}"]`);
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('seller-order-item')).toContainText(this.run.product.title);
    return row;
  }

  async ship(id: string) {
    const row = await this.orderRow(id);
    const status = (await row.getByTestId('order-status').textContent())?.trim();
    if (status === 'Shipped' || status === 'Delivered') return;
    await expect(row.getByTestId('order-status')).toHaveText('Processing');
    await row.getByTestId('mark-shipped').click();
    await this.page.getByTestId('tracking-input').fill(`QA-DEMO-${this.run.runId.slice(0, 8)}`);
    const response = this.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/seller/orders/${id}/ship` &&
        r.request().method() === 'POST',
    );
    await this.page.getByTestId('confirm-ship').click();
    expect(
      (await response).ok(),
      'Owned seller order must accept a synthetic tracking number',
    ).toBe(true);
    await expect((await this.orderRow(id)).getByTestId('order-status')).toHaveText('Shipped');
  }

  async deliver(id: string) {
    const row = await this.orderRow(id);
    if ((await row.getByTestId('order-status').textContent())?.trim() === 'Delivered') return;
    await expect(row.getByTestId('order-status')).toHaveText('Shipped');
    const response = this.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/seller/orders/${id}/deliver` &&
        r.request().method() === 'POST',
    );
    await row.getByTestId('mark-delivered').click();
    expect(
      (await response).ok(),
      'Owned seller order must transition from Shipped to Delivered',
    ).toBe(true);
    await expect((await this.orderRow(id)).getByTestId('order-status')).toHaveText('Delivered');
  }

  async metrics() {
    await gotoAccountPage(this.page, '/seller');
    const text = async (id: string) => (await this.page.getByTestId(id).textContent()) ?? '';
    return {
      revenue: moneyToCents(await text('kpi-revenue')),
      orders: Number((await text('kpi-orders')).match(/\d+/)?.[0]),
      units: Number((await text('kpi-units')).match(/\d+/)?.[0]),
      average: moneyToCents(await text('kpi-aov')),
      net: moneyToCents(await text('kpi-net')),
    };
  }
}
