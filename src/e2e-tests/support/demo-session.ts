import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { type Browser, type BrowserContext, expect, type Page } from '@playwright/test';
import {
  approvedAccountOrigin,
  assertSyntheticAccount,
  type SyntheticAccount,
} from './account-policy.js';
import { acquireDemoRunLock } from './demo-lock.js';
import {
  assertDemoPaymentDisclosure,
  assertOwnedDemoCartItem,
  assertOwnedDemoCartSnapshot,
  assertSyntheticDemoCheckout,
  type DemoScope,
  isAllowedDemoRequest,
} from './demo-policy.js';
import { verifyOwner } from './synthetic-account.js';

const runPath = '.auth/demo-run.json';
export type DemoRun = {
  runId: string;
  createdAt: string;
  status: string;
  shopName: string;
  shop: { id: string; slug: string };
  product: { id: string; title: string };
  checkoutAttempts: number;
  orderIds: string[];
  cancellationOrder?: string;
  deliveryOrder?: string;
  pendingCheckout?: { attempt: number; startedAt: string };
  checkoutResults?: Array<{ kind: string; status: number; orderId?: string }>;
  cleanup: string[];
  observations?: string[];
};
export type DemoFixture = {
  run: DemoRun;
  seller: SyntheticAccount;
  buyer: SyntheticAccount;
  releaseLock: () => Promise<void>;
};

