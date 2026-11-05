# Testing strategy and SDLC traceability

## Scope: what these layers do and do not prove

This is a QA automation repository for a deployed marketplace. The marketplace's application source, database implementation and deployment pipeline were not provided.

**The unit tests cover our automation code, not the marketplace application's internals.** Local integration tests cover our automation adapters using a real browser and a controlled loopback HTTP fixture. Live API and E2E tests provide black-box evidence about the deployed application. This demonstrates layered testing and CI across the assessment workflow, not exhaustive testing of every application component or certification of the entire SDLC.

There is no application build/deployment job because this repository does not contain that application or deployment authority.

## Layers and responsibilities

| Layer                   | Runner and boundary                                                           | Coverage                                                                                                                     | Current deterministic result                                         |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Unit                    | Bun; pure utility public functions                                            | USD parsing, safe cents, ownership/request policies, demo payload/budgets and cross-process locking                          | **140 passing tests**                                                |
| Local integration       | Playwright Chromium + per-test Node HTTP server on an ephemeral loopback port | Page Object → HTTP mutation → persisted fixture render; error propagation; currency parsing; production browser guard wiring | **10 passing tests**                                                 |
| Live API integration    | Playwright request fixture → deployed QA                                      | 17 route, status, guest-access and redirect checks                                                                           | Historical live results in findings; genuine defects remain failures |
| Live browser regression | Chromium, Firefox, WebKit, emulated iPhone/Android → deployed QA              | 115 desktop/mobile executions; functional, accessibility and technical privacy smoke                                         | Historical live results in findings; not a release approval          |
| Authenticated journeys  | Explicit opt-in; locally owned synthetic account only                         | Two journeys covering profile/preferences, coupons/cart, export and deletion                                                 | Not automatic CI; known product defects documented                   |
| Observational baseline  | One client, sequential navigation                                             | Timings and selected response-header observations                                                                            | No load-test or SLA claim                                            |

The 17 live API checks plus 115 browser executions form the **132-execution public live matrix**. The 140 unit tests and 10 local integration tests are additional, separate layers. Do not combine their coverage percentages with application coverage or add repeated historical runs as unique test cases.

## Later bounded demo layer

The user later authorized a separate demo-only order workflow, documented in [demo-tests.md](demo-tests.md). It made four allowlisted submissions (two 402/two 201), retained exactly two owned orders (Cancelled/Delivered), and completed a private checkpoint-reusing validation. It is not part of the 132-execution public matrix or automatic CI. Returns cover the visible 30-day eligibility/policy only; no online refund processor was exposed.

The legacy account guard still denies order/payment/seller writes. A separate demo policy gates explicit authorization, exact cards/synthetic payloads, resource IDs and attempt/order caps. Unit tests cover those rules and a cross-process filesystem lock; live demo outcomes are not mislabeled as unit tests. Post-run hardening was validated offline without resetting the completed journal or placing more orders.

## Why the local integration suite is not a pretend application test

`tests/integration/fixtures/marketplace-server.ts` is explicitly a **transport/DOM fixture**, not a reimplementation of the marketplace. It does not prove real tax, coupon, stock, privacy or authentication logic.

It lets us verify automation behavior deterministically:

1. The production `CartPage` reads an actual browser DOM and calls the shared USD parser.
2. A browser click sends a real HTTP DELETE to a local server; reloading confirms fixture state persisted across requests.
3. HTTP 503 is surfaced as a failed mutation, not accepted as success.
4. Malformed server-rendered money is rejected instead of silently producing a misleading expected value.
5. The production browser guard allows a read but prevents out-of-origin writes from reaching the local server. Diagnostics verify that no POST reached transport.
6. A configured unauthorized origin is rejected before route installation.

The legacy pure policy additionally tests allowed QA-origin writes and prohibited order/payment/reset/seller writes without sending them anywhere. Separate unit tests cover the later explicit demo policy, including tight operation caps and denial of unexposed return endpoints. Integration tests never contact the QA site, read `.auth/`, register users or submit orders.

## SDLC evidence map

