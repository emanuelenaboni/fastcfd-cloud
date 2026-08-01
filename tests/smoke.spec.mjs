import { expect, test } from "@playwright/test";

test("loads the canonical FastCFD cloud application", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FastCFD Urban Studio v3\.24\.7/);
  await expect(page.locator("#quickCfdBar")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#fastCfdDriveButton")).toBeVisible();
  await expect(page.locator("#quickCfdOutput")).toBeDisabled();
  const status = await page.evaluate(() => ({
    cloud: Boolean(window.FastCFDCloud),
    quick: window.QuickCfdUI && window.QuickCfdUI.qa(),
    driveConfigured: window.FastCFDCloud && window.FastCFDCloud.config.googleClientId,
  }));
  expect(status.cloud).toBe(true);
  expect(status.quick.installed).toBe(true);
  expect(status.quick.ready).toBe(false);
  expect(status.driveConfigured).toBe("");
});

test("legacy report endpoint is captured without a localhost server", async ({ page }) => {
  await page.goto("/");
  await page.locator("#fastCfdDriveButton").waitFor();
  const downloadPromise = page.waitForEvent("download");
  const result = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:8971/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "cloud-adapter-smoke.html",
        dataurl: "data:text/html;base64,PGgxPkZhc3RDRkQ8L2gxPg==",
      }),
    });
    return response.json();
  });
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("cloud-adapter-smoke.html");
  expect(result.ok).toBe(true);
  expect(result.mode).toBe("download");
});

test("non-converged results never block report generation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#quickCfdOutput").waitFor();
  const policy = await page.evaluate(() => {
    STATE.importedModel = { objects: [{ name: "synthetic-smoke-geometry" }] };
    STATE.hasResults = true;
    STATE.metrics = { meanSpeed: 1.2 };
    STATE.resultValid = false;
    SOLVER.converged = false;
    SOLVER.residual = 0.25;
    return {
      ready: window.UrbanReportUX.reportReady(),
      label: document.querySelector("#urbanReportValidation")?.textContent || "",
    };
  });
  expect(policy.ready).toBe(true);
  await expect(page.locator("#quickCfdOutput")).toBeEnabled({ timeout: 2500 });
  await expect(page.locator("#quickCfdStatus")).toContainText("Report disponibile");
});
