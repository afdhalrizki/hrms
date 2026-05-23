import { test, expect } from './fixtures';
import { BASE_URL } from './test_helper';

test.describe('Premium Light Olive Green Theme Validation', () => {
  test('should render the pages with premium light olive green color scheme', async ({ page }) => {
    // Navigate to a public page (e.g. login)
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Evaluate computed styles of the body
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });

    console.log('Computed body styles:', bodyStyles);

    // Verify background color is the soothing light olive green: rgb(243, 246, 240) which corresponds to #f3f6f0
    expect(bodyStyles.backgroundColor).toBe('rgb(243, 246, 240)');

    // Verify foreground color is the deep olive-charcoal: rgb(44, 53, 31) which corresponds to #2c351f
    expect(bodyStyles.color).toBe('rgb(44, 53, 31)');

    // Verify it is not the old dark theme background (#09090b or black)
    expect(bodyStyles.backgroundColor).not.toBe('rgb(9, 9, 11)');
    expect(bodyStyles.backgroundColor).not.toBe('rgb(0, 0, 0)');
  });
});
