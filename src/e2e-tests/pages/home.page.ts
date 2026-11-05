import { expect, type Page } from '@playwright/test';

export class HomePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
    await expect(this.page.getByTestId('hero-shop-cta')).toBeVisible();
  }

  async rejectCookies() {
    // A fresh Playwright context must offer a real choice; do not swallow missing UI.
    await this.page.getByTestId('cookie-reject').click();
    await expect(this.page.getByTestId('cookie-banner')).toBeHidden();
  }

  async search(query: string) {
    await this.page.getByTestId('header-search').fill(query);
    await this.page.getByTestId('header-search').press('Enter');
    await expect(this.page).toHaveURL(/\/products\?q=/);
  }
}
