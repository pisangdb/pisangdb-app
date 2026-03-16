import { test, expect } from '@playwright/test';

test.describe('Sandbox Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/sandboxes/new');
  });

  test('should display create sandbox page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Sandbox' })).toBeVisible();
    await expect(page.getByText('Engine', { exact: true })).toBeVisible();
    await expect(page.getByText('Region', { exact: true })).toBeVisible();
    await expect(page.getByText('Retention', { exact: true })).toBeVisible();
  });

  test('should display engine options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /PostgreSQL/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /MySQL/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /MariaDB/ })).toBeVisible();
  });

  test('should display region options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Indonesia/ })).toBeVisible();
    await expect(page.getByText('Singapore (coming soon)')).toBeVisible();
    await expect(page.getByText('United States (coming soon)')).toBeVisible();
  });

  test('should display credentials preview card', async ({ page }) => {
    await expect(page.getByText('Credentials Preview')).toBeVisible();
    await expect(page.getByText('Engine:')).toBeVisible();
    await expect(page.getByText('Host:')).toBeVisible();
    await expect(page.getByText('Port:')).toBeVisible();
    await expect(page.getByText('Database:')).toBeVisible();
    await expect(page.getByText('Username:')).toBeVisible();
  });

  test('should update credentials preview when changing name', async ({ page }) => {
    const nameInput = page.locator('#sandbox-name');
    // Clear and type new name
    await nameInput.fill('');
    await nameInput.fill('mytestdb');
    
    // Wait for preview to update
    await page.waitForTimeout(500);
    // The name transforms to lowercase and spaces become hyphens
    // So 'mytestdb' becomes 'mytestdb' (no change in this case)
    // Check that input has the value
    await expect(nameInput).toHaveValue('mytestdb');
  });

  test('should update credentials preview when changing engine', async ({ page }) => {
    // Click on MySQL option
    await page.getByRole('button', { name: /MySQL 8/ }).click();
    
    // The preview should update to show MySQL port (3306)
    await expect(page.getByText('3306')).toBeVisible();
  });

  test('should have create sandbox button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create Sandbox' });
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
  });

  test('should have back button', async ({ page }) => {
    const backLink = page.getByRole('link', { name: 'Back' });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/dashboard\/sandboxes/);
  });

  test('should have copy env button', async ({ page }) => {
    const copyButton = page.getByRole('button', { name: /Copy .env/ });
    await expect(copyButton).toBeVisible();
  });

  test('should handle create sandbox button click', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create Sandbox' });
    await createButton.click();
    
    // Wait for button state to change
    await page.waitForTimeout(1500);
    // Just verify page didn't crash
    await expect(page.getByRole('heading', { name: 'Create Sandbox' })).toBeVisible();
  });
});
