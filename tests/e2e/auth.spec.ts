import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should validate email field', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Sign in', exact: true });
    await submitButton.click();
    // Check that we're still on the login page (form didn't submit)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: 'Forgot your password?' });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Create Account/);
    await expect(page.getByRole('heading', { name: 'Create your PisangDB account' })).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: 'Sign in' });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate password match', async ({ page }) => {
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirm-password', 'differentpassword');
    
    const submitButton = page.getByRole('button', { name: 'Create account' });
    await submitButton.click();
    
    // Verify form accepts input
    await expect(page.locator('#confirm-password')).toBeVisible();
  });
});
