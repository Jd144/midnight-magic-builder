import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90000,
  use: { baseURL: process.env.MIDNIGHT_TEST_BASE_URL || "http://127.0.0.1:3000", browserName: "chromium" },
  workers: 1,
});
