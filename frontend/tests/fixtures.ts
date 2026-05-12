import { test as base } from '@playwright/test';

export const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: -6.2088, longitude: 106.8456 },
    });
    await use(context);
    await context.close();
  },
  page: async ({ page }, use, testInfo) => {
    const workerIndex = testInfo.workerIndex;
    const tenant = workerIndex === 0 ? 'company1' : `worker_${workerIndex}`;
    
    // Global API response monitoring
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/') && res.status() >= 400) {
        const method = res.request().method();
        let body = '';
        try {
          body = await res.text();
        } catch (e) {
          body = '<failed to read body>';
        }
        console.error(`[API ERROR] ${method} ${url} -> ${res.status()} - BODY: ${body}`);
      }
    });

    // Inject into sessionStorage so frontend JS knows which tenant to use
    await page.addInitScript((t) => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('test_tenant') && !window.sessionStorage.getItem('test_tenant_e2e')) {
          window.sessionStorage.setItem('test_tenant_e2e', t);
        }
      } catch (e) {
        // Silently ignore if sessionStorage is not accessible yet
      }
    }, tenant);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
