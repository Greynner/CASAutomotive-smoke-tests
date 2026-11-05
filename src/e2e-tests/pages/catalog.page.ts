import { expect, type Page } from '@playwright/test';
import { moneyToCents } from '../support/marketplace.js';

export class CatalogPage {
  constructor(readonly page: Page) {}

  get cards() {
    return this.page.getByTestId('product-card');
  }

  async goto(query = '') {
    await this.page.goto(`/products${query}`);
    await expect(this.page.getByTestId('catalog-title')).toBeVisible();
  }

  async prices() {
    const values = await this.cards.getByTestId('product-card-price').allTextContents();
    return values.map(moneyToCents);
  }

  async sort(value: string) {
    await this.page.getByTestId('sort-select').selectOption(value);
    await expect(this.page).toHaveURL(new RegExp(`sort=${value}`));
    await expect(this.cards.first()).toBeVisible();
  }
}
