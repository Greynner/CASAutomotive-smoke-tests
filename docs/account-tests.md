# Authenticated tests: controlled execution

## Authorization and limits

The user authorized creating synthetic accounts and testing registration/login/cart, but **not submitting payments or orders**. This limit remains in place even if checkout displays demo card instructions.

The opt-in suite runs **two Chromium journeys**, with one worker and the same owned account. The first (`extended.spec.ts`) checks profile correction, its reflection in the export, marketing opt-in/withdrawal, an invalid code, and the SAVE20 and TAKE5 minimums; it restores the profile, disables marketing and empties the cart. The second (`journey.spec.ts`) performs:

1. Register a synthetic account if its initial creation is explicitly authorized, or reuse the owned account in the ledger.
2. Login, logout, denied guest access, rejected incorrect password and valid login.
3. Empty cart → $50 product → quantity 2 → quantity 1; sums and shipping threshold.
4. `welcome10` coupon, tax after discounts and total.
5. Open checkout and return, **without filling in payment details or clicking Place order**.
6. Save a fictional address, download JSON, check the profile/address/promised sections and delete the download.
7. Remove cart contents and addresses, request deletion and check that the credentials no longer authenticate from a clean session.

Soft assertions allow multiple discrepancies to be collected while still reaching cleanup. If a navigation/API precondition fails, the test fails and `finally` attempts cleanup. This does not guarantee deletion: it is explicitly verified, and CAS-007 demonstrates the product failure.

## Run

```bash
bun run test:account
bun run report:account
```

First run on another machine, **only with the environment owner's permission to create QA data**:

```bash
CREATE_SYNTHETIC_ACCOUNT=1 bun run test:account
```

Do not delete the ledger to repeat account creation when an account is already awaiting cleanup. Reusing it avoids accumulating synthetic profiles while the deletion bug persists. An interrupted registration retains the ledger for manual recovery rather than automatically creating another account.

## Safeguards

- Project excluded from the default run and CI. Enabled with `RUN_ACCOUNT_TESTS=1`; the script selects only `account-chromium`, with one worker and no retries.
- Write origin pinned to the authorized QA environment. Changing `BASE_URL` does not enable mutations on another site.
- Only accounts with an ownership marker and a synthetic `cas-qa-<UUID>@example.com` email are accepted; arbitrary real-person credentials are not allowed.
- Random password. Marketing explicitly disabled during registration.
- Ledger `.auth/owned-account.json`, ignored by Git, with file permissions 0600 and local directory permissions 0700. storageState is not versioned.
- Navigation: `domcontentloaded` plus visible client-side banner mounting in contexts that never choose consent. This avoids acting on SSR forms before their handlers are attached. A redirect after DELETE is not used as proof of deletion: login rejection is checked.
- Browser interception: blocks writes by default except auth, cart and account/addresses. No code submits checkout, payments or orders. Email recovery and seller actions are not executed.
- Traces, videos and screenshots disabled for this project. Assertion/context reports are also considered private, even though they only use synthetic data.
- Separate results: `test-results-account/` and `playwright-report-account/`, without replacing the initial public evidence. They are not automatically uploaded as artifacts.

## Cleanup status

**Pending due to a marketplace defect:** CAS-007 / [issue #7](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7).

The deletion request returns success, but the account can log in again. Automation retains the ledger with a failed `cleanupStatus` so the owner can locate and remove the profile from the backend. It contains no real data. The synthetic addresses and cart contents were removed in the last completed run.

When the product actually rejects login with HTTP 401 after deletion, the test automatically removes the ledger. Do not assume that logging out or receiving HTTP 200 on DELETE means the account has been deleted.

## Coverage limits

Registration was exercised during initial exploratory creation; the latest automated run reused that single account. Orders, payments, returns, seller flows and review anonymization after deletion were not tested. Profile rectification and persistent marketing withdrawal were checked, but actual campaign delivery and revocation on other devices were not. A **technical privacy smoke test** was performed, not GDPR validation or legal advice. Isolation between two accounts and export of existing orders were not demonstrated: they require a subsequent authorized scenario. The saved address does demonstrate that the current export omits existing data.
