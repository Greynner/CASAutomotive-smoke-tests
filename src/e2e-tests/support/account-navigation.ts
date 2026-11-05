import { expect, type Page } from '@playwright/test';

// Account tests never choose cookie consent. The client-rendered banner's mount is an
// observable hydration marker; SSR form visibility alone does not mean handlers are attached.
async function waitForAccountHydration(page: Page) {
  await expect(page.getByTestId('cookie-banner')).toBeVisible();
}

export async function gotoAccountPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAccountHydration(page);
}

export async function reloadAccountPage(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForAccountHydration(page);
}
