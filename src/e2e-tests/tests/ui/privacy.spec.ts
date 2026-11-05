import { expect, test } from '@playwright/test';
import { HomePage } from '../../pages/home.page.js';

for (const choice of ['reject', 'accept'] as const) {
  test(`cookie ${choice} choice persists after reload @privacy`, async ({ page }) => {
    await new HomePage(page).goto();
    await expect(page.getByTestId('cookie-banner')).toBeVisible();
    await page.getByTestId(`cookie-${choice}`).click();
    await expect(page.getByTestId('cookie-banner')).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('hero-shop-cta')).toBeVisible();
    // Fresh reload should restore consent; a transient hidden banner is insufficient.
    await expect(page.getByTestId('cookie-banner')).toBeHidden();
    // Also check persisted storage so a pre-hydration hidden banner cannot create a false pass.
    const consent = (await page.context().cookies()).find((cookie) => cookie.name === 'mp_consent');
    expect(consent, 'The choice must be remembered for 12 months, per Cookie Policy').toBeDefined();
    expect(consent?.expires ?? 0).toBeGreaterThan(Date.now() / 1000 + 364 * 24 * 60 * 60);
  });
}

test('registration requires explicit terms agreement and marketing is opt-in @privacy', async ({
  page,
}) => {
  await page.goto('/register');
  await expect(page.getByTestId('register-accept-terms')).not.toBeChecked();
  await expect(page.getByTestId('register-marketing')).not.toBeChecked();
});

test('privacy and cookie links point to actual policy sections @privacy', async ({ page }) => {
  await page.goto('/help');
  for (const section of ['privacy', 'cookies']) {
    await page.getByTestId(`help-toc-${section}`).click();
    await expect(page).toHaveURL(new RegExp(`#${section}$`));
    await expect(page.getByTestId(`help-section-${section}`)).toBeVisible();
  }
  await expect(page.getByTestId('help-privacy-rights')).toContainText('Erasure');
});
