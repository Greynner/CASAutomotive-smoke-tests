# QA executive report · MarketNest

**Date:** 2026-11-05 UTC. **Environment:** DigitalOcean QA. **Private repository:** [Greynner/CASAutomotive-smoke-tests](https://github.com/Greynner/CASAutomotive-smoke-tests).

## Conclusion

**Production release is not recommended in the observed state.** Discrepancies were identified in data deletion/export, consent, pricing, tax, coupons and accessibility. The final release decision belongs to the product/QA team.

**A technical privacy smoke test was performed. Comprehensive GDPR compliance was not validated, and no legal advice was provided.** This report describes observed controls, defects and limits; it does not claim legal certification or an exhaustive QA cycle.

## Delivery

- Bun, TypeScript, Playwright, Page Objects, Biome, axe and GitHub Actions.
- **140 unit tests** for automation utilities and **10 local HTTP/browser integration tests**, separate from the live-site matrix. Both deterministic layers pass. Unit coverage is 100% lines/functions for the four exercised utility modules, not the application or whole repository.
- Five CI jobs separate static checks, unit coverage/JUnit, local integration, deployed API checks and cross-browser regression. See [testing strategy and SDLC traceability](testing-strategy.md).
- **132 public test executions**: 17 HTTP/access checks, 37 UI tests × three engines and two tests × two mobile profiles.
- **One later authorized bounded demo journey**: two card declines, two approved demo orders, Processing cancellation, seller shipment/delivery, return eligibility, fee/KPI checks and one cross-role authorization probe. See [demo runbook](demo-tests.md).
- **Two legacy opt-in authenticated journeys**, using only one owned synthetic account: authentication, profile, marketing, cart, coupons, checkout preview, export and deletion.
- **[17 findings in GitHub Issues](https://github.com/Greynner/CASAutomotive-smoke-tests/issues)**, grouped and prioritized, with reproduction steps and expected/actual behavior. Credentials and exported data are not published.
- [Detailed findings](findings.md), [plan](test-plan.md), [privacy smoke test](privacy-smoke.md), [technical smoke test](technical-smoke.md), [UI review](manual-checks.md) and [email draft](delivery-email.md).

## Added automation-layer verification

The unit and local integration suites were added after the dated live assessment below. They run without QA credentials or account mutations. `bun run test:local` verifies both layers; CI also enforces a 90% line/function coverage gate and publishes unit/local-fixture reports. No marketplace application-source unit coverage is claimed.

Latest offline validation: 140/140 unit tests, 10/10 local integration tests, valid JUnit output and 100% line/function coverage for the four exercised utilities. A deliberately partial coverage run exited non-zero, confirming the 90% gate. YAML parsing and job-dependency references were checked locally.

A separate live API recheck passed 15/17 checks: Terms of Service still returned 404, and `/sell` exceeded the request timeout. The latter is recorded as an unconfirmed transport/intermittency result, not a new confirmed defect. That earlier testing-layer update did not perform authenticated mutations or a full live-browser rerun. The later, separately authorized demo execution below adds new scope without rewriting historical results.

## Later authorized demo results

At **03:55 UTC**, a bounded Playwright journey completed in **101.4 s** using persisted checkpoints from four earlier controlled checkout submissions: **two HTTP 402 declines and two HTTP 201 approvals**, exactly two owned orders. One is Cancelled; one is Shipped/Delivered with fake tracking. No real payment/gateway settlement is claimed; checkout explicitly declares no real payments and only its published cards were used.

The journey failed on three new defects: cancellation does not restore stock (#15), cancelled sales inflate seller KPIs (#16), and the seller fee includes shipping/tax (#17). It also reconfirmed incomplete existing-order export (#9) and ineffective buyer erasure (#7). Buyer-to-other-seller product update returned 403; guest order access redirected to login.

Return eligibility was 30 calendar days and its policy link worked. **No return-request/refund-processing control was exposed**, so actual return processing/refund settlement remains unverified. Post-run lock/cart/cleanup hardening was verified offline; the completed journal was not reset to create more orders.

## Earlier expansion results

| Run                                   | Result                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Public matrix, 01:52 UTC              | **132: 90 passed and 42 failed**, 412.6 s. Forty failures reproduce nine public defects; two are intermittent navigation failures |
| Navigation rerun                      | Two scenarios × three engines × two repetitions: **12/12 passed**; the intermittent cause is not considered resolved              |
| Two authenticated journeys, 02:09 UTC | Both reached their steps and cleanup; failed due to **five discrepancies**: CAS-007–CAS-010 and CAS-013. Duration 285.0 s         |
| Guest access                          | Eight checks passed: four protected endpoints and four login redirects                                                            |
| Network privacy smoke test            | Nine scenarios passed, with explicit detection limits                                                                             |
| Negative client-side registration     | Fifteen executions passed; account-creation backend blocked for safety                                                            |
| Axe, five pages × three engines       | Fifteen executions detected insufficient contrast, grouped under CAS-014                                                          |
| Baseline, nine navigations            | Nine HTTP 200 responses, no 30 s timeout; not a load test or SLA approval                                                         |
| Static quality                        | Biome, TypeScript and frozen-lockfile installation passed                                                                         |

The rows describe subsets or separate runs: **do not add them together as independent cases**. Earlier runs are retained as history in [findings.md](findings.md). Tests are not skipped or changed to accept defects to simulate green CI; the site has bugs and CI may remain red.

## Proposed priorities

1. **[#7: ineffective deletion](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7):** credentials still authenticate after a successful DELETE.
2. **[#9: incomplete export](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/9):** omits an existing saved address.
3. **[#1: preselected marketing](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/1):** contradicts the published opt-in policy.
4. **[#10: tax before discount](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/10):** $4.00 instead of $3.60 in the WELCOME10 example.
5. **[#2: variant price does not update](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/2):** a +$10 option retains the base price.
6. **[#13: ineligible coupon persists](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/13):** SAVE20 remains active after reducing the subtotal from $100 to $50.

Additional release priorities: [#15 stock restoration](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/15) and [#17 item-only seller fees](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/17). [#16](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/16) records cancelled-sale KPI inflation.

Other findings: inflated discount percentages (#3), cookie rejection not remembered (#4), terms 404 (#5), sorting (#6), shipping charged at exactly $50 (#8), accessible star names (#11), exclusive maximum price (#12, confirm inclusive interpretation with product) and insufficient contrast (#14).

## Privacy smoke test: what could be checked

- Sampled cookies, storage keys and recognizable traffic before choosing, after rejection and after acceptance, on home/products/help across three engines. No analytics trackers were recognized in that sample; this does not prove their absolute absence.
- Marketing opt-in and withdrawal on the synthetic account: UI and export reflected the change; it was left disabled. Actual campaign delivery was not tested.
- Profile rectification and its reflection in the export: passed in the sample, followed by restoration.
- Export with an existing address and access revocation after deletion: **failed**, documented in #9 and #7.
- Guests denied access to four endpoints and four protected routes; this does not establish isolation between two authenticated users.

Legal bases, contracts, transfers, retention and policy wording were not legally reviewed. Backend, logs and backups were not accessed either. See [privacy-smoke.md](privacy-smoke.md).

## Data, safety and cleanup

- Two authorized synthetic roles: the reused seller and one additional buyer, plus one labeled demo shop/listing. Only these resources were modified.
- Profiles restored, marketing disabled, both carts empty, listing Draft, original address/download removed. One Cancelled and one Delivered demo order remain as history.
- **Environment-owner cleanup is required for both profiles, shop/draft and demo history because erasure still fails (#7).** Private ledgers remain under `.auth/`, ignored by Git with restricted permissions.
- Four demo submissions used only allowlisted published test cards and synthetic data. No real card, goods, carrier shipment or real financial settlement was used/verified. Legacy no-order guards remain unchanged.
- No publication of sessions, credentials, exports, traces, videos or authenticated screenshots. The account project is not included in automatic CI.

## Outstanding work and closure limits

- Fix or formally accept the 17 findings, clean up the retained synthetic resources, retest and run regression against the corrected deployment.
- Real payment-provider behavior, actual return/refund processing, out-of-window returns and the full invalid-transition matrix remain unverified. The bounded demo now covers declared test-card outcomes, two orders, Processing cancellation, seller fulfilment and visible return eligibility.
- One concrete cross-role update was rejected (403), but full account isolation, backend password validation, actual email recovery, sessions on other devices, concurrent stock and additional coupons remain unverified.
- Accessibility combines a keyboard/responsive sample and axe; actual screen-reader testing, human review of incomplete results and physical devices remain pending. WCAG conformance is not claimed.
- Performance observed without concurrent load or an SLA. Review of missing-header hardening is recommended; no exploit or complete security audit was demonstrated.
- Investigate intermittent public failures; successful reruns do not certify stability.
- Grant evaluator access and send the report. The repository is private; no emails or third-party invitations were sent without an authorized recipient.

## Reproduce

```bash
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
bun run lint
bun run typecheck
bun run test
bun run report
# Opt-in: owned account, no payments/orders; see account-tests.md
bun run test:account
bun run report:account
# Sequential observation, no concurrent load
bun run test:baseline
```

During the interview, distinguish observation, published rule, impact, hypothesized cause and limits. Do not present this delivery as a legal audit or comprehensive production approval.
