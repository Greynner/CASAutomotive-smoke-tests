import { defineConfig, devices } from '@playwright/test';

if (
  process.env.CI ||
  process.env.RUN_DEMO_TESTS !== '1' ||
  process.env.AUTHORIZE_DEMO_CHECKOUT !== '1'
) {
  throw new Error(
    'Demo order tests are local opt-in only: AUTHORIZE_DEMO_CHECKOUT=1 bun run test:demo. Never enable them in CI.',
  );
}

export default defineConfig({
  testDir: './src/e2e-tests/tests/demo',
  outputDir: 'test-results-demo',
  timeout: 600_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-demo' }],
    ['json', { outputFile: 'test-results-demo/results.json' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    serviceWorkers: 'block',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'authorized-demo-chromium' }],
});
