import { defineConfig, devices } from '@playwright/test';

// Deterministic adapter integration tests: loopback HTTP only, no QA accounts or credentials.
export default defineConfig({
  testDir: './tests/integration',
  outputDir: 'test-results-integration',
  timeout: 15_000,
  expect: { timeout: 3_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-integration' }],
    ['json', { outputFile: 'test-results-integration/results.json' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
  },
  projects: [{ name: 'local-integration' }],
});
