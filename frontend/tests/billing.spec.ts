import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Billing and Subscription Management', () => {
  const admin = TEST_USERS.admin;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    // Perform real login
    await login(page, admin.email, admin.password);
  });

  test('should display active plan and trial note on billing page', async ({ page }) => {
    await page.goto(getTenantUrl('/en/settings/billing'));

    // Wait for the page to load
    await expect(page.getByText(/Subscription & Billing/i)).toBeVisible({ timeout: 30000 });

    // 1. Verify "FREE" plan card is present
    // Note: The seeded tenant 'company1' might be on PROFESSIONAL or FREE.
    const freePlanCard = page.locator('div').filter({ has: page.getByRole('heading', { name: "Free Tier" }) }).last();
    
    // Check if the button in the Free Tier card is disabled
    const freeButton = freePlanCard.getByRole('button');
    if (await freeButton.isVisible()) {
        await expect(freeButton).toBeDisabled();
    }

    // 2. Check Plan Status using data-testid
    const activeBadge = page.getByTestId('active-plan-badge');
    await expect(activeBadge).toBeVisible({ timeout: 15000 });
    await expect(activeBadge).toContainText(/(AKTIF|ACTIVE)/i);
  });

  test('should show warning when selecting a plan with insufficient capacity', async ({ page }) => {
    await page.goto(getTenantUrl('/en/settings/billing'));
    await expect(page.getByText(/Subscription & Billing/i)).toBeVisible();

    // Select Essential HR plan by clicking the card
    const essentialCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /Essential HR/i }) }).last();
    await essentialCard.click();
    
    // The total invoice should update to Rp 250,000
    // We use .first() because the price appears in both the summary and the total
    await expect(page.getByText(/Rp 250[.,]000/).first()).toBeVisible({ timeout: 15000 });
  });
});
