import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [join(__dirname, "../dist/main/index.js")],
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });

  // Wait for the first window
  page = await electronApp.firstWindow();

  // Wait for the app to be ready
  await page.waitForLoadState("domcontentloaded");
});

test.afterAll(async () => {
  await electronApp.close();
});

test("home page shows project list or empty state", async () => {
  // Wait for either "No projects yet" or "Your Projects" to appear
  // This indicates the app has connected to the server and loaded
  await expect(page.getByText(/No projects yet|Your Projects/)).toBeVisible({
    timeout: 30000,
  });
});

test("home tab is visible", async () => {
  // The home tab should have the ⌂ symbol
  await expect(page.getByRole("tab").first()).toBeVisible();
});

test("create project button exists", async () => {
  // There should be a way to create a new project
  await expect(page.getByRole("button", { name: /create project|\+/i })).toBeVisible();
});
