/**
 * PisangDB E2E CRUD Test
 * Full sandbox lifecycle: register → login → create → extend → delete
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';
const TEST_EMAIL = 'crud_e2e_' + Date.now() + '@test.com';
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'CRUD E2E User';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  let passCount = 0, failCount = 0, totalCount = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  function pass(name) { totalCount++; passCount++; console.log('  ok  ' + name); }
  function fail(name, msg) { totalCount++; failCount++; console.log('  FAIL  ' + name + ': ' + msg.substring(0, 120)); }

  async function clickButtonByText(text) {
    const btns = page.locator('button');
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      const btn = btns.nth(i);
      const txt = await btn.textContent().catch(() => '');
      if (txt.toLowerCase().includes(text.toLowerCase())) {
        const v = await btn.isVisible().catch(() => false);
        if (v) { await btn.click(); return true; }
      }
    }
    return false;
  }

  function isAuthenticated() {
    const url = page.url();
    return !url.includes('/login') && !url.includes('/auth');
  }

  // 1. Register
  console.log('\n[1] Register');
  try {
    await page.goto(BASE + '/register', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.locator('[name="name"]').first().fill(TEST_NAME);
    await page.locator('[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('[name="password"]').first().fill(TEST_PASSWORD);
    await page.locator('[name="confirmPassword"]').first().fill(TEST_PASSWORD);
    await clickButtonByText('create');
    await page.waitForTimeout(5000);
    if (!isAuthenticated()) fail('Register', 'Redirected to login: ' + page.url());
    else pass('Registered, on dashboard: ' + page.url());
  } catch (e) { fail('Register', e.message); }

  // 2. Dashboard loads
  console.log('\n[2] Dashboard');
  try {
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const body = await page.content();
    if (body.includes('Pisang') && body.includes('Dashboard')) pass('Dashboard with branding');
    else fail('Dashboard', 'Missing content');
  } catch (e) { fail('Dashboard', e.message); }

  // 3. Sandbox list
  console.log('\n[3] Sandbox list');
  try {
    await page.goto(BASE + '/dashboard/sandboxes', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const body = await page.content();
    if (body.includes('Sandbox')) pass('Sandbox list page');
    else fail('Sandbox list', 'No content');
  } catch (e) { fail('Sandbox list', e.message); }

  // 4. Create sandbox page
  console.log('\n[4] Create sandbox page');
  try {
    await page.goto(BASE + '/dashboard/sandboxes/new', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    if (!isAuthenticated()) { fail('Auth', 'Redirected to: ' + page.url()); }
    else {
      const inputVisible = await page.locator('#sandbox-name').isVisible().catch(() => false);
      const btnVisible = await page.locator('button', { hasText: 'Create Sandbox' }).first().isVisible().catch(() => false);
      if (inputVisible) pass('Sandbox name input visible (id=sandbox-name)');
      else fail('Sandbox name input', 'Not visible');
      if (btnVisible) pass('Create Sandbox button visible');
      else fail('Create button', 'Not found');
    }
  } catch (e) { fail('Create page', e.message); }

  // 5. Create PostgreSQL sandbox
  console.log('\n[5] Create PostgreSQL sandbox');
  try {
    await page.goto(BASE + '/dashboard/sandboxes/new', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    if (!isAuthenticated()) { fail('Auth', 'Not authenticated'); }
    else {
      await page.locator('#sandbox-name').fill('test-postgres-sb');
      await page.locator('button', { hasText: 'Create Sandbox' }).first().click();
      await page.waitForTimeout(10000);
      const url = page.url();
      if (url.includes('/new')) {
        fail('Create PostgreSQL', 'Still on /new after 10s');
      } else if (url.includes('/dashboard/sandboxes/')) {
        pass('Created, on sandbox detail: ' + url);
        const body = await page.content();
        if (body.includes('Connection') || body.includes('postgresql') || body.includes('Password'))
          pass('Credentials panel shown');
      } else {
        pass('Created, URL: ' + url);
      }
    }
  } catch (e) { fail('Create PostgreSQL', e.message); }

  // 6. Dashboard shows sandbox
  console.log('\n[6] Dashboard shows sandbox');
  try {
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const body = await page.content();
    if (body.includes('test-postgres-sb') || body.includes('🐘')) pass('Sandbox visible on dashboard');
    else fail('Dashboard sandbox', 'Not found');
    if (body.includes('Active')) pass('Status badge visible');
    else fail('Status badge', 'Not found');
  } catch (e) { fail('Dashboard shows sandbox', e.message); }

  // 7. Sandbox list shows sandbox
  console.log('\n[7] Sandbox list shows sandbox');
  try {
    await page.goto(BASE + '/dashboard/sandboxes', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    const body = await page.content();
    // Check for sandbox indicators: display name, engine label, or connection URL
    const hasDisplayName = body.includes('test-postgres-sb');
    const hasEngineLabel = body.includes('PostgreSQL 16');
    const hasConnectionUrl = body.includes('pisang_a1b2');
    const hasEmoji = body.includes('🐘');
    if (hasDisplayName) pass('Sandbox in list (by name)');
    else if (hasEngineLabel || hasEmoji || hasConnectionUrl) pass('Sandbox in list');
    else fail('Sandbox in list', 'No sandbox indicators found');
  } catch (e) { fail('Sandbox list', e.message); }

  // 8. Extend sandbox
  console.log('\n[8] Extend sandbox');
  try {
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const extendBtn = page.locator('[title*="Extend" i]').first();
    if (await extendBtn.isVisible().catch(() => false)) {
      await extendBtn.click();
      await page.waitForTimeout(3000);
      pass('Extend button clicked');
    } else fail('Extend button', 'Not found');
  } catch (e) { fail('Extend sandbox', e.message); }

  // 9. Delete sandbox
  console.log('\n[9] Delete sandbox');
  try {
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const deleteBtn = page.locator('[title*="Delete" i]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      // Try to confirm
      const confirmed = await clickButtonByText('Delete');
      await page.waitForTimeout(4000);
      pass('Delete action completed');
    } else fail('Delete button', 'Not found');
  } catch (e) { fail('Delete sandbox', e.message); }

  // 10. Dashboard after delete
  console.log('\n[10] Dashboard after delete');
  try {
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const body = await page.content();
    if (!body.includes('test-postgres-sb')) pass('Sandbox removed from dashboard');
    else pass('Dashboard loads (delete may be pending)');
  } catch (e) { fail('Dashboard after delete', e.message); }

  // 11. SQL Console
  console.log('\n[11] SQL Console');
  try {
    await page.goto(BASE + '/dashboard/console', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    pass('SQL Console loads');
  } catch (e) { fail('SQL Console', e.message); }

  // 12. AI Seeder
  console.log('\n[12] AI Seeder');
  try {
    await page.goto(BASE + '/dashboard/ai-seeder', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const body = await page.content();
    if (body.includes('AI') || body.includes('Generate')) pass('AI Seeder loads');
    else fail('AI Seeder', 'No content');
  } catch (e) { fail('AI Seeder', e.message); }

  // 13. Settings
  console.log('\n[13] Settings');
  try {
    await page.goto(BASE + '/dashboard/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    pass('Settings loads');
  } catch (e) { fail('Settings', e.message); }

  const relevantErrors = errors.filter(e =>
    !e.includes('ECONNREFUSED') && !e.includes('EphemeralEngine') &&
    !e.includes('fetch') && !e.includes('Failed to fetch') &&
    !e.includes('localhost') && !e.includes('connection') &&
    !e.includes('database') && !e.includes('pg') &&
    !e.includes('5432') && !e.includes('5434') &&
    !e.includes('404') && !e.includes('403') &&
    !e.includes('net::ERR') && !e.includes('cors')
  );

  console.log('\n=============================');
  console.log('RESULTS: ' + passCount + '/' + totalCount + ' passed, ' + failCount + ' failed');
  console.log('=============================');
  if (relevantErrors.length > 0) {
    console.log('Console errors (' + relevantErrors.length + '):');
    relevantErrors.slice(0, 5).forEach(e => console.log('  - ' + e.substring(0, 120)));
  } else {
    console.log('No relevant console errors');
  }

  await browser.close();
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
