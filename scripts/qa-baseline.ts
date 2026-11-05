import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const baseURL = process.env.BASE_URL ?? 'https://qa-marketplace-app-b9mpo.ondigitalocean.app';
const samples: Array<Record<string, unknown>> = [];
const browser = await chromium.launch();
try {
  for (const path of ['/', '/products', '/help']) {
    for (let sample = 1; sample <= 3; sample++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await context.route('**/*', (route) =>
        ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
          ? route.continue()
          : route.abort('blockedbyclient'),
      );
      try {
        const response = await page.goto(new URL(path, baseURL).href, {
          waitUntil: 'load',
          timeout: 30_000,
        });
        const timing = await page.evaluate(() => {
          const entry = performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming;
          return {
            ttfbMs: Math.round(entry.responseStart - entry.requestStart),
            domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
            loadMs: Math.round(entry.loadEventEnd || performance.now()),
          };
        });
        const headers = response?.headers() ?? {};
        samples.push({
          path,
          sample,
          status: response?.status(),
          ...timing,
          securityHeadersPresent: {
            csp: Boolean(headers['content-security-policy']),
            hsts: Boolean(headers['strict-transport-security']),
            nosniff: headers['x-content-type-options'] === 'nosniff',
            referrerPolicy: Boolean(headers['referrer-policy']),
          },
        });
      } catch {
        samples.push({
          path,
          sample,
          error: 'Navigation failed or exceeded 30s; not an established SLA violation.',
        });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
await mkdir('test-results', { recursive: true });
await writeFile(
  'test-results/baseline.json',
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      scope:
        'Single client, sequential cold contexts; observational smoke, not a load/security audit or SLA.',
      samples,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(samples, null, 2));
if (samples.some((sample) => sample.error || sample.status !== 200)) process.exitCode = 1;
