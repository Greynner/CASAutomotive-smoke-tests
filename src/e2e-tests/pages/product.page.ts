import { expect, type Page } from '@playwright/test';
import { moneyToCents } from '../support/marketplace.js';

export class ProductPage {
  constructor(readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
    await expect(this.page.getByTestId('product-title')).toBeVisible();
  }

  async price() {
    return moneyToCents((await this.page.getByTestId('product-price').textContent()) ?? '');
  }
}
