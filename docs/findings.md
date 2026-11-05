# Findings · MarketNest QA

## Execution evidence

- Environment: `https://qa-marketplace-app-b9mpo.ondigitalocean.app`.
- Full run: **2026-11-05 00:30 UTC**, macOS arm64, Playwright 1.64.1, two workers, no local retries.
- Command: `bun run test`. Duration: 290.8 s. **64 executions: 43 passed and 21 failed**.
- Of the 21 failures, **19 correspond to six product discrepancies** grouped below; they are not 19 distinct bugs.
- Two other unconfirmed results: HTTP timeout on `/register` and Android mobile-filter navigation. Isolated reruns: `/register` passed (1/1) and Android filter passed (3/3). They are not reported as confirmed defects; investigate stability if they recur. The original full run is not rewritten as green.
- Marketing, cookie rejection, discounts, variants and sorting were reproduced in Chromium, Firefox and WebKit. `/terms` failed at HTTP level and was also observed as a 404 page during browser exploration.
- `bun run lint` and `bun run typecheck`: passed.

Local evidence: `playwright-report/index.html`, `test-results/results.json` and each failed test's folder (screenshot, video, trace for UI). Not versioned for privacy. The catalog is shared and may change; retain the execution date and evidence rather than assuming immutable data.

Priorities are proposals. No root cause is confirmed: only the deployed application was observed. The seventeen findings were published as [issues #1–#17](https://github.com/Greynner/CASAutomotive-smoke-tests/issues); each issue number matches the CAS suffix. No artifacts or credentials were published.

### Authenticated expansion

- Original authorization at this stage: create synthetic accounts; **do not submit payments or orders**. A later, separate authorization enabled only the bounded demo extension below; the legacy account tests retain their no-order guard.
- A single `@example.com` account was created, with marketing disabled, and reused to avoid accumulating accounts while deletion fails.
- `bun run test:account` execution: **2026-11-05 01:04 UTC**, Chromium, one worker, 118.3 s. One journey with soft assertions reproduced four additional discrepancies (CAS-007–CAS-010). They are not interpreted as a single bug merely because they share a test.
- Final journey validation: **2026-11-05 01:13 UTC**, 143.6 s; reproduced the same four discrepancies, completed cart/address cleanup and again demonstrated successful login after deletion. It also verified HTTP 401 rejection for an incorrect password.
- An intermediate run timed out waiting for `load` on reload after address removal. That wait was changed to `domcontentloaded` plus an explicit zero-address check; the final run reached and completed the deletion step.
- Final public-suite revalidation on HTTP + Chromium: **26 executions, 19 passed and 7 failed**, all failures linked to CAS-001–CAS-006. The full three-engine matrix was not repeated after this expansion; the initial full run is retained as a reference.
- Login, logout, quantity 1→2→1, `welcome10` application, checkout navigation and test cart/address removal worked. Registration was checked during initial exploration; subsequent runs reuse that account.
- Shipping at $100 was free; the confirmed threshold failure occurs at **exactly $50**.
- The synthetic address was saved before export and removed afterward. Cart contents were also removed. The synthetic profile still exists because of CAS-007: it requires manual cleanup by the marketplace team.
- Recovery credentials: only `.auth/owned-account.json`, ignored by Git and with restricted permissions. No authenticated traces, videos or screenshots. Separate report in `playwright-report-account/` and `test-results-account/results.json`.
- Additional rerun of the two transient scenarios: 3 executions of `/register` and 3 of the Android filter, with two workers: **6/6 passed**. The intermittent cause remains unconfirmed; expectations were not changed to hide it.

### Closure validation

- Public matrix expanded with CAS-011: **2026-11-05 01:25 UTC**, 227.0 s, **67 executions: 43 passed and 24 failed**. No skipped tests or local retries.
- **22 failures** correspond to the seven public defects CAS-001–CAS-006 and CAS-011 (engines/sorting directions produce multiple executions per defect).
- Two additional failures were intermittent: home navigation timeout in the Chromium CTA test and missing navigation after the iPhone mobile filter. Both passed **3/3** on rerun with two workers; no root cause is claimed, and this instability is not hidden with permissive assertions. These are outstanding stability risks, separate from the eleven confirmed defects.
- CAS-011 was reproduced automatically in Chromium, Firefox and WebKit. The authenticated journey remains opt-in and retains its final validation from 01:13 UTC; no accounts were recreated or mutations submitted during this closure.
- The local public report was replaced by this latest run; initial results remain here as a historical record.

### Final technical expansion

- Expanded public matrix: **2026-11-05 01:52 UTC**, 412.6 s, **132 executions: 90 passed and 42 failed**. Of the failures, 40 correspond to nine public discrepancies; two were intermittent navigation failures (Firefox guest cart and WebKit CTA).
- Rerun of those two scenarios across three engines, twice each: **12/12 passed**. The original intermittent result is retained, without claiming that stability is resolved.
- Authenticated projects: **2026-11-05 02:09 UTC**, 285.0 s, two journeys completed and failed due to five known discrepancies: CAS-007–CAS-010 and CAS-013. Profile corrections reflected in the export, marketing preference on→off, coupons and cleanup were verified. No additional accounts or orders were created.
- During expansion, actions before hydration and unsuitable `load` waits were identified in authenticated tests. An observable client-mount marker was added (banner in contexts that do not choose consent). The final run completed both journeys without those timeouts. The deletion oracle is credential rejection from a clean session, not a visual redirect.
- **Technical privacy smoke test, not GDPR validation or legal advice:** 9 scenarios (no choice/reject/accept × 3 engines), with no recognizable trackers on the sampled routes. See [privacy-smoke.md](privacy-smoke.md) for observations and limits.
- Axe on five pages × three engines reproduced only `color-contrast` among the selected rules (15 failed executions grouped under CAS-014). This is not a full WCAG audit.
- Negative registration: 15 passing executions with the backend blocked for safety. Checks empty fields/agreement/confirmation; does not demonstrate server-side password-strength or email validation. Exploratory non-empty weak or malformed inputs were sent to the backend; blocking submission prevents concluding whether the server rejects them. No confirmed bug was reported.

### Later authorized demo extension

- The user subsequently authorized synthetic demo orders, cancellation and seller flows. Checkout explicitly states **“No real payments are taken”** and publishes approved/declined/insufficient-funds test cards. The frontend submits to same-origin `/api/checkout`; no external payment SDK was found in inspected bundles. Backend/gateway isolation is not independently proven.
- One additional synthetic buyer account was created. The existing owned account became the seller; one labeled synthetic shop and $5 listing were prepared. No other users' resources were touched.
- Bounded budget: **four checkout submissions**, exactly **two HTTP 402 declines** and **two HTTP 201 approvals**. Stock stayed 3 after both declines. Exactly two owned orders appeared; one was cancelled and one shipped/delivered with fake tracking. Successful/declined checkout outcomes were never resubmitted.
- The first approval's redirect exceeded an exploration assertion timeout. Its ID and unique product were verified against the same buyer's order list/detail before continuing; no duplicate was created. Later probe/selector interruptions were resolved without resetting the checkout budget.
- Final opt-in Playwright validation: **2026-11-05 03:55 UTC**, **101.4 s**, one bounded journey completed with findings. It reused persisted checkout checkpoints, rather than submitting four more requests. Failures map to CAS-015–CAS-017 and existing CAS-007/CAS-009; no transport/selector failure remained in this final validation.
- Guest order access redirected to login. The buyer's update attempt against the other owned account's seller product was rejected with **403**. This is one concrete cross-role check, not an exhaustive IDOR audit.
- Return eligibility was **30 calendar days** after the displayed delivery date. The policy link was valid, but no return-request/refund-processing control was exposed; actual return processing was not claimed and no undocumented endpoint was invoked.
- Cleanup: one Cancelled and one Delivered demo order retained, both carts empty, listing Draft, marketing disabled. Buyer deletion still allowed login (CAS-007). Both profiles, the shop/draft and order history require environment-owner cleanup; IDs and credentials remain in ignored ledgers. See [demo-tests.md](demo-tests.md).

## Prioritized summary

| ID      | Priority  | Discrepancy                                              | Impact                                               |
| ------- | --------- | -------------------------------------------------------- | ---------------------------------------------------- |
| CAS-001 | P1 high   | Marketing enabled by default                             | Consent risk and policy contradiction                |
| CAS-002 | P1 high   | Variant surcharge not reflected in price                 | Potentially misleading displayed price               |
| CAS-003 | P2 medium | Inflated discount percentages                            | Incorrect commercial information                     |
| CAS-004 | P2 medium | Cookie rejection does not persist                        | Rejection choice not remembered                      |
| CAS-005 | P2 medium | Terms of service return 404                              | Terms unavailable before registration                |
| CAS-006 | P2 medium | Sorting uses an order inconsistent with displayed prices | Makes product comparison and selection harder        |
| CAS-007 | P1 high   | Account deletion does not prevent logging in again       | Retention and access risk after deletion             |
| CAS-008 | P2 medium | Shipping charged at exactly $50                          | Estimated total exceeds the published amount         |
| CAS-009 | P1 high   | Export omits a saved address                             | Incomplete access/portability data                   |
| CAS-010 | P1 high   | Tax calculated before discount                           | Incorrect estimated total in cart and checkout       |
| CAS-011 | P2 medium | Star thresholds lack distinguishable accessible names    | Makes screen-reader use harder                       |
| CAS-012 | P2 medium | Maximum price excludes the exact boundary                | Omits products within budget                         |
| CAS-013 | P1 high   | SAVE20 persists below its minimum                        | Active coupon without meeting eligibility            |
| CAS-014 | P2 medium | Insufficient contrast in shared controls                 | Makes reading harder for users with low vision       |
| CAS-015 | P1 high   | Cancellation does not restore stock                      | Inventory remains consumed after cancellation        |
| CAS-016 | P2 medium | Cancelled orders inflate seller KPIs                     | Revenue/order/unit metrics include cancelled sales   |
| CAS-017 | P1 high   | Seller fee includes shipping/tax                         | Earnings are lower than the published item-only rule |

## CAS-001 · Preselected marketing

1. Open `/register` in a new context.
2. Observe “Email me offers and product news”, without interacting.

**Expected:** unchecked checkbox; `/help#privacy` states that marketing is opt-in and only sent if the user checks the box.

**Actual:** `register-marketing` is checked by default. `register-accept-terms` is unchecked.

**Impact:** a user may continue with marketing enabled without making an affirmative choice. No account was created and actual email delivery was not verified. Privacy-team review is required.

**Automated reproduction:**

```bash
bunx playwright test --project=frontend-chromium --grep 'marketing is opt-in'
```

Test: `tests/ui/privacy.spec.ts`. Evidence: assertion `Expected: not checked / Received: checked` and failure screenshot.

## CAS-002 · Price does not update when selecting a variant with a surcharge

1. Open `/products/p105` (Mechanical Keyboard K87).
2. Select “Brown switches”: observed price $109.00.
3. Select “Blue switches +$10.00”.

**Expected:** selected option and price $119.00; `/help#shopping` states that the price updates when an option costs more.

**Actual:** the Blue switches radio is selected, but `product-price` remains at $109.00.

**Impact:** the option's cost is not displayed correctly. The price charged in cart/checkout was not verified; do not claim incorrect charging without that test.

```bash
bunx playwright test --project=frontend-chromium --grep 'keyboard option'
```

Test: `tests/ui/product.spec.ts`. Evidence: expected price 11900 cents, received 10900, with selection checked.

## CAS-003 · Discount percentages exceed actual savings

1. Open `/products?onSale=1`.
2. Compare current price, crossed-out original price and discount badge.
3. Example: Aurora Wireless Earbuds, `/products/p101`: $79.99 versus $99.99, 25% badge.

**Expected:** `round((original − current) / original × 100)`, approximately **20%** in that example; matches the published rule in `/help#shopping`.

**Actual:** **25%** badge. Other examples from the run: `/products/p115`, $95.00 versus $140.00, shows 47% instead of 32%; `/products/p112`, $89.00 versus $119.00, shows 34% instead of 25%.

**Impact:** overstates savings. A single issue groups affected products, rather than one issue per badge.

```bash
bunx playwright test --project=frontend-chromium --grep 'sale badges'
```

Test: `tests/ui/catalog.spec.ts`; soft assertions retain discrepancies for visible products.

## CAS-004 · Rejecting cookies does not remember the choice

1. Open `/` in a clean context.
2. Click “Reject non-essential”; the banner disappears.
3. Reload.

**Expected:** choice remembered for 12 months, as stated in `/help#cookies`; no repeated prompt on reload.

**Actual:** the banner reappears. Storage inspection after rejection found no persisted choice. As a control, “Accept all” creates `mp_consent=accepted`, lasting approximately one year, and passes the persistence test.

**Impact:** the promised persistence of the negative choice is not respected. This alone **does not demonstrate** that analytics cookies are activated after rejection; that analysis is pending.

```bash
bunx playwright test --project=frontend-chromium --grep 'cookie reject'
```

Test: `tests/ui/privacy.spec.ts`. Evidence: visible banner after reload.

## CAS-005 · Broken Terms of Service link

1. Open the site and follow “Terms of Service” in the footer; it is also linked from registration.
2. The target route is `/terms`.

**Expected:** terms document accessible with HTTP 200, particularly before accepting registration terms.

**Actual:** HTTP **404** and “This page could not be found”.

**Impact:** linked terms cannot be consulted. This issue alone does not imply a legal conclusion.

```bash
bunx playwright test --project=integration --grep '@legal'
```

Test: `tests/integration/routes.spec.ts`. Evidence: `Expected: 200 / Received: 404`.

## CAS-006 · Price order inconsistent with visible amounts

1. Open `/products`.
2. Change “Sort by” to “Price: high to low”.
3. Read the first products' prices.

**Expected:** a non-increasing sequence of prices shown to the buyer.

**Actual:** observed `$239.00, $149.99, $199.00, $95.00, $129.00, …`; $199.00 appears after $149.99. “Price: low to high” also fails. All three engines reproduced both directions.

**Impact:** buyers do not get the requested comparison order. Whether internal sorting uses the original price or another field was not confirmed.

```bash
bunx playwright test --project=frontend-chromium --grep 'price sort'
```

Test: `tests/ui/catalog.spec.ts`. Evidence: received arrays of cents versus expected numeric order.

## CAS-007 · Deletion confirmed but the account still authenticates · P1 high

1. Log in with an owned synthetic account.
2. Go to `/account/privacy`, open “Delete my account”, enter its password and `DELETE`.
3. Submit deletion and observe HTTP 200 and redirection to home.
4. Clear cookies and log in again with the same credentials.

**Expected:** access rejected (HTTP 401); `/help#privacy` promises that login is no longer possible after deletion and personal data is removed.

**Actual:** `/api/auth/login` returns HTTP **200** and `/account` can be opened; the previous email remains present. Reproduced during exploration and the automated journey. A successful deletion response does not prove deletion occurred.

**Impact:** the deletion promise is not met; high risk of data retention and access. Privacy review required. No other people's accounts were touched.

**Reproduction:** `bun run test:account`, final step “request erasure and verify login denial”. Do not use real people's credentials.

**Cleanup:** synthetic address and cart contents removed; the account cannot be considered deleted. The environment owner must remove it manually. The private ledger identifies it without publishing its email.

## CAS-008 · Standard shipping charged with subtotal exactly $50 · P2 medium

1. With the synthetic account and an empty cart, add one Pour-Over Coffee Set (`/products/p108`, $50.00).
2. Review the cart summary without a coupon.
3. As a control, increase to two units ($100), then return to one.

**Expected:** free standard shipping from $50.00 of merchandise after discounts, according to `/help#shipping`. For one unit: $50 + $4 tax = **$54.00**.

**Actual:** at **$50.00**, **$5.99** shipping is charged and the total is **$59.99**. Free shipping was observed at $100. Without claiming a root cause, the behavior is consistent with a boundary error.

**Impact:** estimated overcharge contrary to the published threshold. No purchase was made or actual charge verified.

**Reproduction:** `bun run test:account`, step “free-shipping threshold at $50”.

## CAS-009 · Export omits a saved address · P1 high

1. Save an entirely synthetic address in `/account/addresses` and confirm it appears after reload.
2. Go to `/account/privacy` and click “Download my data”.
3. Review the JSON without publishing it.

**Expected:** complete personal data, including saved addresses, orders and reviews, as promised by `/help#privacy`.

**Actual:** JSON with keys `exportedAt`, `profile`, `marketingConsent`, `reviews`, `shop`; it contains neither `addresses`, `orders` nor the saved synthetic address. Absence of the existing address demonstrates omitted data; no orders were created, so export of existing orders was not checked.

**Later demo evidence:** after two owned synthetic orders were created, the buyer's export still omitted an `orders` array. Existing-order export is now concretely covered; the original address-omission reproduction remains valid.

**Impact:** the published access/portability feature delivers incomplete data. Privacy review required. The JSON was not attached to GitHub.

**Reproduction:** `bun run test:account`, step “export includes a saved synthetic address”. The test deletes the download and removes the address afterward.

## CAS-010 · Tax calculated before discount · P1 high

1. Add one unit of `/products/p108` ($50.00) to the synthetic cart.
2. Apply `welcome10`; it is recognized as WELCOME10 and deducts $5.00.
3. Review tax and total in the cart and open checkout without submitting the form.

**Expected:** `/help#payments` specifies 8% on merchandise after discounts. $45 × 8% = **$3.60**; with standard shipping of $5.99, total **$54.59**. The Help Center publishes this same example.

**Actual:** cart and checkout show tax of **$4.00**; the cart total is **$54.99**. Difference of $0.40. The coupon does apply, and $5.99 shipping is correct with a discounted subtotal of $45.

**Impact:** displayed total exceeds the amount defined by the published tax rule. Actual charging was not verified; this earlier reproduction stopped before order submission. The later demo used undiscounted synthetic orders and does not establish real settlement behavior.

**Reproduction:** `bun run test:account`, steps “tax on discounted merchandise” and “checkout preview”.

## CAS-011 · Rating filters do not announce the star threshold · P2 medium

1. Open `/products`; on mobile, expand Filters.
2. Inspect the rating radios' accessible names.

**Expected:** distinguishable names expressing the threshold, for example `4 stars & up`, `3 stars & up`, etc.

**Actual:** all four radios are announced as `& up`; star SVGs have `aria-hidden="true"`, so they do not convey the value 4, 3, 2 or 1.

**Impact:** a screen-reader user cannot select the threshold by the control's name. Confirmed through desktop/mobile accessibility-tree inspection and a test across three engines; not a full WCAG audit.

**Reproduction:** `bunx playwright test --project=frontend-chromium --grep '@accessibility'`. Test: `tests/ui/accessibility.spec.ts`. Sample details and limits: [manual-checks.md](manual-checks.md).

## CAS-012 · Maximum price excludes the exact selected value · P2 medium

1. Open `/products?min=50&max=51`: Pour-Over Coffee Set (`p108`, $50.00) is present.
2. Open `/products?min=50&max=50` or `/products?min=49&max=50`.

**Expected:** a maximum of $50 includes the $50 product. This expectation interprets “Maximum price” as an inclusive boundary; confirm this interpretation with product if the internal requirement differs.

**Actual:** the $50 product disappears; the 50–50 interval returns no results. Reproduced twice during exploration and across three engines in the suite.

**Impact:** the filter omits products within the specified budget.

**Reproduction:** `bunx playwright test --project=frontend-chromium --grep 'maximum price'`. Test: `tests/ui/catalog-boundaries.spec.ts`.

## CAS-013 · SAVE20 not removed below the $100 minimum · P1 high

1. With the synthetic account and an empty cart, add two units of `/products/p108`: subtotal $100.
2. Apply `save20`; SAVE20 applies correctly.
3. Reduce quantity to one unit: subtotal $50. Reload to observe persisted state.

**Expected:** remove the coupon when the minimum is no longer met. `/help#coupons` explicitly states that it is removed if the subtotal falls below the minimum.

**Actual:** the active-coupon control `coupon-remove` continues showing SAVE20 after reducing the subtotal to $50 and reloading.

**Impact:** the cart retains an ineligible discount. Checkout was not submitted, and no actual charge or discount on an order was confirmed.

**Reproduction:** `bun run test:account --grep extended`. Test: `tests/account/extended.spec.ts`. Reproduced during initial automated exploration and the final run; the test subsequently removes the coupon and cleans the cart.

## CAS-014 · Insufficient contrast in shared controls and text · P2 medium

1. Open home and observe “Start shopping” and “Accept all”.
2. Run axe with WCAG 2 A/AA and 2.1 A/AA rules.

**Expected:** minimum contrast of 4.5:1 for normal text in these controls.

**Actual:** axe 4.14 reports white text `#ffffff` on green `#009966`, ratio **3.65:1**, versus the required 4.5:1. Examples: `hero-shop-cta` (16px) and `cookie-accept` (14px). It also detects low-contrast elements in catalog, login, registration and help.

**Impact:** makes actions and information harder to read for users with low vision. The shared pattern is grouped into one issue, not one per node or browser.

**Reproduction:** `bunx playwright test --project=frontend-chromium --grep 'automated accessibility'`. Test: `tests/ui/axe-smoke.spec.ts`. Fifteen executions (five pages × three engines) detected `color-contrast`; incomplete results require human review. This does not constitute WCAG certification.

## CAS-015 · Processing cancellation does not restore stock · P1 high

1. Prepare an owned synthetic listing with stock 3 and price $5.
2. Buy one unit using the published approved demo card: stock becomes 2.
3. Cancel the owned Processing order and confirm persisted status Cancelled.
4. Reopen the seller listing editor and read stock.

**Expected:** stock returns to 3; `/help#orders` promises cancelled items go back into stock.

**Actual:** stock remains **2**. After another approved order was delivered, stock was **1**, rather than the expected **2** for one cancelled and one delivered unit.

**Impact:** cancellation incorrectly consumes inventory. No real goods or bank charges were involved.

**Evidence:** controlled execution observed 3 → 2 → cancel → 2; final `tests/demo/marketplace-demo.spec.ts` independently read inconsistent remaining stock from the owned seller editor.

## CAS-016 · Cancelled orders remain in seller revenue/order/unit KPIs · P2 medium

1. Start with a fresh owned shop and no previous sales.
2. Place and cancel a $5 demo order, then inspect dashboard KPIs.
3. Compare again after another $5 order is delivered.

**Expected:** `/help#selling` excludes cancelled orders. After cancellation only: **$0 revenue / 0 orders / 0 units**. After one cancelled and one delivered order: **$5 / 1 / 1**.

**Actual:** after cancellation only: **$5 / 1 / 1**. After the second delivery: **$10 / 2 / 2**. The cancelled row's own fee/earnings are zero, but gross KPIs still count it.

**Impact:** seller metrics overstate non-cancelled business. Average order value is not claimed incorrect because both test items had the same price.

**Evidence:** dashboard observations and final assertions in `tests/demo/marketplace-demo.spec.ts`; all resources belong to the two authorized synthetic roles.

## CAS-017 · Marketplace fee includes shipping and tax · P1 high

1. Place an approved demo order for one owned $5 item.
2. Standard shipping is $5.99, tax $0.40, total $11.39.
3. Inspect the seller order fee/earnings and dashboard net.

**Expected:** `/help#selling` charges **10% of item sales only**, excluding shipping/tax: fee **$0.50**, seller net **$4.50**.

**Actual:** fee **$1.14**, earnings **$3.86**. This equals rounded 10% of the $11.39 grand total—an observed relationship, not a confirmed backend root cause. Dashboard net also shows $3.86.

**Impact:** seller earnings are understated relative to the published contract. This is a demo calculation, not proof of a real bank transfer or settlement.

**Evidence:** seller order row and final `tests/demo/marketplace-demo.spec.ts` assertions. The cancelled order correctly shows $0 fee/$0 earnings; this defect is demonstrated on the Delivered order.

**Safe replay for CAS-015–CAS-017:** `AUTHORIZE_DEMO_CHECKOUT=1 bun run test:demo` requires explicitly prepared owned fixtures. The completed ledger intentionally refuses reruns; do not reset counters or create replacement orders blindly. See [demo-tests.md](demo-tests.md).

## Recommendation

Prioritize stock restoration, item-only seller fees, account deletion, complete export, marketing consent, tax calculation and variant-price consistency; then the shipping boundary, discounts, rejection persistence, terms and sorting. Rerun linked tests after each fix and complete the authenticated flows in [test-plan.md](test-plan.md) before recommending a release. Keep this set manageable so its impact, evidence and limits can be explained during the interview.
