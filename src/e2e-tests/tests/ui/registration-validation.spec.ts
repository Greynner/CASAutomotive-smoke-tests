import { expect, type Page, test } from '@playwright/test';

async function blockRegistration(page: Page) {
  let attempts = 0;
  await page.route('**/api/auth/register', async (route) => {
    attempts++;
    await route.abort('blockedbyclient');
  });
  return () => attempts;
}

async function fillRegistration(page: Page, password: string, confirmation = password) {
  for (const [id, value] of Object.entries({
    'register-first-name': 'QA',
    'register-last-name': 'Synthetic',
    'register-email': 'validation-only@example.com',
    'register-password': password,
    'register-confirm-password': confirmation,
  })) {
    await page.getByTestId(id).fill(value);
  }
  await page.getByTestId('register-marketing').uncheck();
  await page.getByTestId('register-accept-terms').check();
}

test('empty registration shows required-field and agreement errors without account creation', async ({
  page,
}) => {
  const attempts = await blockRegistration(page);
  await page.goto('/register');
  await page.getByTestId('register-submit').click();
  for (const message of [
    'Enter your first name.',
    'Enter your last name.',
    'Enter a valid email address.',
    'You need to accept the Terms and Privacy Policy.',
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  expect(
    attempts(),
    'Client validation must stop the request; backend writes are blocked for safety',
  ).toBe(0);
});

for (const scenario of ['missing first name', 'missing confirmation', 'missing agreement']) {
  test(`registration client validation: ${scenario}`, async ({ page }) => {
    const attempts = await blockRegistration(page);
    await page.goto('/register');
    await fillRegistration(page, 'ValidPassword9!');
    let message: string;
    if (scenario === 'missing first name') {
      await page.getByTestId('register-first-name').fill('');
      message = 'Enter your first name.';
    } else if (scenario === 'missing confirmation') {
      await page.getByTestId('register-confirm-password').fill('');
      message = 'Confirm your password.';
    } else {
      await page.getByTestId('register-accept-terms').uncheck();
      message = 'You need to accept the Terms and Privacy Policy.';
    }
    await page.getByTestId('register-submit').click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    expect(attempts()).toBe(0);
  });
}

test('registration rejects confirmation mismatch without creating an account', async ({ page }) => {
  const attempts = await blockRegistration(page);
  await page.goto('/register');
  await fillRegistration(page, 'ValidPassword9!', 'Mismatch9!');
  await page.getByTestId('register-submit').click();
  await expect(page.getByText("Passwords don't match.", { exact: true })).toBeVisible();
  expect(attempts()).toBe(0);
});
