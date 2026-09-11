import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:4173',
    launchOptions: { executablePath: process.env.CHROME_BIN }, trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
