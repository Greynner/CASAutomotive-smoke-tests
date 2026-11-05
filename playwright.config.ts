import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const accountRun = process.env.RUN_ACCOUNT_TESTS === '1';
const resultsDir = accountRun ? 'test-results-account' : 'test-results';

export default defineConfig({
  testDir: './src/e2e-tests/tests',
  outputDir: resultsDir,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: Number(process.env.WORKERS ?? 2),
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: accountRun ? 'playwright-report-account' : 'playwright-report',
      },
    ],
    ['json', { outputFile: `${resultsDir}/results.json` }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://qa-marketplace-app-b9mpo.ondigitalocean.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'integration', testMatch: /integration\/.*\.spec\.ts/ },
    {
      name: 'frontend-chromium',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'frontend-firefox',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'frontend-webkit',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'frontend-mobile-iphone',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'frontend-mobile-android',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    ...(accountRun
      ? [
          {
            name: 'account-chromium',
            testMatch: /account\/.*\.spec\.ts/,
            retries: 0,
            use: {
              ...devices['Desktop Chrome'],
              serviceWorkers: 'block' as const,
              trace: 'off' as const,
              screenshot: 'off' as const,
              video: 'off' as const,
              actionTimeout: 20_000,
            },
          },
        ]
      : []),
  ],
});
