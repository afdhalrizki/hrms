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
    
    // Inject into sessionStorage so frontend JS knows which tenant to use
    // But ONLY if not overridden by a URL parameter or already set
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
