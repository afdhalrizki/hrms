import { test, expect } from '@playwright/test';

test.describe.serial('ESS Profile Management', () => {
  const employeeUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://company1.localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `profile-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/*', async route => {
      const urlStr = route.request().url();
      if (!urlStr.includes('/api/')) {
        await route.continue();
        return;
      }
      
      const method = route.request().method();
      const url = new URL(urlStr);
      const path = url.pathname;
      
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      let responseBody: any = null;
      let status = 200;

      if (path.includes('/auth/login')) {
        responseBody = { id: 70, employee_id: 1, email: 'emp70@company1.net', role: 'EMPLOYEE', fullname: 'Employee Seventy' };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 70, employee_id: 1, email: 'emp70@company1.net', role: 'EMPLOYEE', is_staff: false, fullname: 'Employee Seventy' };
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: [], is_subscription_active: true };
      } else if (path.includes('/employees/1')) {
        if (method === 'GET') {
          responseBody = {
            id: 1,
            nik: 'EMP-70-001',
            fullname: 'Employee Seventy',
            email: 'emp70@company1.net',
            phone: '08123456789',
            address: 'Jl. Keadilan No. 70',
            ptkp_status: 'K/1',
            npwp_number: 'NPWP70001',
            ktp_number: 'KTPS70001',
            department_name: 'Technology',
            role_name: 'Developer',
            status: 'PERMANENT',
            ktp_image: null,
            npwp_image: null
          };
        } else if (method === 'PATCH') {
          // Both form data (multipart) and JSON use PATCH for updates
          responseBody = {
            id: 1,
            nik: 'EMP-70-001',
            fullname: 'Employee Seventy',
            email: 'emp70@company1.net',
            phone: '08999999999', // Updated
            address: 'Jl. Baru No. 1', // Updated
            ptkp_status: 'K/2', // Updated
            npwp_number: 'NPWP70001',
            ktp_number: 'KTPS70001',
            department_name: 'Technology',
            role_name: 'Developer',
            status: 'PERMANENT',
            ktp_image: 'some-url/ktp.png', // Simulated upload
            npwp_image: 'some-url/npwp.png' // Simulated upload
          };
        }
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${employeeUrl}/login`);
    await page.locator('input[type="email"]').fill('emp70@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should verify administrative fields are read-only', async ({ page }) => {
    await page.goto(`${employeeUrl}/profile`);
    
    // Wait for data to load
    await expect(page.getByText('EMP-70-001')).toBeVisible();

    // Verify Email field is disabled
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveValue('emp70@company1.net');

    // NIK and Department are rendered as text in the UI card, not inputs
    await expect(page.getByText('EMP-70-001')).toBeVisible();
    await expect(page.getByText('Technology')).toBeVisible();
  });

  test('should allow employee to update self-service fields', async ({ page }) => {
    await page.goto(`${employeeUrl}/profile`);
    
    // Wait for the form to be interactive
    const phoneInput = page.locator('input[placeholder="+62..."]');
    await expect(phoneInput).toHaveValue('08123456789');

    // Update fields
    await phoneInput.fill('08999999999');
    
    const addressInput = page.locator('textarea');
    await addressInput.fill('Jl. Baru No. 1');

    const ptkpSelect = page.locator('select');
    await ptkpSelect.selectOption('K/2');

    // Submit changes using the Save Changes button
    const saveBtn = page.getByRole('button', { name: /Save Changes/i });
    await saveBtn.click();

    // Verify success toast/message
    await expect(page.getByText(/Profile updated successfully/i)).toBeVisible();
  });

  test('should allow document upload for KTP and face reference', async ({ page }) => {
    await page.goto(`${employeeUrl}/profile`);
    
    await expect(page.getByText('EMP-70-001')).toBeVisible();

    // Upload KTP image
    const ktpUploadTrigger = page.locator('label[for="ktp-upload"]');
    // We can set files directly on the input if we find its ID
    const ktpInput = page.locator('input#ktp-upload');
    
    // Create a dummy file buffer
    const buffer = Buffer.from('fake image data');
    
    // Upload files
    await ktpInput.setInputFiles({
      name: 'ktp.png',
      mimeType: 'image/png',
      buffer: buffer
    });

    // The component uploads automatically on change and shows a toast
    await expect(page.getByText(/Document uploaded successfully/i)).toBeVisible();
  });
});
