import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { type BrowserContext, expect, type Page } from '@playwright/test';
import { gotoAccountPage } from './account-navigation.js';

const approvedOrigin = 'https://qa-marketplace-app-b9mpo.ondigitalocean.app';
const ledgerPath = '.auth/owned-account.json';

export type SyntheticAccount = {
  email: string;
  password: string;
  targetOrigin: string;
  createdBy: string;
  cleanupStatus: string;
};

export async function guardAccountContext(context: BrowserContext, baseURL: string) {
  if (new URL(baseURL).origin !== approvedOrigin) {
    throw new Error('Account mutations are authorized only on the original QA origin.');
  }
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
    const url = new URL(request.url());
    const allowed =
      url.origin === approvedOrigin &&
      !/order|payment|checkout/i.test(url.pathname) &&
      (/^\/api\/auth\/(register|login|logout)$/.test(url.pathname) ||
        /^\/api\/cart(?:\/.*)?$/.test(url.pathname) ||
        /^\/api\/account(?:\/addresses(?:\/[^/]+)?)?$/.test(url.pathname));
    // Deny by default: in particular no order, payment, reset-email or seller writes.
    if (!allowed) return route.abort('blockedbyclient');
    return route.continue();
  });
}

async function saveLedger(account: SyntheticAccount) {
  await mkdir('.auth', { recursive: true, mode: 0o700 });
  await writeFile(ledgerPath, JSON.stringify(account, null, 2), { mode: 0o600 });
}

export async function ownedAccount(page: Page): Promise<SyntheticAccount> {
  let stored: string | undefined;
  try {
    stored = await readFile(ledgerPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (stored) {
    const account = JSON.parse(stored) as SyntheticAccount;
    if (
      account.targetOrigin !== approvedOrigin ||
      account.createdBy !== 'cas-synthetic-qa' ||
      !/^cas-qa-[a-f0-9-]+@example\.com$/.test(account.email)
    ) {
      throw new Error('Refusing to mutate an account without an owned synthetic-account ledger.');
    }
    return account;
  }
  if (process.env.CREATE_SYNTHETIC_ACCOUNT !== '1') {
    throw new Error(
      'No owned account. Explicitly set CREATE_SYNTHETIC_ACCOUNT=1 for initial creation.',
    );
  }
  const account: SyntheticAccount = {
    email: `cas-qa-${randomUUID()}@example.com`,
    password: `Qa9!${randomBytes(20).toString('hex')}`,
    targetOrigin: approvedOrigin,
    createdBy: 'cas-synthetic-qa',
    cleanupStatus: 'pending registration/cleanup verification',
  };
  // Persist before submission so an interrupted registration can be recovered without duplication.
  await saveLedger(account);
  await gotoAccountPage(page, '/register');
  await page.getByTestId('register-first-name').fill('QA');
  await page.getByTestId('register-last-name').fill('Synthetic');
  await page.getByTestId('register-email').fill(account.email);
  await page.getByTestId('register-password').fill(account.password);
  await page.getByTestId('register-confirm-password').fill(account.password);
  await page.getByTestId('register-marketing').uncheck();
  await page.getByTestId('register-accept-terms').check();
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/auth/register' && r.request().method() === 'POST',
  );
  await page.getByTestId('register-submit').click();
  expect((await response).ok(), 'Synthetic registration must succeed').toBe(true);
  await expect(page).not.toHaveURL(/\/register$/);
  account.cleanupStatus = 'created; cleanup pending';
  await saveLedger(account);
  return account;
}

export async function signIn(page: Page, account: SyntheticAccount) {
  // A logged-in session redirects /login away from the form. Authenticate from a clean session.
  await page.context().clearCookies();
  await gotoAccountPage(page, '/login');
  await page.getByTestId('login-email').fill(account.email);
  await page.getByTestId('login-password').fill(account.password);
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST',
  );
  await page.getByTestId('login-submit').click();
  const result = await response;
  if (result.ok()) await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  return result;
}

export async function verifyOwner(page: Page, account: SyntheticAccount) {
  await gotoAccountPage(page, '/account');
  expect(
    (await page.getByTestId('profile-email').inputValue()) === account.email,
    'Only the locally owned synthetic account may be mutated',
  ).toBe(true);
}

export async function eraseAndVerify(page: Page, account: SyntheticAccount) {
  await verifyOwner(page, account);
  await gotoAccountPage(page, '/account/privacy');
  await page.getByTestId('privacy-delete-open').click();
  await page.getByTestId('delete-password').fill(account.password);
  await page.getByTestId('delete-confirm').fill('DELETE');
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/account' && r.request().method() === 'DELETE',
  );
  await page.getByTestId('delete-submit').click();
  expect((await response).ok(), 'Deletion request should succeed').toBe(true);
  // Do not mistake a redirect (or its absence) for proof of erasure.
  // The decisive oracle is whether credentials still authenticate in a clean session.
  const login = await signIn(page, account);
  if (login.status() === 401) {
    await rm(ledgerPath);
  } else {
    account.cleanupStatus = 'FAILED: deleted account still accepts login; manual cleanup required';
    await saveLedger(account);
  }
  expect.soft(login.status(), 'CAS-007: deleted credentials must no longer authenticate').toBe(401);
}
