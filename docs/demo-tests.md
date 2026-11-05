# Authorized demo orders and seller workflow

## Authorization and payment evidence

After the original no-order assessment, the user explicitly authorized synthetic demo payments/orders, cancellation and seller testing. This is a **separate local-only mode**; legacy account tests and automatic CI still prohibit order submission.

Checkout explicitly displays:

> Demo store: test cards. **No real payments are taken.** Use any future expiry date and any 3-digit CVC.

The public instructions list approved `4242 4242 4242 4242`, declined `4000 0000 0000 0002`, and insufficient-funds `4000 0000 0000 9995`. Only these allowlisted demo cards were used, with a future expiry and synthetic cardholder/address. The frontend sends to same-origin `/api/checkout`; no external payment SDK was found in inspected checkout bundles, and the demo browser guard rejects external destinations.

This is evidence of the application's **declared demo behavior**, not independent verification of server-side gateway configuration or real financial settlement. No real card, goods, carrier shipment or bank refund was used or claimed.

## Controlled resources and actual results

- Two distinct owned synthetic accounts: the existing account as seller, one additional dedicated buyer.
- One shop clearly labeled as synthetic QA and one $5 listing, initially Draft with stock 3. No other people's resources were modified.
- Exactly **four checkout submissions**: two HTTP 402 rejections and two HTTP 201 approvals. Both declines preserved stock at 3; exactly two orders were created.
- First order: Processing → Cancelled through its buyer UI. Stock stayed 2 instead of returning to 3 (**CAS-015**).
- Second order: Processing → Shipped → Delivered using a fabricated `QA-DEMO-…` tracking reference. Final stock was 1 instead of 2.
- Each approved order displayed $5 merchandise + $5.99 shipping + $0.40 tax = $11.39. This was a demo total, not a real charge.
- Seller fee was $1.14/net $3.86 instead of $0.50/$4.50 (**CAS-017**).
- Dashboard revenue/orders/units counted the cancelled sale: $10/2/2 instead of $5/1/1 (**CAS-016**).
- Guest order access redirected to login. The buyer's valid update attempt against the other owned account's listing was rejected with HTTP 403. This is one server-authorization case, not a full IDOR audit.
- Buyer export omitted existing orders (**CAS-009**). Deletion returned success, but fresh-cookie login still succeeded (**CAS-007**).

The final opt-in Playwright validation ran **2026-11-05 03:55 UTC**, lasted **101.4 s**, and completed one journey with failures linked to those five issues. It reused persisted checkout checkpoints from the bounded execution; it did not submit another four requests.

The initial approval's UI redirect exceeded an exploration assertion timeout. Its order was reconciled from the same buyer's list/detail and unique listing before continuing, without retrying checkout. Transport/readiness/fixture-selector probe failures were separated from product defects. No transport/selector failure remained in the final recorded journey.

## Return coverage: explicit limit

The Delivered order exposed a return deadline exactly **30 calendar days** after its displayed delivery date and a working `/help#returns` policy link. No return-request, return-processing or refund control was exposed in the inspected UI. **No actual return processing, refund settlement or undocumented return API is claimed.**

Shipped and Delivered states were observed. A full negative server transition matrix, out-of-window returns, delayed-delivery date boundaries and real payment-provider integration remain outside this execution. The absence of an online return control was not filed as a confirmed bug without a requirement specifying that mechanism.

## Files and execution

| File                                                | Responsibility                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `playwright.demo.config.ts`                         | Local-only project, one worker, no retries, no traces/video/screenshots |
| `src/e2e-tests/tests/demo/marketplace-demo.spec.ts` | Bounded workflow, assertions, cross-role probe and cleanup              |
| `src/e2e-tests/pages/demo-*.page.ts`                | Checkout, owned order and seller interactions                           |
| `src/e2e-tests/support/demo-session.ts`             | Fixture validation, checkpoint journal, roles and transport enforcement |
| `src/e2e-tests/support/demo-policy.ts`              | Pure card/payload, scope, quantity and operation-budget rules           |
| `src/e2e-tests/support/demo-lock.ts`                | Exclusive OS-level run lock                                             |
| `tests/unit/demo-*.test.ts`                         | Offline policy and real filesystem/cross-process lock checks            |

```bash
# ONLY after explicit permission and preparing the owned synthetic fixture below:
AUTHORIZE_DEMO_CHECKOUT=1 bun run test:demo
bun run report:demo
```

