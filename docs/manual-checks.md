# Public UI, responsive layout and basic accessibility review

**Date:** 2026-11-05 UTC. **Method:** inspection using an automated browser and accessibility tree, without submitting forms or accessing accounts. This does not replace a human assessment using assistive technologies.

## Reviewed sample

- Pages: `/`, `/products`, `/login`, `/register`, `/help`.
- Chromium: desktop 1440×900 and mobile 390×900; ten page/viewport combinations.
- Mobile: expanded filters and keyboard activation.

| Check                                     | Observed result                                | Limit                                                               |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Horizontal document overflow              | Not observed in the ten combinations           | Does not cover all widths, languages or content                     |
| Expanded mobile filters                   | Content fits within 390px                      | Does not cover all physical devices                                 |
| Main landmark and heading                 | One `main` and one descriptive H1 on each page | Does not audit the entire semantic hierarchy                        |
| Login/registration labels and search name | Associations present                           | No forms were submitted in this review                              |
| First ten Tab stops per combination       | Navigation and controls reachable              | Not exhaustive navigation or testing of all focus traps             |
| Mobile Filters with Enter                 | Opens and exposes expanded state               | Not complete screen-reader testing                                  |
| Accessible names of rating thresholds     | **Fails: four radios are announced as `& up`** | CAS-011 / issue #11; automated test reproduced across three engines |

The absence of an outline alone was not recorded as a defect: a border change was observed when search received focus. No conformance is inferred for contrast or all focus states.

## New defect

[CAS-011 / issue #11](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/11): rating radios do not indicate 4, 3, 2 or 1 stars in their accessible names. The SVGs are hidden from the accessibility tree. A screen-reader user cannot distinguish the thresholds by their names.

```bash
bunx playwright test --project=frontend-chromium --grep '@accessibility'
```

## Automated axe expansion

`@axe-core/playwright` 4.14.0 was added with WCAG 2 A/AA and 2.1 A/AA rules, without excluding rules. Five pages × three engines detected `color-contrast` (CAS-014 / issue #14), grouped as a shared pattern. Home examples: white text on `#009966`, 3.65:1 versus the required 4.5:1 for “Start shopping” and “Accept all”. Only rules, selectors and impacts are saved in sanitized attachments; incomplete results require human review.

```bash
bunx playwright test --project=frontend-chromium --grep 'automated accessibility'
```

An automated scan is not treated as a complete audit or WCAG approval.

## Not assessed / not approved

- Actual screen-reader use, human review of contrast in all states, zoom/reflow at 200–400%, exhaustive keyboard navigation and comprehensive WCAG validation.
- Physical devices, more breakpoints, localization and order/seller interactions.
- Do not claim “accessibility approved” or “fully responsive” based on this sample.
