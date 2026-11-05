import { readFile, rm, writeFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';
import { CartPage } from '../../pages/cart.page.js';
import { DemoCheckoutPage } from '../../pages/demo-checkout.page.js';
import { DemoOrderPage } from '../../pages/demo-order.page.js';
import { DemoSellerPage } from '../../pages/demo-seller.page.js';
import { gotoAccountPage } from '../../support/account-navigation.js';
import { approvedAccountOrigin } from '../../support/account-policy.js';
import { assertDemoPaymentDisclosure } from '../../support/demo-policy.js';
import {
  createDemoRole,
  type DemoFixture,
  loadDemoFixture,
  saveDemoRun,
} from '../../support/demo-session.js';
import { moneyToCents } from '../../support/marketplace.js';

const test = base.extend<{ demoFixture: DemoFixture }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured dependencies; this fixture has none.
  demoFixture: async ({}, use) => {
    const fixture = await loadDemoFixture();
    try {
      await use(fixture);
    } finally {
      try {
        if (fixture.run.status === 'running') {
          fixture.run.status = 'interrupted';
          fixture.run.cleanup.push(
            'Interrupted before terminal bookkeeping; review cleanup manually.',
          );
          await saveDemoRun(fixture.run);
        }
      } finally {
        await fixture.releaseLock();
      }
    }
  },
});

function displayedDate(text: string): number {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) throw new Error('Expected the order view to expose its DD/MM/YYYY date.');
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

