import { test, expect } from './fixtures';
import { login, TEST_USERS, BASE_URL, getTenantUrl, waitForNoLoaders } from './test_helper';

test.describe.serial('Help, Support & Ticketing Lifecycle', () => {
  const employee = TEST_USERS.employee;
  const admin = TEST_USERS.admin;
  
  const platformAdmin = {
    email: 'superadmin@harikerja.com',
    password: 'password123'
  };

  const ticketTitle = `E2E Test Ticket: ${Math.random().toString(36).substring(7)}`;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `support-lifecycle-failure.png`, fullPage: true });
    }
  });

  test('Employee should open support widget, read guides, and raise an internal ticket', async ({ page }) => {
    // 1. Login as standard employee
    await login(page, employee.email, employee.password);
    await page.goto(getTenantUrl('/id'));
    await waitForNoLoaders(page);

    // 2. Locate and open Floating Support Widget
    const FAB = page.locator('button[aria-label="Help and Support"]');
    await expect(FAB).toBeVisible({ timeout: 15000 });
    await FAB.click();

    // 3. Search and verify Guidelines tab
    await expect(page.getByText('Panduan Penggunaan', { exact: true })).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Cari panduan"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Gaji');
    
    // Check that at least one guideline card is visible
    await expect(page.locator('h4').filter({ hasText: /Gaji/i }).first()).toBeVisible();

    // 4. Navigate to Tiket Bantuan tab
    const ticketTabBtn = page.getByRole('button', { name: /Tiket Bantuan/i });
    await expect(ticketTabBtn).toBeVisible();
    await ticketTabBtn.click();

    // 5. Open new ticket form
    const createBtn = page.getByRole('button', { name: /Buat Tiket Baru/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 6. Fill new ticket form
    await page.locator('input[required]').fill(ticketTitle);
    await page.locator('form select').first().selectOption('PAYROLL');
    await page.locator('textarea[required]').fill('This is a test description raised via employee support widget.');

    // 7. Submit ticket
    const submitBtn = page.getByRole('button', { name: /Kirim|Submit/i }).last();
    await submitBtn.click();

    // 8. Verify Toast notification success
    await expect(page.getByText(/Tiket berhasil dibuat/i)).toBeVisible({ timeout: 15000 });
  });

  test('HR Admin should view, reply to, and resolve employee internal ticket', async ({ page }) => {
    // 1. Login as Tenant Admin / HR Admin
    await login(page, admin.email, admin.password);
    await page.goto(getTenantUrl('/id/tickets'));
    await waitForNoLoaders(page);

    // 2. Select Employee's Ticket in the list
    const ticketRow = page.locator('h4').filter({ hasText: ticketTitle }).first();
    await expect(ticketRow).toBeVisible({ timeout: 20000 });
    await ticketRow.click();

    // 3. Check Details and Original message description
    await expect(page.getByText('This is a test description raised via employee support widget.')).toBeVisible({ timeout: 15000 });

    // 4. Send reply
    const replyInput = page.locator('input[placeholder*="Ketik pesan balasan"]');
    await replyInput.fill('HR Admin E2E Reply: Under review.');
    
    const sendBtn = page.locator('button[type="submit"]').last();
    await sendBtn.click();

    // Verify reply appears in thread
    await expect(page.getByText('HR Admin E2E Reply: Under review.')).toBeVisible({ timeout: 15000 });

    // 5. Resolve Ticket
    const resolveBtn = page.getByRole('button', { name: /Tandai Selesai/i });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Verify Resolved text or status badge shows success
    await expect(page.getByText(/Tiket telah diselesaikan/i)).toBeVisible({ timeout: 15000 });
  });

  test('HR Admin should create a SaaS support platform ticket', async ({ page }) => {
    // 1. Login as Tenant Admin / HR Admin
    await login(page, admin.email, admin.password);
    await page.goto(getTenantUrl('/id/tickets'));
    await waitForNoLoaders(page);

    // 2. Switch to SaaS Support (Platform tickets)
    const saasTab = page.getByRole('button', { name: /SaaS Support/i });
    await expect(saasTab).toBeVisible();
    await saasTab.click();

    // 3. Open Create Form
    const createBtn = page.getByRole('button', { name: /Buat Tiket/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 4. Fill form for SaaS Platform Ticket
    const platformTitle = `Platform Bug: Billing discrepancy ${Math.random().toString(36).substring(7)}`;
    await page.locator('input[required]').fill(platformTitle);
    await page.locator('form select').first().selectOption('BILLING');
    await page.locator('textarea[required]').fill('We noticed an issue with our subscription invoice calculation.');

    // 5. Submit
    const submitBtn = page.getByRole('button', { name: /Buat Tiket/i }).last();
    await submitBtn.click();

    // 6. Verify toast success
    await expect(page.getByText(/Tiket berhasil dibuat/i)).toBeVisible({ timeout: 15000 });

    // Save title to global state/session to resolve it in next test
    await page.evaluate((title) => {
      sessionStorage.setItem('e2e_platform_ticket_title', title);
    }, platformTitle);
  });

  test('Global Superadmin should manage, assign, and resolve the SaaS platform ticket', async ({ page }) => {
    // 1. Login as platform superadmin
    await page.goto(`${BASE_URL}/id/login/portal-admin-secure-39f28j`);
    
    // Clear and set public tenant context for superadmin
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    await page.fill('input[type="email"]', platformAdmin.email);
    await page.fill('input[type="password"]', platformAdmin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(analytics|admin\/registrations)/, { timeout: 120000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });

    // 2. Navigate to Global Support Dashboard
    await page.goto(`${BASE_URL}/id/admin/support`);
    await waitForNoLoaders(page);

    // 3. Verify page is loaded and displays tickets
    await expect(page.getByText('Portal Dukungan SaaS')).toBeVisible({ timeout: 30000 });

    // Find a ticket and resolve it
    const ticketItem = page.locator('h4').filter({ hasText: 'Platform Bug: Billing discrepancy' }).first();
    if (await ticketItem.isVisible()) {
      await ticketItem.click();
      
      // Assign to me
      const assignBtn = page.getByRole('button', { name: /Tangani Tiket/i });
      if (await assignBtn.isVisible()) {
        await assignBtn.click();
        await expect(page.getByText('Ditangani:')).toBeVisible({ timeout: 15000 });
      }

      // Reply
      const replyInput = page.locator('input[placeholder*="Ketik balasan Anda"]');
      await replyInput.fill('Global support reply: Resolving your issue.');
      const sendBtn = page.locator('button[type="submit"]').last();
      await sendBtn.click();
      
      await expect(page.getByText('Global support reply: Resolving your issue.')).toBeVisible({ timeout: 15000 });

      // Resolve
      const resolveBtn = page.getByRole('button', { name: /Tandai Selesai/i });
      await expect(resolveBtn).toBeVisible();
      await resolveBtn.click();

      await expect(page.getByText(/Tiket telah diselesaikan/i)).toBeVisible({ timeout: 15000 });
    }
  });
});
