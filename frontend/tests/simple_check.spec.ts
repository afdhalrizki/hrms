import { test, expect } from '@playwright/test';

test('Direct Redirection Check', async ({ page }) => {
  // Use a direct URL on localhost
  const url = 'http://127.0.0.1:3001/en/profile';
  
  console.log('Navigating directly to:', url);
  
  // Clear storage
  await page.goto('http://127.0.0.1:3001/en/login');
  await page.evaluate(() => localStorage.clear());
  
  // Go to private route
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Expect redirect to login within 5 seconds (my 3s timeout + some buffer)
  console.log('Waiting for redirect...');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  
  console.log('Redirect successful!');
});