**The current completed fixture refuses reruns.** Do not delete its journal or reset counters to make the command execute again. A future fresh scenario requires environment-owner permission, controlled new/reset fixtures and a cleanup plan—not automatic replacement accounts/orders.

For an interrupted run, review the journal and reconcile every unknown checkout result before using:

```bash
AUTHORIZE_DEMO_CHECKOUT=1 RESUME_DEMO_RUN=1 bun run test:demo
```

`RESUME_DEMO_RUN` does not override completed status, pending-checkout reconciliation or the attempt/order caps.

## Explicit fixture preparation — no automatic account proliferation

The runner consumes prepared private resources; it does not silently create replacement accounts, shops or products. Setup for this assessment was performed through the UI under bounded guards, then reused by the runner.

1. Obtain approval to create QA data and confirm the demo disclosure/test cards. Do not use production or real customer credentials.
2. Use an owned synthetic seller account matching the existing account-ledger contract. Create a uniquely named synthetic shop and a Draft listing titled `CAS QA Demo Item <run marker>`, price $5, stock 3, no variants. Description must state that it is synthetic and not real goods.
3. Create one distinct synthetic buyer with marketing disabled. Store its random credentials only in `.auth/demo-buyer.json`; the seller remains in `.auth/owned-account.json`. Both use the validated `cas-qa-<UUID>@example.com` ownership format.
4. Record only the owned IDs and checkpoints in `.auth/demo-run.json`. A fresh authorized ledger has `status: "setup"`, `checkoutAttempts: 0`, `orderIds: []`, a new `runId`, `createdAt`, `shopName`, `shop: {id, slug}`, `product: {id, title}` and `cleanup: []`.
5. Keep `.auth/` private (0700) and ledgers 0600. Never commit/share these files or substitute IDs belonging to another user.

This setup creates persistent QA data. The known erasure bug means that environment-owner cleanup must be arranged before creating more fixtures.

## Safeguards and interruption handling

- Both config and fixture loading reject CI and require explicit local authorization. Workflow flags keep demo mode off.
- Exact QA origin, no embedded URL credentials, no external destinations. Owned profile identities are verified after same-origin, no-redirect API authentication; login UI is tested separately.
- Only documented test cards and exact synthetic address/cardholder fields; no saved real addresses. Cart additions require the actual `qty` contract, one unit, the owned product and no variant.
- Cart writes are restricted to adding an item or deleting a cart row; no arbitrary quantity changes, coupon endpoints or nested checkout routes.
- Checkout arming requires the live disclosure, one matching UI line and an authenticated cart snapshot identifying the same product/quantity. Unknown shapes fail closed.
- Maximum four submissions and two recorded orders. A pending outcome is written **before** forwarding checkout; ambiguous outcomes require reconciliation. No automatic retries.
- An exclusive `.auth/demo-run.lock` prevents two processes from using independent budgets. Lock behavior is tested with a separate OS process. A stale lock is never auto-expired: confirm the process is gone and reconcile the journal before manual removal.
- Atomic journal replacement avoids truncated checkpoints. Fixture teardown releases the lock even on initialization/test failure; terminal bookkeeping and context closure are attempted even if cleanup fails.
- The cross-role API probe deliberately bypasses browser interception to test server authorization, but its URL is fixed to the owned other-role listing, uses synthetic data and disables redirects. No payment endpoint is used by that probe. Unexpected mutation has a title-restoration path.
- Reports go to ignored `test-results-demo/` and `playwright-report-demo/`; authenticated evidence is not automatically uploaded. Only a sanitized summary omitting identities/resource IDs is attached locally.

After the recorded live run, additional lock/cart/cleanup hardening was validated offline. The completed ledger was **not** reset to place more orders just to replay those changes. Unit tests verify the stricter controls; no claim of a second fresh live checkout run is made.

## Final cleanup and residual data

Verified final state: both carts empty; listing Draft/hidden; seller profile restored and both marketing preferences off. One Cancelled and one Delivered demo order remain as history. Buyer erasure still fails; neither account can be treated as deleted.

**The environment owner must remove the two synthetic profiles, shop/draft listing and retained demo order data through an approved cleanup process.** Private ledgers identify those resources. Do not delete the ledgers first: they are recovery/cleanup evidence, not proof that the backend data was erased.

Privacy remains a **technical smoke test**, not comprehensive GDPR validation or legal advice.
