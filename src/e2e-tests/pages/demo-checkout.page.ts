import { expect, type Page } from '@playwright/test';
import { gotoAccountPage } from '../support/account-navigation.js';
import { demoCards } from '../support/demo-policy.js';
import { type DemoRun, recordDemoCheckout } from '../support/demo-session.js';

export class DemoCheckoutPage {
  constructor(
    readonly page: Page,
    readonly run: DemoRun,
  ) {}

  async fill(kind: keyof typeof demoCards) {
    await gotoAccountPage(this.page, '/checkout');
    for (const [field, value] of Object.entries({
      fullName: 'QA Demo Buyer',
      line1: '123 QA Test Street',
      line2: `CAS-DEMO-${this.run.runId.slice(0, 8)}`,
      city: 'Test City',
      state: 'CA',
      zip: '94105',
      phone: '2025550123',
    }))
      await this.page.getByTestId(`address-${field}`).fill(value);
    await this.page.getByTestId('address-save').uncheck();
    await this.page.getByTestId('shipping-standard').click();
    await this.page.getByTestId('card-number').fill(demoCards[kind]);
    await this.page.getByTestId('card-name').fill('QA Demo Buyer');
    const year = String(new Date().getFullYear() + 2).slice(-2);
    await this.page.getByTestId('card-expiry').fill(`12/${year}`);
    await this.page.getByTestId('card-cvc').fill('123');
  }

  async submit(kind: keyof typeof demoCards, arm: () => Promise<void>) {
    await arm();
    const response = this.page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/checkout' && r.request().method() === 'POST',
    );
    await this.page.getByTestId('place-order').click();
    const result = await response;
    const body = await result.json();
    await recordDemoCheckout(this.run, kind, result.status(), body.orderId);
    if (kind !== 'approved' && result.ok())
      throw new Error(
        'A documented declined card created an order; stop before any further checkout.',
      );
    if (result.ok()) {
      if (typeof body.orderId !== 'string')
        throw new Error('Approved demo checkout returned no order identifier');
      await expect(this.page).toHaveURL(new RegExp(`/orders/${body.orderId}/confirmation$`), {
        timeout: 20_000,
      });
    }
    return {
      status: result.status(),
      orderId: typeof body.orderId === 'string' ? body.orderId : undefined,
    };
  }
}