export async function saveDemoRun(run: DemoRun) {
  const temporary = `${runPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(run, null, 2), { mode: 0o600 });
    await rename(temporary, runPath);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function loadDemoFixture(): Promise<DemoFixture> {
  if (
    process.env.CI ||
    process.env.RUN_DEMO_TESTS !== '1' ||
    process.env.AUTHORIZE_DEMO_CHECKOUT !== '1'
  ) {
    throw new Error(
      'Demo mutations require local RUN_DEMO_TESTS=1 and AUTHORIZE_DEMO_CHECKOUT=1; CI is prohibited.',
    );
  }
  const releaseLock = await acquireDemoRunLock();
  try {
    return { ...(await readDemoFixture()), releaseLock };
  } catch (error) {
    await releaseLock();
    throw error;
  }
}

async function readDemoFixture(): Promise<Omit<DemoFixture, 'releaseLock'>> {
  const seller: unknown = JSON.parse(await readFile('.auth/owned-account.json', 'utf8'));
  const buyer: unknown = JSON.parse(await readFile('.auth/demo-buyer.json', 'utf8'));
  assertSyntheticAccount(seller);
  assertSyntheticAccount(buyer);
  if (seller.email === buyer.email)
    throw new Error('Demo roles must use two distinct owned synthetic accounts.');
  const run = JSON.parse(await readFile(runPath, 'utf8')) as DemoRun;
  if (
    !run.runId ||
    !run.shop?.id ||
    !run.product?.id ||
    !run.product.title?.startsWith('CAS QA Demo Item ')
  ) {
    throw new Error(
      'Owned demo shop/product fixture is missing. Prepare it explicitly; never substitute another seller product.',
    );
  }
  if (
    !Number.isInteger(run.checkoutAttempts) ||
    run.checkoutAttempts < 0 ||
    run.checkoutAttempts > 4 ||
    !Array.isArray(run.orderIds) ||
    run.orderIds.length > 2 ||
    ![run.product.id, ...run.orderIds].every((id) => /^[a-zA-Z0-9_-]+$/.test(id))
  ) {
    throw new Error('Invalid demo resource ledger or operation budget.');
  }
  if (run.pendingCheckout)
    throw new Error('A checkout outcome is unknown. Reconcile it manually before any rerun.');
  if (run.status.startsWith('completed'))
    throw new Error('This bounded demo has already run; do not duplicate orders by rerunning it.');
  if (run.status !== 'setup' && process.env.RESUME_DEMO_RUN !== '1') {
    throw new Error(
      'Interrupted run: review its private ledger, then explicitly set RESUME_DEMO_RUN=1.',
    );
  }
  run.status = 'running';
  await saveDemoRun(run);
  return { run, seller, buyer };
}

export async function createDemoRole(
  browser: Browser,
  role: 'seller' | 'buyer',
  fixture: DemoFixture,
) {
  const context = await browser.newContext({
    baseURL: approvedAccountOrigin,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const blocked: string[] = [];
  const scope: DemoScope = {
    role,
    allowBuyerCreation: false,
    allowShopCreation: false,
    allowProductCreation: false,
    productId: fixture.run.product.id,
    orderIds: fixture.run.orderIds,
    checkoutArmed: false,
    checkoutAttempts: fixture.run.checkoutAttempts,
  };
  await installDemoGuard(context, scope, fixture.run, blocked);
  const account = fixture[role];
  // Login UI is covered separately. Authenticate this bounded workflow through the exact
  // same-origin API, without redirects, then verify the owned profile in the browser.
  try {
    const login = await context.request.post(`${approvedAccountOrigin}/api/auth/login`, {
      data: { email: account.email, password: account.password },
      maxRedirects: 0,
      timeout: 20_000,
    });
    expect(login.ok(), 'Owned synthetic demo authentication must succeed').toBe(true);
    await verifyOwner(page, account);
  } catch (error) {
    await context.close();
    throw error;
  }
  return {
    context,
    page,
    scope,
    blocked,
    async armCheckout() {
      const cart = await context.request.get(`${approvedAccountOrigin}/api/cart`, {
        maxRedirects: 0,
      });
      expect(cart.ok(), 'Authenticated cart preflight must succeed').toBe(true);
      assertOwnedDemoCartSnapshot(await cart.json(), fixture.run.product.id);
      await expect(page.getByTestId('checkout-line')).toHaveCount(1);
      await expect(page.getByTestId('checkout-line')).toContainText(fixture.run.product.title);
      const details = page.getByTestId('test-cards');
      if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
      await expect(details).toHaveJSProperty('open', true);
      const disclosure = (await details.textContent()) ?? '';
      assertDemoPaymentDisclosure(disclosure);
      scope.checkoutAttempts = fixture.run.checkoutAttempts;
      scope.checkoutArmed = true;
    },
  };
}

async function installDemoGuard(
  context: BrowserContext,
  scope: DemoScope,
  run: DemoRun,
  blocked: string[],
) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    try {
      if (!isAllowedDemoRequest(request.method(), request.url(), scope))
        throw new Error('Out-of-scope request');
      if (request.method() === 'POST' && url.pathname === '/api/cart/items') {
        assertOwnedDemoCartItem(request.postDataJSON(), run.product.id);
      }
      if (request.method() === 'POST' && url.pathname === '/api/checkout') {
        if (run.pendingCheckout) throw new Error('Previous checkout outcome must be reconciled');
        assertSyntheticDemoCheckout(request.postDataJSON());
        run.checkoutAttempts++;
        scope.checkoutAttempts = run.checkoutAttempts;
        scope.checkoutArmed = false;
        run.pendingCheckout = {
          attempt: run.checkoutAttempts,
          startedAt: new Date().toISOString(),
        };
        await saveDemoRun(run);
      }
      return route.continue();
    } catch {
      blocked.push(
        `${request.method()} ${url.hostname} ${url.pathname.replace(/[a-zA-Z0-9_-]{12,}/g, ':resource')}`,
      );
      return route.abort('blockedbyclient');
    }
  });
}

export async function recordDemoCheckout(
  run: DemoRun,
  kind: string,
  status: number,
  orderId?: unknown,
) {
  if (typeof orderId === 'string' && !/^[a-zA-Z0-9_-]+$/.test(orderId))
    throw new Error('Unsafe order identifier; reconcile the checkout manually.');
  if (typeof orderId === 'string' && !run.orderIds.includes(orderId)) run.orderIds.push(orderId);
  if (kind === 'approved' && typeof orderId === 'string') {
    if (!run.cancellationOrder) run.cancellationOrder = orderId;
    else if (orderId !== run.cancellationOrder && !run.deliveryOrder) run.deliveryOrder = orderId;
  }
  run.checkoutResults ??= [];
  run.checkoutResults.push({ kind, status, ...(typeof orderId === 'string' ? { orderId } : {}) });
  if (status === 402 || ((status === 200 || status === 201) && typeof orderId === 'string')) {
    delete run.pendingCheckout;
  }
  await saveDemoRun(run);
  if (run.pendingCheckout)
    throw new Error(
      'Unexpected checkout response; outcome retained for manual reconciliation. Do not retry.',
    );
}

export async function assertDemoOwner(page: Page, account: SyntheticAccount) {
  await verifyOwner(page, account);
}