test('authorized bounded demo: payments, cancellation, fulfilment, return eligibility and seller isolation', async ({
  browser,
  demoFixture: fixture,
}, testInfo) => {
  const { run } = fixture;
  const seller = await createDemoRole(browser, 'seller', fixture);
  const buyer = await createDemoRole(browser, 'buyer', fixture);
  const guest = await browser.newContext({ baseURL: approvedAccountOrigin });
  const shop = new DemoSellerPage(seller.page, run);
  const orders = new DemoOrderPage(buyer.page, run);
  const cart = new CartPage(buyer.page);
  const checkout = new DemoCheckoutPage(buyer.page, run);
  const summary: Record<string, unknown> = {
    scope: 'Authorized demo only; no real charges per the application disclosure.',
  };
  let finished = false;
  let buyerErased = false;
  try {
    if (run.checkoutResults?.length)
      testInfo.annotations.push({
        type: 'checkpoint-reuse',
        description:
          'Reuses recorded outcomes from this bounded run; never resubmits successful or declined checkout attempts.',
      });
    await test.step('draft is private, active listing is public and checkout discloses no real payments', async () => {
      await shop.setStatus('draft');
      expect(
        (await guest.request.get(`/products/${run.product.id}`, { maxRedirects: 0 })).status(),
      ).toBe(404);
      await shop.setStatus('active');
      await cart.goto();
      if (await buyer.page.getByTestId('cart-empty').count()) {
        await gotoAccountPage(buyer.page, `/products/${run.product.id}`);
        const added = buyer.page.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/cart/items' && r.request().method() === 'POST',
        );
        await buyer.page.getByTestId('add-to-cart').click();
        expect((await added).status()).toBe(201);
      }
      await checkout.fill('declined');
      const details = buyer.page.getByTestId('test-cards');
      if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
      await expect(details).toHaveJSProperty('open', true);
      assertDemoPaymentDisclosure((await details.textContent()) ?? '');
      summary.demoDisclosureObserved = true;
    });

    await test.step('declined and insufficient-funds cards return 402 without extra orders', async () => {
      for (const kind of ['declined', 'insufficientFunds'] as const) {
        let result = run.checkoutResults?.find((item) => item.kind === kind);
        if (!result) {
          await checkout.fill(kind);
          const outcome = await checkout.submit(kind, () => buyer.armCheckout());
          result = { kind, ...outcome };
          await expect(buyer.page.getByTestId('payment-error')).toBeVisible();
          expect(await shop.stock()).toBe(3);
        }
        expect(result.status).toBe(402);
        expect(result.orderId).toBeUndefined();
      }
      summary.declines = ['declined:402', 'insufficientFunds:402'];
    });

    await test.step('first approved order is persisted and Processing cancellation is recorded', async () => {
      if (!run.cancellationOrder) {
        await checkout.fill('approved');
        await checkout.submit('approved', () => buyer.armCheckout());
      }
      if (!run.cancellationOrder) throw new Error('Approved cancellation order is missing.');
      await orders.goto(run.cancellationOrder);
      expect(await orders.total()).toBe(1139); // $5 item + $5.99 standard shipping + $0.40 tax.
      await orders.cancel(run.cancellationOrder);
      expect(await orders.status()).toBe('Cancelled');
      if (!run.deliveryOrder) {
        expect
          .soft(
            await shop.stock(),
            'CAS-015: Processing cancellation must restore its unit of stock',
          )
          .toBe(3);
        const metrics = await shop.metrics();
        expect
          .soft(metrics.revenue, 'CAS-016: cancelled item sales must not contribute revenue')
          .toBe(0);
        expect
          .soft(metrics.orders, 'CAS-016: cancelled orders must not count in seller KPIs')
          .toBe(0);
        expect.soft(metrics.units).toBe(0);
      }
      summary.processingCancellation = 'Cancelled';
    });

    await test.step('second approved order is shipped and delivered with synthetic tracking', async () => {
      if (!run.deliveryOrder) {
        await cart.clear();
        await gotoAccountPage(buyer.page, `/products/${run.product.id}`);
        const added = buyer.page.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/cart/items' && r.request().method() === 'POST',
        );
        await buyer.page.getByTestId('add-to-cart').click();
        expect((await added).status()).toBe(201);
        await checkout.fill('approved');
        await checkout.submit('approved', () => buyer.armCheckout());
      }
      if (!run.deliveryOrder) throw new Error('Approved delivery order is missing.');
      await shop.ship(run.deliveryOrder);
      await shop.deliver(run.deliveryOrder);
      await orders.goto(run.deliveryOrder);
      expect(await orders.status()).toBe('Delivered');
      await expect(buyer.page.getByTestId('order-tracking')).toHaveText(
        `QA-DEMO-${run.runId.slice(0, 8)}`,
      );
      const stock = await shop.stock();
      summary.remainingStock = stock;
      expect
        .soft(
          stock,
          'CAS-015: initial 3 minus one delivered unit; cancelled unit must have been restored',
        )
        .toBe(2);
    });

    await test.step('returns show a 30-calendar-day window and documented policy; no hidden return API is invented', async () => {
      if (!run.deliveryOrder) throw new Error('No owned delivered order.');
      await orders.goto(run.deliveryOrder);
      const eligibility = buyer.page.getByTestId('order-return-eligible');
      await expect(eligibility).toBeVisible();
      const delivered = buyer.page.getByTestId('timeline-step').filter({ hasText: 'Delivered' });
      const deliveredDay = displayedDate((await delivered.textContent()) ?? '');
      const deadline = displayedDate((await eligibility.textContent()) ?? '');
      expect((deadline - deliveredDay) / 86_400_000).toBe(30);
      await expect(buyer.page.getByRole('link', { name: 'How returns work' })).toHaveAttribute(
        'href',
        '/help#returns',
      );
      summary.returns =
        'Eligibility/date/policy checked. No return-request/refund control is exposed in the inspected UI; no processing/refund claim.';
    });

    await test.step('seller fees exclude tax/shipping and cancelled orders stay out of KPIs', async () => {
      if (!run.deliveryOrder) throw new Error('No owned delivered order.');
      const row = await shop.orderRow(run.deliveryOrder);
      const fee = moneyToCents((await row.getByTestId('order-fee').textContent()) ?? '');
      const net = moneyToCents((await row.getByTestId('order-earn').textContent()) ?? '');
      expect.soft(fee, 'CAS-017: 10% fee on $5 merchandise only').toBe(50);
      expect.soft(net, 'CAS-017: seller receives $5 minus $0.50').toBe(450);
      const metrics = await shop.metrics();
      expect
        .soft(metrics.revenue, 'CAS-016: only the non-cancelled $5 order contributes revenue')
        .toBe(500);
      expect.soft(metrics.orders, 'CAS-016: only one non-cancelled order').toBe(1);
      expect.soft(metrics.units).toBe(1);
      expect.soft(metrics.net, 'CAS-017: net earnings exclude shipping/tax-based fees').toBe(450);
      summary.seller = { feeCents: fee, netCents: net, metrics };
    });

    await test.step('guest order access, cross-role seller edit protection and own-data export', async () => {
      if (!run.deliveryOrder) throw new Error('No owned delivered order.');
      const guestOrder = await guest.request.get(`/orders/${run.deliveryOrder}`, {
        maxRedirects: 0,
      });
      expect([302, 303, 307, 308]).toContain(guestOrder.status());
      expect(new URL(guestOrder.headers().location ?? '', approvedAccountOrigin).pathname).toBe(
        '/login',
      );
      const buyerSeller = await buyer.context.request.get('/seller/orders', { maxRedirects: 0 });
      expect([302, 303, 307, 308, 403, 404]).toContain(buyerSeller.status());
      // Explicit negative API probe against OUR other synthetic account's product only.
      // It bypasses the browser guard to exercise server authorization, never a payment endpoint.
      await shop.setStatus('draft');
      await shop.edit();
      const originalTitle = run.product.title;
      const probeTitle = `${originalTitle} Auth Probe`;
      const payload = {
        title: probeTitle,
        description: await seller.page.getByTestId('listing-description-input').inputValue(),
        categoryId: await seller.page.getByTestId('listing-category-select').inputValue(),
        price: await seller.page.getByTestId('listing-price-input').inputValue(),
        compareAtPrice: await seller.page.getByTestId('listing-compare-input').inputValue(),
        stock: await seller.page.getByTestId('listing-stock-input').inputValue(),
        status: 'draft',
        art: {
          hue: Number(await seller.page.getByTestId('listing-hue').inputValue()),
          icon: 'Book',
        },
      };
      const probe = await buyer.context.request.patch(
        `${approvedAccountOrigin}/api/seller/products/${run.product.id}`,
        { data: payload, maxRedirects: 0 },
      );
      summary.crossRoleEditStatus = probe.status();
      expect
        .soft([403, 404], "Buyer must not edit the other owned account's seller listing")
        .toContain(probe.status());
      if (probe.ok()) {
        await gotoAccountPage(seller.page, `/seller/listings/${run.product.id}/edit`);
        const currentTitle = await seller.page.getByTestId('listing-title-input').inputValue();
        summary.crossRoleMutationPersisted = currentTitle === probeTitle;
        if (currentTitle === probeTitle) {
          await seller.page.getByTestId('listing-title-input').fill(originalTitle);
          const restored = seller.page.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === `/api/seller/products/${run.product.id}` &&
              r.request().method() === 'PATCH',
          );
          await seller.page.getByTestId('listing-submit').click();
          expect((await restored).ok()).toBe(true);
        }
      }
      const exported = await (await buyer.context.request.get('/api/account/export')).json();
      expect(exported.profile?.email === fixture.buyer.email).toBe(true);
      expect
        .soft(Array.isArray(exported.orders), 'CAS-009: export must include existing own orders')
        .toBe(true);
      expect(JSON.stringify(exported).includes(fixture.seller.password)).toBe(false);
      await gotoAccountPage(buyer.page, '/orders');
      expect(await buyer.page.getByTestId('order-row').count()).toBe(2);
      expect(run.orderIds.length).toBe(2);
      expect(run.checkoutAttempts).toBe(4);
      summary.onlyTwoOwnedOrdersCreated = true;
      summary.checkoutAttempts = run.checkoutAttempts;
    });
    finished = true;
  } finally {
    let cleanupCompleted = false;
    try {
      await test.step('hide the synthetic listing, clear carts and attempt buyer erasure without deleting the seller ledger', async () => {
        await shop.setStatus('draft');
        await cart.clear();
        await new CartPage(seller.page).clear();
        if (finished) {
          await gotoAccountPage(buyer.page, '/account/privacy');
          await buyer.page.getByTestId('privacy-delete-open').click();
          await buyer.page.getByTestId('delete-password').fill(fixture.buyer.password);
          await buyer.page.getByTestId('delete-confirm').fill('DELETE');
          const deleted = buyer.page.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === '/api/account' && r.request().method() === 'DELETE',
          );
          await buyer.page.getByTestId('delete-submit').click();
          expect((await deleted).ok()).toBe(true);
          await buyer.context.clearCookies();
          const login = await buyer.context.request.post(
            `${approvedAccountOrigin}/api/auth/login`,
            {
              data: { email: fixture.buyer.email, password: fixture.buyer.password },
              maxRedirects: 0,
            },
          );
          buyerErased = login.status() === 401;
          if (buyerErased) await rm('.auth/demo-buyer.json');
          else {
            const ledger = JSON.parse(await readFile('.auth/demo-buyer.json', 'utf8'));
            ledger.cleanupStatus =
              'FAILED: demo buyer still authenticates after deletion; manual cleanup required.';
            await writeFile('.auth/demo-buyer.json', JSON.stringify(ledger, null, 2), {
              mode: 0o600,
            });
          }
          expect
            .soft(login.status(), 'CAS-007: demo buyer must no longer authenticate after erasure')
            .toBe(401);
        }
        run.cleanup.push(
          'Final cleanup: listing draft, both carts empty; demo order history retained.',
        );
        summary.buyerErasureVerified = buyerErased;
        expect
          .soft(seller.blocked, 'No unexpected seller transport escaped the allowlist')
          .toEqual([]);
        expect
          .soft(buyer.blocked, 'No unexpected buyer transport escaped the allowlist')
          .toEqual([]);
      });
      cleanupCompleted = true;
    } finally {
      if (!cleanupCompleted)
        run.cleanup.push('Cleanup failed; retained resources require manual review.');
      run.status =
        finished && cleanupCompleted
          ? testInfo.errors.length
            ? 'completed-with-findings'
            : 'completed'
          : 'interrupted';
      try {
        await saveDemoRun(run);
        await testInfo.attach('sanitized-demo-summary.json', {
          body: JSON.stringify(summary, null, 2),
          contentType: 'application/json',
        });
      } finally {
        await Promise.allSettled([guest.close(), seller.context.close(), buyer.context.close()]);
      }
    }
  }
});
