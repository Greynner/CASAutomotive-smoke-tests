import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/products', '/login', '/register', '/help']) {
  test(`automated accessibility smoke ${path} @accessibility`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto(path);
    await expect(page.getByTestId('cookie-banner')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({ target: node.target })),
    }));
    await testInfo.attach('sanitized-axe-smoke.json', {
      body: JSON.stringify(
        {
          path,
          violations,
          incompleteRules: results.incomplete.map((rule) => rule.id),
          passedRules: results.passes.length,
          limitation:
            'Automated sampled WCAG smoke; not a full accessibility audit or certification.',
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    expect(
      violations,
      'Review automatic findings; passing does not prove WCAG conformance',
    ).toEqual([]);
  });
}
