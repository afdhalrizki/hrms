import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Workflow Configurations', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `workflows-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    // Capture browser console logs
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });
    
    // Perform real login as admin
    await login(page, admin.email, admin.password);
  });

  test('should allow admin to configure a new workflow', async ({ page }) => {
    await page.goto(getTenantUrl('/en/workflows'));
    await page.waitForLoadState('networkidle');

    // 1. Create a new Workflow Config if none exist
    // Check for an "Add Workflow" or "Create" button
    const createBtn = page.getByRole('button', { name: /Add Workflow|Create Workflow/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      
      // Select model type (e.g. LEAVE)
      await page.locator('select[name="model_type"]').selectOption('LEAVE');
      await page.locator('input[name="name"]').fill('Standard Leave Approval');
      await page.getByRole('button', { name: /Create|Save/i }).first().click();
      
      await expect(page.getByText(/Workflow created successfully/i)).toBeVisible({ timeout: 15000 });
    }

    // 2. Select a workflow from the list to configure stages
    // Use a text locator and force click to ensure selection
    const leaveText = page.locator('span').filter({ hasText: /^LEAVE$/ }).first();
    await expect(leaveText).toBeVisible({ timeout: 15000 });
    
    const leaveBtn = page.getByRole('button').filter({ has: page.locator('span', { hasText: /^LEAVE$/ }) }).first();
    await leaveBtn.click({ force: true });
    
    // Verify selection via class
    await expect(leaveBtn).toHaveClass(/glass-card|border-primary/, { timeout: 15000 });
    // 3. Add an approval level (Stage)
    const addStageBtn = page.getByRole('button', { name: /Add Approval Level|Add Stage/i });
    await expect(addStageBtn).toBeVisible();
    
    // Sometimes the first click doesn't register if the page is still hydrating
    await expect(async () => {
      await addStageBtn.click({ force: true });
      const count = await page.getByTestId('stage-row').count();
      if (count === 0) throw new Error('Stage not added yet');
    }).toPass({ timeout: 15000 });
    
    // Verify a new stage appeared
    const newStage = page.getByTestId('stage-row').last();
    await expect(newStage).toBeVisible({ timeout: 10000 });
    
    // 4. Configure the stage
    await newStage.getByPlaceholder(/Stage Name/i).fill('Department Manager Approval');
    
    // Select approver type (e.g. ROLE)
    const roleButton = page.getByRole('button', { name: 'ROLE', exact: true }).last();
    await roleButton.click();
    
    // Select specific role (Seeded: Manager)
    const roleSelect = page.locator('select[name*="approver_role"]').last();
    await expect(roleSelect).toBeVisible();
    
    // Wait for roles to load
    await expect(async () => {
      const count = await roleSelect.locator('option').count();
      if (count <= 1) throw new Error('Roles not loaded yet');
    }).toPass({ timeout: 20000 });

    await roleSelect.selectOption({ label: 'HR Manager' });

    // 5. Save changes
    const saveChangesBtn = page.getByTestId('save-workflow-btn');
    await expect(saveChangesBtn).toBeVisible();
    await saveChangesBtn.click();
    
    // Wait for saving loader to appear then disappear
    await expect(page.locator('svg.animate-spin')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('svg.animate-spin')).not.toBeVisible({ timeout: 15000 });
    
    // 6. Verify success toast from real backend
    await expect(page.getByText(/Workflow updated successfully/i)).toBeVisible({ timeout: 20000 });
  });
});
