# MarketNest QA automation · CAS Automotive assessment

A risk-based QA project for [the MarketNest QA marketplace](https://qa-marketplace-app-b9mpo.ondigitalocean.app/). It combines **Bun, TypeScript, Playwright, axe and GitHub Actions** to find reproducible defects, preserve evidence and explain release risks.

**Start here:** [Executive report](docs/final-report.md) · [17 reported findings](https://github.com/Greynner/CASAutomotive-smoke-tests/issues) · [Testing strategy and SDLC traceability](docs/testing-strategy.md).

> This repository contains the automation project, **not the marketplace application's source code**. Unit coverage applies to our automation utilities. Local integration tests exercise our adapters against a controlled HTTP fixture. Live API and browser tests exercise the deployed marketplace. These layers must not be presented as unit coverage of the application's internals or complete SDLC certification.

## What the project tests

| Layer                               | What it verifies                                                                                             | Location                                | Command                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------- |
| Unit — 140 tests                    | USD parsing, ownership, request policies, demo-card/payload caps and cross-process locking                   | `tests/unit/`                           | `bun run test:unit:coverage`                  |
| Local integration — 10 tests        | Page Object + browser + real loopback HTTP, persisted fixture state, HTTP errors, guard enforcement          | `tests/integration/`                    | `bun run test:integration`                    |
| Live API — 17 checks                | Public routes, missing product, legal link, guest access restrictions and redirects                          | `src/e2e-tests/tests/integration/`      | `bun run test:api`                            |
| Live browser — 115 executions       | Catalog, pricing, navigation, registration validation, privacy smoke, axe, desktop and mobile                | `src/e2e-tests/tests/ui/` and `mobile/` | `bun run test:frontend`                       |
| Authenticated — 2 opt-in journeys   | Own synthetic account: login/logout, profile, marketing, coupons, cart, checkout preview, export and erasure | `src/e2e-tests/tests/account/`          | `bun run test:account`                        |
| Authorized demo — 1 bounded journey | Published demo cards, two owned orders, cancellation, fulfilment, return eligibility and seller controls     | `src/e2e-tests/tests/demo/`             | `AUTHORIZE_DEMO_CHECKOUT=1 bun run test:demo` |
| Observational baseline              | Nine sequential navigations and security-header observations; no load generation or SLA approval             | `scripts/qa-baseline.ts`                | `bun run test:baseline`                       |

The live public matrix totals **132 executions**, separate from the 140 unit tests, 10 local integration tests, two legacy authenticated journeys and one separately authorized bounded demo journey. Historical live results and known intermittent failures are documented in [findings.md](docs/findings.md).

## Quick start

Use **Bun 1.3.6**, a Playwright-supported Node.js installation and a supported browser OS. CI pins Bun and installs dependencies from `bun.lock`.

```bash
bun install --frozen-lockfile
bunx playwright install chromium
bun run lint
bun run typecheck
bun run test:local
```

`test:local` runs unit and local integration tests. It does **not** contact MarketNest, create accounts or need credentials. On Linux, install browser system dependencies with `bunx playwright install --with-deps chromium`.

To exercise the live site:

```bash
bunx playwright install chromium firefox webkit
bun run test:api       # deployed HTTP/API checks
bun run test:frontend  # desktop and mobile browser matrix
bun run report
```

Live failures are expected while the reported site defects remain unfixed. They are not suppressed with skips, expected failures or `continue-on-error`.

## Repository map: where everything lives

```text
.github/
  actions/setup/action.yml       Reusable CI setup: pinned Bun, cache, frozen installation
  workflows/e2e-tests.yml        Quality → unit/local integration → live API → browsers
  ISSUE_TEMPLATE/bug_report.yml  Priority, reproduction, expected/actual and safe evidence
src/e2e-tests/
  pages/                        Page Objects: home/catalog/product/cart and demo checkout/order/seller
  support/
    marketplace.ts              Seed product references and USD-to-cents parsing
    account-policy.ts           Pure legacy origin/request/ownership safety rules
    demo-policy.ts              Demo card/payload, owned-item and operation-budget rules
    demo-session.ts             Two owned roles, atomic checkpoints and strict demo transport
    demo-lock.ts                Exclusive cross-process demo run lock
    synthetic-account.ts        Account lifecycle and browser enforcement of that policy
    account-navigation.ts       Observable client-readiness checks for account flows
  tests/
    integration/                LIVE deployed HTTP/API tests, not the local fixture suite
    ui/                         Desktop functional, privacy and accessibility specs
    mobile/                     Responsive layout and mobile interaction specs
    account/                    Legacy opt-in journeys; never submit orders
    demo/                       Separately authorized bounded demo; never runs in CI
tests/
  unit/                         Bun tests for the automation's pure utilities
  integration/
    automation-adapters.spec.ts Local browser/HTTP integration tests
    fixtures/marketplace-server.ts Per-test loopback HTTP server; NOT marketplace source
scripts/qa-baseline.ts           Sequential navigation/header observation script
docs/                           Assessment reports, coverage strategy and delivery material
playwright.config.ts            Live projects, browsers, retries and private evidence controls
playwright.integration.config.ts Local-only Chromium integration configuration
playwright.demo.config.ts        Local-only demo authorization, private reports and no retries
bunfig.toml                     Unit discovery and 90% line/function coverage gate
tsconfig.json                   Strict project-source checking; vendor declarations skipped
biome.json                      Formatting and lint rules
.env.example                    Non-secret configuration example
bun.lock                        Reproducible dependency versions
```

`tests/integration/` and `src/e2e-tests/tests/integration/` are intentionally different: the first validates automation adapters **locally**; the second checks the **live application**. `test:integration` selects the local suite; `test:api` selects deployed HTTP checks.

## Commands

| Command                                       | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `bun test` / `bun run test:unit`              | Unit tests only; `bunfig.toml` prevents accidental Playwright discovery |
| `bun run test:unit:coverage`                  | Unit tests, text + LCOV coverage; requires ≥90% lines and functions     |
| `bun run test:integration`                    | Deterministic local integration tests                                   |
| `bun run test:local`                          | Unit + local integration, without the QA site                           |
| `bun run test:api`                            | Live deployed HTTP/API checks                                           |
| `bun run test:e2e`                            | Full 132-execution public live matrix                                   |
| `bun run test`                                | Local layers, then the full live matrix                                 |
| `bun run test:smoke`                          | Live API checks + desktop Chromium                                      |
| `bun run test:frontend`                       | All desktop and mobile browser projects                                 |
| `bun run test:account`                        | Two opt-in journeys on the locally owned synthetic account              |
| `AUTHORIZE_DEMO_CHECKOUT=1 bun run test:demo` | Prepared owned demo fixtures only; completed ledgers refuse reruns      |
| `bun run report:demo`                         | Open the separate private demo report                                   |
| `bun run test:baseline`                       | Sequential observational baseline, no concurrent load                   |
| `bun run test:headed` / `test:ui`             | Live headed or interactive Playwright execution                         |
| `bun run report`                              | Open the live public report                                             |
| `bun run report:account`                      | Open the separate authenticated report                                  |
| `bun run lint` / `typecheck` / `format`       | Static checks and formatting                                            |

Examples:

```bash
bunx playwright show-report playwright-report-integration
bunx playwright test --project=frontend-chromium --grep '@pricing'
bunx playwright test --project=frontend-chromium --grep '@privacy-smoke'
BASE_URL=https://your-compatible-qa.example bun run test:smoke
```

Changing `BASE_URL` does not adapt seed products or business contracts to a different application. Account mutations remain pinned to the originally authorized QA origin.

## CI: independent signals, explicit failure handling

The [QA delivery pipeline](.github/workflows/e2e-tests.yml) runs on pushes and pull requests targeting `main`/`master`, and supports manual dispatch.

```text
Lint + type checking
        ├── Unit tests + coverage + JUnit
        └── Local browser/HTTP integration
                    ↓ both must pass
              Live QA API contracts
                    ↓ even if a genuine API defect fails
              Cross-browser + mobile regression
```

- The deterministic layers are separate jobs, making automation regressions distinguishable from deployed-site bugs.
- Browser regression can run after a live API failure, but not after a unit/integration failure. Nothing converts genuine failures into success.
- Pinned Bun, frozen lockfile, dependency cache, read-only repository permissions, run cancellation and job timeouts are configured.
- Unit coverage/JUnit and local fixture reports are uploaded automatically for seven days; they contain no real accounts.
- **Live-site evidence is upload-opt-in only** through manual `upload_evidence`, also retained for seven days. Review access and contents first.
- Synthetic-account creation and authenticated journeys are explicitly disabled in automatic CI.

The unit coverage report currently reaches 100% lines/functions for **four exercised utility modules only**; the gate is 90%. It does not measure the whole automation repository or the marketplace app.

## Reports, data and safety

| Output                            | Where to find it                                              | Tracked in Git? |
| --------------------------------- | ------------------------------------------------------------- | --------------- |
| Unit coverage                     | `coverage/unit/lcov.info`; CI also writes `junit.xml`         | No              |
| Local integration reports         | `playwright-report-integration/`, `test-results-integration/` | No              |
| Public live reports               | `playwright-report/`, `test-results/results.json`             | No              |
| Authenticated reports             | `playwright-report-account/`, `test-results-account/`         | No              |
| Baseline samples                  | `test-results/baseline.json`                                  | No              |
| Synthetic-account recovery ledger | `.auth/owned-account.json`                                    | **Never**       |

Screenshots, video and traces are disabled for authenticated journeys. Negative registration tests block the creation endpoint and assert that client validation stops the request; they do not prove server-side validation. Legacy account tests never submit orders. A separate, explicitly authorized demo mode uses only the application's published test cards and two owned synthetic roles; it created two demo orders within a four-submission cap. This is not real payment-provider verification. See [demo-tests.md](docs/demo-tests.md).

**A technical privacy smoke test was performed. Comprehensive GDPR compliance was not validated, and no legal advice was provided.** See [privacy-smoke.md](docs/privacy-smoke.md). Never publish raw sessions, exports or credentials.

Both owned synthetic profiles and the demo shop/draft/order history require environment-owner cleanup because account erasure still accepts credentials ([CAS-007](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7)). Profiles/preferences were restored, both carts are empty, and the synthetic listing is Draft. Private ledgers remain ignored by Git; do not delete them or create replacement accounts to bypass cleanup.

## Documentation index

| Document                                         | Contents                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [Testing strategy](docs/testing-strategy.md)     | Layer boundaries, SDLC traceability, TDD evidence, coverage and CI design                   |
| [Executive report](docs/final-report.md)         | Results, release recommendation and remaining scope                                         |
| [Findings](docs/findings.md)                     | CAS-001–CAS-017, reproduction, priorities and historical runs                               |
| [Test plan](docs/test-plan.md)                   | Risks, implemented coverage and exit criteria                                               |
| [Account guide](docs/account-tests.md)           | Authorization, recovery ledger, opt-in execution and cleanup                                |
| [Demo runbook](docs/demo-tests.md)               | Later authorization, demo evidence, operation caps, checkpoints, returns limits and cleanup |
| [Privacy smoke](docs/privacy-smoke.md)           | Technical observations and explicit legal/GDPR limitations                                  |
| [Technical smoke](docs/technical-smoke.md)       | Access control, forms, baseline measurements and hardening observations                     |
| [UI/accessibility review](docs/manual-checks.md) | Sampled keyboard/responsive checks, axe and limitations                                     |
| [Delivery email](docs/delivery-email.md)         | English draft for the evaluator; not an email already sent                                  |

Optional AI/Passmark execution from the reference project is not included: deterministic reproduction does not require sending application data to an external AI provider. AI assistance used in preparing this assessment is disclosed in the delivery notes.
