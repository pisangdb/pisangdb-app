import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should have quick actions', async ({ page }) => {
    await expect(page.getByText('Quick Actions', { exact: true })).toBeVisible();
    await expect(page.getByText('New Sandbox').first()).toBeVisible();
    // Use first() to avoid strict mode
    await expect(page.getByText('SQL Console').first()).toBeVisible();
    await expect(page.getByText('AI Seeder').first()).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await expect(page.getByText('Active Sandboxes')).toBeVisible();
    await expect(page.getByText('Total Created')).toBeVisible();
  });

  test('should have recent sandboxes section', async ({ page }) => {
    await expect(page.getByText('Recent Sandboxes')).toBeVisible();
  });

  test('should navigate to new sandbox page', async ({ page }) => {
    const newSandboxLink = page.getByRole('link', { name: 'New Sandbox' }).first();
    await newSandboxLink.click();
    await expect(page).toHaveURL(/\/dashboard\/sandboxes\/new/);
  });
});
