# Technical smoke test: access, forms, performance and hardening

## Unauthenticated access

Eight integration checks passed: account/export/addresses/cart returned 401 for guests, and account/addresses/privacy/orders redirected to login. No bulk enumeration, vulnerability scans, access to other people's IDs or exploitation tests were performed. This original guest-access stage was not a security audit or a two-user authorization test. The later [demo extension](demo-tests.md) additionally verified a buyer-to-other-seller product update rejection (403), without claiming complete IDOR coverage.

## Registration and authentication

- Login/logout, rejected incorrect password and restricted guest access: journey using the owned synthetic account.
- Fifteen public negative-registration executions: empty form, empty name, empty confirmation, missing terms acceptance and mismatched confirmation. The five cases ran across three engines.
- The creation endpoint is blocked during these negative tests, and the frontend is checked for attempted submission. **This only demonstrates client-side validation of those cases**, not server validation.
- During exploration, non-empty weak passwords and a malformed email were sent to the backend; requests were aborted for safety. No conclusion was reached on whether the server accepts or rejects them, and no bugs were opened for them. Backend password-strength validation and actual email recovery remain unverified.
- During this original registration/public-smoke stage, no additional profiles, recovery emails or orders were submitted. The later explicitly authorized demo used one additional synthetic buyer and two demo orders; see [demo-tests.md](demo-tests.md).

## Catalog and coupons

Expansion: searches with uppercase letters, reversed word order, repeated spaces and shop name; category and persistence after reload; stock filter; exact maximum-price boundary. The catalog is shared, and global counts are not fixed.

Using the synthetic account, checks covered rejection of an invalid code, SAVE20 rejection at $50 and acceptance at $100, TAKE5 application and manual coupon removal. SAVE20 is not removed when reducing the subtotal from $100 to $50 (CAS-013). The cart is cleaned up at the end. Final order calculation/charging was not confirmed.

## Navigation baseline, not a load test

Command: `bun run test:baseline`. Chromium, nine sequential navigations, three new contexts per route, a single client. Writes blocked; observation performed on **2026-11-05 02:02 UTC**. All responses were HTTP 200, with no 30 s timeouts.

| Route       | Observed TTFB, min–max | Time to load, min–max |
| ----------- | ---------------------- | --------------------- |
| `/`         | 717–781 ms             | 814–952 ms            |
| `/products` | 692–2106 ms            | 795–2215 ms           |
| `/help`     | 2829–4094 ms           | 2945–4204 ms          |

These are measurements from this machine/network/time, not a repeatable benchmark under load, real-user Core Web Vitals or SLA approval. No performance threshold was defined. Network variation and QA load may affect these results.

Full results are saved in `test-results/baseline.json` (ignored by Git). The command is opt-in, generates no concurrent load and is not added to CI.

## Observed headers

`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` and `Referrer-Policy` were not observed in the sampled responses. Reviewing deployment hardening before production is recommended. **No exploitable vulnerability was demonstrated, and each missing header is not reported as a separate bug.** Headers for all routes/resources and internal proxy settings were not assessed.

## Automation stability

The public expansion had two intermittent navigation failures (Firefox guest cart and WebKit CTA). Both scenarios passed twice per engine on rerun: 12/12. This does not demonstrate complete stability.

Authenticated tests showed actions on SSR HTML before handlers were attached, and unnecessary `load` waits. `domcontentloaded` plus an observable client-mount marker is used within contexts that do not select consent. Final validation completed both journeys and reached their cleanup; it failed only on known product discrepancies.

Retries were not increased to conceal errors, and bugs were not declared as `expected failure`.
