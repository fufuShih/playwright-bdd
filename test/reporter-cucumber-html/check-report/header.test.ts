import { test, expect } from '@playwright/test';
import { getFeature, openReport } from './helpers';

test.beforeEach(async ({ page }) => {
  await openReport(page);
});

test('header info', async ({ page }) => {
  await expect(page.getByText('9 failed')).toBeVisible();
  await expect(page.getByText('10 passed')).toBeVisible();
  await expect(page.getByText('19 executed')).toBeVisible();

  await expect(page.locator('dl').getByText('node.js')).toBeVisible();
  await expect(page.locator('dl').getByText('playwright-bdd')).toBeVisible();

  await expect(getFeature(page).getTags()).toHaveText(['@feature-tag']);
});
