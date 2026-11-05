# Risk-based test plan

## Objective and test oracle

Detect observable discrepancies before production, with a small set of prioritized, reproducible findings. The Help Center (`/help`) is the public business specification: all-word search, per-option pricing, discounts on original prices, opt-in marketing and consent remembered for 12 months. UI links and displayed surcharges complete these contracts.

There is no access to the marketplace source code or internal requirements. Do not attribute root causes without team confirmation.

## Automation development and CI layers

In addition to the live checks below, `tests/unit/` contains 140 Bun tests for automation utilities and `tests/integration/` contains 10 local HTTP/browser adapter tests. They run independently of the deployed site. CI separates quality, unit coverage, local integration, live API and browser-regression signals. See [testing-strategy.md](testing-strategy.md) for SDLC traceability and explicit limits: these are not unit tests of the unavailable marketplace source.

## Implemented coverage

| Risk                              | Tests                                                                                            | Scope                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Access and navigation             | HTTP routes, nonexistent-product 404, terms, CTA, product details                                | Guest                                          |
| Finding products                  | Positive and no-result search, ascending/descending sorting, price range, pagination             | First page / transition to second              |
| Misleading commercial information | Discount calculations in cents, +$10 variant change                                              | Public seed products                           |
| Availability and purchase         | Disabled out-of-stock product, minimum quantity, guest cart                                      | No purchase submission                         |
| Privacy                           | Marketing not preselected, terms not preselected, accept/reject and persistence, policy sections | No account registration                        |
| Mobile                            | Horizontal overflow on home, CTA and sale filters                                                | Emulated iPhone 13/WebKit and Pixel 5/Chromium |
| Compatibility                     | Shared UI tests                                                                                  | Chromium, Firefox and WebKit                   |

The public matrix contains 17 HTTP/access checks + 37 UI × 3 engines + 2 mobile tests × 2 profiles = 132 executions. There are also two opt-in authenticated journeys, excluded from CI and the default matrix; see [account-tests.md](account-tests.md). Axe on five pages, negative client-side registration, search/category/stock/price-boundary checks and network/storage observation were added.

## Result triage

1. Reproduce in a clean context using the finding's command.
2. Separate product failure, test failure, seed-data changes and infrastructure errors.
3. Check expectations against `/help` or the visible contract; do not invent requirements.
4. Attach only sanitized evidence. Group variants of the same discrepancy (for example, ascending/descending) into one finding.
5. Prioritize impact and risk; do not turn each affected browser or product into a separate issue.
6. After a marketplace fix, run the linked test and then the full matrix. Do not change expectations to accept the defect.

## Pending before a full cycle / go-live

- Environment-owner cleanup of the two synthetic profiles, demo shop/draft and retained orders because of CAS-007. One later additional buyer was explicitly authorized for the bounded demo; do not create further profiles or reset completed journals to bypass cleanup.
- Recovery without enumeration and complete password validation. Login/logout and incorrect-password rejection are covered in the journey; registration was exercised during exploratory creation.
- Authenticated cart: expand to variants, concurrent stock limits and more coupon boundaries. Quantity 1→2→1, subtotal, WELCOME10, SAVE20/TAKE5, invalid code, tax and shipping are covered. SAVE20 was confirmed not to be removed when eligibility is lost (CAS-013).
- Checkout demo extension is now executed under later authorization: two published-card 402 declines and two 201 approvals, exactly two owned orders, no real payment claim. Legacy tests still prohibit orders; the separate demo is local-only with a four-submission/two-order cap. Backend/provider idempotency is not proven.
- Processing cancellation, synthetic shipment/delivery, 30-day return eligibility, guest order protection and one buyer-to-other-seller update rejection (403) are covered. Return/refund processing was not exposed in the inspected UI; the full invalid-transition and cross-user permission matrix remain pending.
- Seller shop/listing creation, Draft privacy, editing/publication and fulfilment were exercised. Stock restoration, cancelled-sale KPIs and item-only fees fail (CAS-015–CAS-017).
- Authenticated technical privacy smoke test: profile rectification and marketing preference/withdrawal persisted and reflected in the export, followed by restoration. Export with a saved address and login revocation after deletion fail (CAS-009 and CAS-007). One cross-role update was rejected and existing-order export omission was confirmed in the later demo. Full isolation, anonymization and backend/logs/backups remain pending. Comprehensive GDPR compliance is not validated, and no legal advice is provided; see [privacy-smoke.md](privacy-smoke.md).
- Expand cookie/traffic observation to more journeys, delayed events and custom tracking. A smoke test was already performed before consent, after rejection and after acceptance across three routes and engines, with no recognizable trackers in the sample. Banner disappearance or absence of known patterns does not prove absence of tracking.
- Expand accessibility with an actual screen reader, human review, zoom/reflow and physical devices. Keyboard/responsive sample completed; axe on five pages detected insufficient contrast (CAS-014), alongside thresholds without accessible names (CAS-011). See [manual-checks.md](manual-checks.md).
- Dedicated performance and security tests, only within agreed scope and limits.

## Data handling and GDPR

- The public suite does not register users or enter personal data, passwords or payments. It only modifies browser state (consent, filters, options).
- Legacy opt-in authenticated journeys use a synthetic account/address and never submit orders. A later, separately authorized demo uses two owned synthetic roles and only documented test cards; see [demo-tests.md](demo-tests.md). Both modes leave marketing disabled. They remove cart contents/address and verify deletion; on failure, they retain a private ledger for manual cleanup. Do not use this capability with other people's accounts.
- Do not use real people's accounts or copy credentials from the reference repository.
- Exports, cookies, sessions, traces and videos must be treated as potentially sensitive. Do not send them to AI services or public repositories.
- For public issues: reproduce with synthetic data, crop/redact evidence and review requests/headers.
- Retain local evidence only as long as needed; delete `test-results/` and `playwright-report/` when finished. CI artifacts: opt-in and 7 days.
- Preselected marketing is a discrepancy with the published policy and a consent risk; it requires privacy review and is not, by itself, a legal conclusion about the entire application.

## Proposed exit criterion

Do not recommend production until high risks are resolved or explicitly accepted, critical authenticated flows are verified and privacy review is completed. A partially green suite never replaces these criteria. Priorities and the final decision belong to the product/QA team.
