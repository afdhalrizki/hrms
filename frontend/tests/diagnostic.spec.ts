import { test, expect } from '@playwright/test';
const fs = require('fs');

test('diagnostic: check performance page state with fs logs', async ({ page, context }) => {
  const managerUrl = 'http://company1.localhost:3000';
  const logFile = 'browser-diagnostic.log';
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  
  page.on('console', msg => {
    fs.appendFileSync(logFile, `BROWSER LOG: ${msg.text()}\n`);
  });
  
  page.on('request', request => {
    fs.appendFileSync(logFile, `REQUEST: ${request.method()} ${request.url()}\n`);
  });

  page.on('response', async response => {
    fs.appendFileSync(logFile, `RESPONSE: ${response.status()} ${response.url()}\n`);
    const headers = await response.headersArray();
    const setCookies = headers.filter(h => h.name.toLowerCase() === 'set-cookie');
    if (setCookies.length > 0) {
      setCookies.forEach(h => {
        fs.appendFileSync(logFile, `SET-COOKIE: ${h.value}\n`);
      });
    } else {
      fs.appendFileSync(logFile, `SET-COOKIE: [NOT FOUND]\n`);
    }
    fs.appendFileSync(logFile, `FULL HEADERS: ${JSON.stringify(headers)}\n`);
  });

  page.on('requestfailed', request => {
    fs.appendFileSync(logFile, `REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}\n`);
  });

  await page.goto(`${managerUrl}/login`);
  await page.locator('input[type="email"]').fill('manager1@company1.net');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  
  // Wait a bit for navigation and cookies to settle
  await page.waitForTimeout(2000);
  const cookies = await context.cookies();
  fs.appendFileSync(logFile, `COOKIES AFTER LOGIN: ${JSON.stringify(cookies)}\n`);
  
  await page.waitForTimeout(3000);
  await page.goto(`${managerUrl}/performance`);
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'diagnostic-performance-v2.png' });
});
