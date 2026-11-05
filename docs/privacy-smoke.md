# Technical privacy and access smoke test

> **A technical privacy smoke test was performed. Comprehensive GDPR compliance was not validated, and no legal advice was provided.** Results describe observable controls and discrepancies in the QA deployment.

## Executed scope

Original privacy-smoke stage through 2026-11-05 02:09 UTC, Playwright 1.64.1: no real personal data, no additional accounts and no orders at that stage. A single authorized synthetic account was reused, and no other people's data was accessed.

| Technical control         | Observed evidence                                                       | Result / limit                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Before consent            | Home, products and help, clean contexts, three engines                  | No cookies, storage keys or analytics endpoints recognized by the test heuristics                                                |
| After rejection           | The same three routes and engines                                       | No trackers recognized; rejection is not remembered after reload (CAS-004)                                                       |
| After acceptance          | The same routes and engines                                             | `mp_consent` cookie; no local/sessionStorage keys or recognizable trackers in the sample. Acceptance need not activate analytics |
| Registration marketing    | Initial checkbox state                                                  | Preselected, contradicting the published opt-in policy (CAS-001)                                                                 |
| Preference and withdrawal | Synthetic account: enable → reload → export → disable → reload → export | UI and export reflected both states; left disabled. No actual campaign or email delivery tested                                  |
| Rectification             | Synthetic last-name change and verification after reload/export         | Passed in the sample; initial value restored                                                                                     |
| Access/export             | Own download with an existing synthetic address                         | Own profile, no plaintext password; omits the saved address (CAS-009). Existing orders were not verified                         |
| Deletion                  | DELETE and new login with clean cookies                                 | Still authenticates (CAS-007); visual redirection is not considered proof of deletion                                            |
| Guest API access          | GET for account, export, addresses and cart                             | Four HTTP 401 responses; not interpreted as proof of isolation between two authenticated users                                   |
| Guest UI access           | Account, addresses, privacy and orders                                  | Four login redirects                                                                                                             |

## Method and evidence

- `tests/ui/privacy-network.spec.ts`: nine passing executions (three choices × three engines), observing navigation to `/`, `/products`, `/help`.
- Cookie names and storage keys were inspected, not their values. Common patterns for Google Analytics/Tag Manager, Meta, Segment, Mixpanel, Hotjar, Amplitude and `/api/analytics` are recognized.
- `sanitized-privacy-smoke.json` attachments contain only names, recognized domains, sampled routes and limits. No payloads, query strings, full cookies or sessions.
- `tests/account/extended.spec.ts`: rectification, marketing preference and withdrawal; state reflected in the account's own export, without publishing the JSON.
- `tests/account/journey.spec.ts`: synthetic-data export and deletion, with effective credential checking after DELETE.
- `tests/integration/access-control.spec.ts`: guest blocking on specific endpoints and routes.

## Later authorized demo evidence

The user subsequently authorized one additional synthetic buyer and bounded demo orders, separate from the original no-order journeys. Two orders were created using only the published demo cards; the buyer's export still omitted existing orders. Buyer deletion still allowed fresh-cookie login. A cross-role buyer update against the owned seller's product was rejected with 403; guest order access redirected to login.

Both carts were emptied, listing restored to Draft and marketing disabled. Both synthetic profiles, shop/draft and order history now require environment-owner cleanup due to the erasure defect. IDs and credentials remain only in ignored private ledgers. This extension remains technical smoke evidence, not GDPR validation or legal advice. See [demo-tests.md](demo-tests.md).

## What this smoke test does NOT demonstrate

- Absolute absence of tracking, fingerprinting, custom analytics, delayed events, unrecognized destinations or data transfers. Observation is limited to the journey and execution period, not continuous capture of the entire application.
- Revocation of an old session on another device, isolation between two accounts, deletion in backend/logs/backups, legal retention, order/review anonymization or complete responses to rights requests.
- Encryption at rest, secure password hashing or internal controls inaccessible from the browser.
- Adequacy of legal wording, legal bases, vendor contracts, international transfers, retention periods or incident procedures. These were not assessed for legal compliance.
- A green suite does not certify GDPR compliance; an unidentified cookie alone does not prove a violation either.

## Cleanup and team actions

The synthetic profile was restored, marketing withdrawn, and cart contents and addresses removed. The download was deleted. **The original account remains because of the deletion failure and must be manually removed by the environment owner**; the recovery ledger exists only in `.auth/owned-account.json`, ignored by Git.

Prioritize CAS-001, CAS-004, CAS-007 and CAS-009; verify fixes using the tests and internally compare the published policy with actual processes. The delivery reports a technical privacy smoke test, not legal validation or compliance certification.
