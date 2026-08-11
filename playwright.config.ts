import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const scheme = process.env.E2E_SCHEME ?? "http";
const baseURL = `${scheme}://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    storageState: "./e2e/.auth/state.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn start",
    url: `${baseURL}/_health`,
    timeout: 180_000,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "production",
      FORCE_HTTPS: "false",
      PORT: String(port),
      URL: baseURL,
    },
  },
});
