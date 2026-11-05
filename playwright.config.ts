import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use a system Chromium when one is available; otherwise Playwright's own download.
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(p => existsSync(p));

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5173', launchOptions: { executablePath, args: ['--no-sandbox'] } },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
