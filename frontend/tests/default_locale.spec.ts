import { test, expect } from './fixtures';
import { BASE_URL, login } from './test_helper';

test.describe('Default Locale (Bahasa Indonesia)', () => {
  test('URL with /en prefix should render English content', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/about`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Should show English content
    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('About');
  });

  test('URL with /id prefix should render Indonesian content', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/id/about`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Should show Indonesian content
    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Tentang');
  });

  test('login page with /id prefix should render Indonesian', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/id/login`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`Final URL for /id/login: ${currentUrl}`);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Masuk');
  });

  test('settings page with /en prefix should render correctly', async ({
    page,
  }) => {
    // Login first
    await login(page, 'admin@company1.com', 'password123');

    // Navigate to settings WITH /en prefix
    await page.goto(`${BASE_URL}/en/settings`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Check that page renders
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('settings page with /id prefix should render correctly', async ({
    page,
  }) => {
    // Login first
    await login(page, 'admin@company1.com', 'password123');

    // Navigate to settings WITH /id prefix
    await page.goto(`${BASE_URL}/id/settings`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Check that page renders
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('middleware does not redirect /id prefix to /en', async ({ page }) => {
    // Clear cookies first to ensure clean state
    await page.context().clearCookies();

    await page.goto(`${BASE_URL}/id/about`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`Final URL for /id/about: ${currentUrl}`);

    // With localePrefix: 'as-needed' and defaultLocale: 'id',
    // next-intl strips the /id prefix because id is the default locale.
    // So /id/about may redirect to /about or stay as /id/about.
    // The important thing is it should NOT redirect to /en/about.
    expect(currentUrl).not.toContain('/en/about');

    // Should show Indonesian content regardless of URL
    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Tentang');
  });
});