| Assessment phase               | Evidence in this repository                                                   | Boundary                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Requirements analysis          | `docs/test-plan.md`, Help Center contracts, expected/actual in issues         | Public rules and UI expectations; internal requirements unavailable     |
| Test design                    | Risk prioritization, Page Objects, safety policy, unit and HTTP fixture cases | Coverage chosen by risk, not a claim to test every behavior             |
| Automation development         | Unit tests, strict project-source typing, formatting/lint, TDD fixes          | Our automation source only                                              |
| Integration verification       | Local adapter suite and deployed API checks                                   | Fixture adapters versus real application behavior are clearly separated |
| System/regression verification | Cross-browser/mobile, axe, public/private journeys                            | Known failures and intermittency remain visible                         |
| Delivery/CI                    | Five independent GitHub Actions jobs, coverage gate, JUnit and reports        | No app deployment or forced green status                                |
| Maintenance/retesting          | Stable CAS IDs, linked reproduction commands, cleanup ledger                  | Bugs stay open until corrected or explicitly accepted                   |

## TDD and regression evidence

The unit layer was introduced using red → green → refactor:

- A test for `$12.3` initially failed: the old helper silently returned 1200 cents. The parser now rejects truncated decimals and malformed grouping.
- A safe-integer test initially failed for an out-of-range amount. Another regression showed floating-point rounding could lose one cent even within that range. The helper now parses dollars/fractional cents using integer arithmetic, verifies the safe range before converting to a number, and tests the maximum safe value.
- The account authorization/ownership policy was extracted behind pure public functions and tested before wiring it back into the browser guard.
- Local integration verifies that those functions are actually used by the production Page Object and browser adapter, rather than testing only disconnected examples.

These are automation-code improvements, **not fixes to the remote marketplace**. They do not create additional marketplace bug claims.

## Coverage and static checks

`bun run test:unit:coverage` produces text and LCOV output. `bunfig.toml` enforces at least **90% lines and functions**. The current suite reaches **100% lines/functions for the four exercised modules**:

- `src/e2e-tests/support/marketplace.ts`
- `src/e2e-tests/support/account-policy.ts`
- `src/e2e-tests/support/demo-policy.ts`
- `src/e2e-tests/support/demo-lock.ts`

Bun's report covers modules loaded by this unit suite. It is not coverage of the whole automation tree, Page Objects, remote application, database or privacy processes. No branch-coverage percentage is claimed.

The coverage gate was also tested negatively: running only the order-blocking case produced 31.48% lines and 33.33% functions and exited with status 1, despite the selected assertion passing. The complete 140-test run exits successfully.

TypeScript checks project source in strict/no-emit mode, including scripts and both new test layers. `skipLibCheck` skips incompatible third-party declaration checking for the pinned Bun/Node type combination; it does not disable checking of project/test source. Bun runtime and Bun types are pinned to 1.3.6. Biome checks formatting and recommended lint rules.

## CI design

`.github/workflows/e2e-tests.yml` defines five jobs:

1. **Quality:** lint and type checking.
2. **Unit:** coverage gate, LCOV and JUnit. Runs after quality.
3. **Local integration:** installs Chromium, exercises loopback fixtures. Runs after quality, alongside unit.
4. **Live API:** runs only if both deterministic layers passed.
5. **Browser regression:** runs after live API completes, including a genuine API-defect failure, but only if unit and local integration succeeded and the run was not cancelled.

The overall workflow still fails when the live site fails. There is no `continue-on-error`, blanket skip or expected-failure designation to hide product defects.

The reusable `.github/actions/setup/action.yml` pins Bun, restores its dependency cache and installs from the frozen lockfile. The workflow has read-only repository permissions, cancellation of superseded runs and timeouts. No credentials are needed for automatic jobs.

Unit coverage/JUnit and local fixture reports are safe to upload automatically. Live-site artifacts require explicit manual opt-in because they may contain sensitive information. All configured artifacts expire after seven days. Authenticated account creation, legacy journeys and demo orders are disabled in automatic CI. The demo config also rejects any CI execution explicitly.

## Commands and reporting

```bash
bun run test:unit:coverage    # deterministic; no browser/site required
bun run test:integration      # local HTTP fixture + Chromium
bun run test:local            # both local layers
bun run test:api              # deployed HTTP/API checks
bun run test:e2e              # full public live matrix
bun run test                  # local layers, then public live matrix
```

`test:integration` now explicitly means the **local** suite; use `test:api` for deployed HTTP checks. Older dated assessment records refer to their original command meanings/results and are not rewritten as new executions.

See the README for every report directory and the documentation map. Privacy conclusions remain limited to a **technical smoke test**, not GDPR compliance validation or legal advice.
