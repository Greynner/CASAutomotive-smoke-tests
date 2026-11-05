import { expect, test } from '@playwright/test';

// Heuristic smoke only: unknown/custom trackers and delayed collection require a separate audit.
const tracker =
  /google-analytics|googletagmanager|doubleclick|connect\.facebook|segment\.(?:io|com)|mixpanel|hotjar|amplitude|\/api\/analytics(?:\/|$)/i;
const analyticsKey = /^(?:_ga(?:_|$)|_gid$|_gat|_fbp$|__utm|_gcl)|analytics|tracking/i;

for (const choice of ['none', 'reject', 'accept'] as const) {
  test(`privacy network smoke: ${choice} consent, sampled routes @privacy-smoke`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.setTimeout(60_000);
    const matches = new Set<string>();
    const thirdPartyHosts = new Set<string>();
    const firstParty = new URL(baseURL ?? '').origin;
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return;
      if (firstParty && url.origin !== firstParty) thirdPartyHosts.add(url.hostname);
      if (tracker.test(`${url.hostname}${url.pathname}`)) {
        // Never save query strings, payloads, cookie values or full tracking URLs.
        matches.add(url.hostname);
      }
    });
    await page.goto('/');
    await expect(page.getByTestId('cookie-banner')).toBeVisible();
    if (choice !== 'none') {
      await page.getByTestId(`cookie-${choice}`).click();
      await expect(page.getByTestId('cookie-banner')).toBeHidden();
    }
    const cookiesBeforeNavigation = (await context.cookies()).map((cookie) => cookie.name);
    for (const route of ['/products', '/help']) {
      await page.goto(route, { waitUntil: 'load' });
    }
    const cookieNames = (await context.cookies()).map((cookie) => cookie.name);
    const storageKeys = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    const recognizableAnalyticsKeys = [
      ...cookieNames,
      ...storageKeys.local,
      ...storageKeys.session,
    ].filter((key) => analyticsKey.test(key));
    await testInfo.attach('sanitized-privacy-smoke.json', {
      body: JSON.stringify(
        {
          choice,
          sampledRoutes: ['/', '/products', '/help'],
          cookieNames,
          storageKeys,
          thirdPartyHosts: [...thirdPartyHosts],
          recognizableTrackerHosts: [...matches],
          limitation: 'Heuristic, bounded observation; not a GDPR or tracking compliance audit.',
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    if (choice !== 'accept') {
      expect(
        [...matches],
        'No recognizable analytics requests before consent or after rejection',
      ).toEqual([]);
      expect(recognizableAnalyticsKeys).toEqual([]);
    } else {
      expect(cookiesBeforeNavigation).toContain('mp_consent');
    }
  });
}
