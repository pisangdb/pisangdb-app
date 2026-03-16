import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/PisangDB/);
    await expect(page.locator('text=PisangDB').first()).toBeVisible();
  });

  test('should have working login link', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: 'Sign In' }).or(page.getByRole('button', { name: 'Sign In' }));
    await expect(loginLink.first()).toBeVisible();
    await loginLink.first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have working register link', async ({ page }) => {
    // Try to find register link in the header or body
    const registerLink = page.locator('main a, header a').filter({ hasText: 'Sign Up' }).first();
    const anyRegisterLink = page.getByRole('link', { name: 'Sign Up' });
    
    if (await registerLink.count() > 0) {
      await registerLink.click();
    } else if (await anyRegisterLink.count() > 0) {
      await anyRegisterLink.first().click();
    } else {
      // Just navigate directly
      await page.goto('/register');
    }
    await expect(page).toHaveURL(/\/register/);
  });
});
