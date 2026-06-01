import { chromium } from '@playwright/test';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));
  page.on('request', req => {
    console.log(`REQ: ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    console.log(`RES: ${res.status()} ${res.url()}`);
  });

  console.log('Navigating to login page...');
  await page.goto('http://127.0.0.1:3001/en/login?test_tenant=company1');
  await page.waitForTimeout(5000);

  console.log(`Current URL: ${page.url()}`);

  const forgotPasswordLink = page.locator('a, button').filter({ hasText: /Lupa kata sandi\?|Forgot password\?/i });
  console.log(`Link visible: ${await forgotPasswordLink.isVisible()}`);
  if (await forgotPasswordLink.isVisible()) {
    const html = await forgotPasswordLink.evaluate(el => el.outerHTML);
    console.log(`Element HTML: ${html}`);
  }
  
  console.log('Clicking link...');
  await forgotPasswordLink.click();
  
  console.log('Waiting for navigation/redirect...');
  await page.waitForTimeout(10000);
  console.log(`URL after click: ${page.url()}`);
  
  await browser.close();
}

run().catch(console.error);

