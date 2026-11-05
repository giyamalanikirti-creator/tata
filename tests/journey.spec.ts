import { test, expect, type Page } from '@playwright/test';

const actAs = (page: Page, role: 'mitra' | 'lender' | 'installer' | 'verifier' | 'state') => page.getByLabel('Demo role').selectOption(role);
const action = (page: Page) => page.locator('.card.action');

test('Verify-to-Finance: assessment, sanction, tranche-gated installation, rework, subsidy and holdback', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Release money only against proven work');

  // Dhara Mitra files a Dhara Plan
  await page.getByRole('button', { name: 'New assessment' }).first().click();
  await page.getByRole('button', { name: /Sunita Devi/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /risk profile/ })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('.asset-card').filter({ hasText: 'Farm pond' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.waterfall')).toContainText('₹52,500');
  await page.getByLabel(/consents to share this plan/).check();
  await page.getByRole('button', { name: 'File with Tata Capital' }).click();
  await expect(page.locator('.case-head')).toContainText('DH-1043');

  // Lender sanctions
  await page.getByRole('button', { name: 'Act as Lender' }).click();
  for (const c of await action(page).getByRole('checkbox').all()) if (!(await c.isChecked())) await c.check();
  await page.getByRole('button', { name: 'Sanction loan' }).click();
  await expect(page.getByRole('status')).toContainText('Loan sanctioned');

  // Installer delivers
  await page.getByRole('button', { name: 'Act as Installer' }).click();
  await page.getByRole('button', { name: /Capture geotagged photo/ }).click();
  await page.getByLabel('What was delivered?').fill('Pond lining, inlet and silt trap delivered');
  await page.getByRole('button', { name: 'Submit for verification' }).click();

  // Verifier passes delivery: tranche 1 releases
  await page.getByRole('button', { name: 'Act as Field verifier' }).click();
  for (const c of await action(page).locator('.checks input').all()) await c.check();
  await page.getByRole('button', { name: 'Pass check' }).click();
  await expect(page.locator('.log')).toContainText('Tranche 1');

  // Installer commissions
  await page.getByRole('button', { name: 'Act as Installer' }).click();
  await page.getByRole('button', { name: /Capture geotagged photo/ }).click();
  await page.getByLabel('What was installed and tested?').fill('Pond excavated, lined and filled');
  await page.getByRole('button', { name: 'Submit for verification' }).click();

  // Field check fails first, installer reworks, then it passes
  await page.getByRole('button', { name: 'Act as Field verifier' }).click();
  await page.getByLabel('Verifier notes').fill('Lining torn at the inlet');
  await page.getByRole('button', { name: 'Not passed' }).click();
  await expect(page.locator('.case-head')).toContainText('Rework needed');
  await page.getByRole('button', { name: 'Act as Installer' }).click();
  await page.getByLabel('What did you fix?').fill('Patched and re-welded the lining at the inlet');
  await page.getByRole('button', { name: 'Resubmit for check' }).click();
  await page.getByRole('button', { name: 'Act as Field verifier' }).click();
  for (const c of await action(page).locator('.checks input').all()) await c.check();
  await page.getByRole('button', { name: 'Pass check' }).click();
  await expect(page.locator('.log')).toContainText('Tranche 2');

  // Subsidy and dry-spell check run in parallel
  await expect(page.getByRole('button', { name: 'Act as State department' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm in use' }).click();
  await expect(page.locator('.log')).toContainText('Holdback');
  await page.getByRole('button', { name: 'Act as State department' }).click();
  await page.getByRole('button', { name: 'Approve and release subsidy' }).click();
  await expect(page.locator('.case-head')).toContainText('Live · monitored');
  await expect(page.locator('.evidence')).toContainText('Asset added to Resilience Record');

  // Persists across reload and shows in the lender portfolio
  await page.reload();
  await actAs(page, 'lender');
  await page.getByRole('button', { name: 'Portfolio and impact' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'DH-1043' })).toContainText('Verified');
});

test('Resilience Record: verify, share on consent, lender access and revocation', async ({ page }) => {
  await page.goto('/#/case/RR-2021');
  await page.getByRole('button', { name: 'Act as Field verifier' }).click();
  for (const c of await action(page).locator('.checks input').all()) await c.check();
  await page.getByRole('button', { name: 'Pass check' }).click();
  await page.getByRole('button', { name: 'Confirm history' }).click();
  await expect(page.locator('.case-head')).toContainText('Record issued');

  // Lender cannot see it before consent
  await actAs(page, 'lender');
  await expect(page.getByRole('heading', { name: 'Not shared with Tata Capital' })).toBeVisible();

  await actAs(page, 'mitra');
  await page.getByRole('button', { name: 'Share on consent' }).click();
  await page.getByLabel(/confirmed consent by OTP/).check();
  await page.getByRole('button', { name: 'Confirm sharing' }).click();
  await expect(page.getByRole('status')).toContainText('Shared with Tata Capital');

  await actAs(page, 'lender');
  await page.getByRole('button', { name: 'Resilience Records' }).click();
  await page.locator('.record-card').filter({ hasText: 'Ramkali Ahirwar' }).filter({ hasText: 'built 2022' }).click();
  await expect(page.locator('.log')).toContainText('₹500 record fee');

  await actAs(page, 'mitra');
  await page.locator('.shares li').filter({ hasText: 'Tata Capital' }).getByRole('button', { name: 'Revoke' }).click();
  await page.getByRole('button', { name: 'Revoke access' }).click();
  await actAs(page, 'lender');
  await expect(page.getByRole('heading', { name: 'Not shared with Tata Capital' })).toBeVisible();
});

test('mobile layout, navigation and malformed storage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('dhara.v3', '{broken'));
  for (const hash of ['#/overview', '#/queue', '#/case/DH-1024', '#/assess', '#/thesis', '#/records']) {
    await page.goto('/' + hash);
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${hash}`).toBeLessThanOrEqual(0);
  }
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Investment case' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('₹207 crore');
});

test('farmer: sign up with OTP, AI farm check, file a plan the lender can see', async ({ page }) => {
  await page.goto('/#/farmer/home');
  await page.getByLabel('Mobile number').fill('9000012345');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByLabel('Enter OTP').fill('1111');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Enter OTP').fill('2468');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByLabel('Your name').fill('Kamla Devi');
  await page.getByRole('button', { name: 'Fetch from AgriStack' }).click();
  await expect(page.getByLabel('Village')).toHaveValue('Kulpahar');
  await page.getByRole('button', { name: 'Create my account' }).click();

  await page.getByRole('button', { name: 'Run AI farm check' }).click();
  await expect(page.getByRole('heading', { name: 'Recommended for your farm' })).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.fa-rec').first()).toContainText('Best fit');
  await page.getByRole('button', { name: /Continue with/ }).click();
  await expect(page.locator('.fa-explain')).toContainText('three parts');
  await page.getByLabel('Confirm with OTP').fill('2468');
  await page.getByRole('button', { name: 'Send to Tata Capital' }).click();
  await expect(page.getByRole('status')).toContainText('Plan sent to Tata Capital');
  await expect(page.locator('.fa-status')).toContainText('Your plan is with the lender');

  await page.getByLabel('Demo role').selectOption('lender');
  await expect(page.getByRole('row').filter({ hasText: 'Kamla Devi' })).toContainText('Sanction');
});

test('farmer: consent request, record sharing, Sahayak and Hindi', async ({ page }) => {
  await page.goto('/#/farmer/home');
  await page.getByRole('button', { name: /Pushpa Patel/ }).click();
  await page.getByLabel('Enter OTP').fill('2468');
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page.locator('.fa-req')).toContainText('Tata AIG (asset cover) wants to see your record');
  await page.locator('.fa-req').getByRole('button', { name: 'Allow' }).click();
  await page.getByLabel('Confirm with OTP').fill('2468');
  await page.getByRole('button', { name: 'Allow for 6 months' }).click();
  await page.locator('.fa-tabs').getByRole('button', { name: 'My record' }).click();
  await expect(page.locator('.fa-who')).toContainText('Tata AIG (asset cover)');
  await page.locator('.fa-who li').filter({ hasText: 'Tata AIG' }).getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.fa-who')).not.toContainText('Tata AIG');

  await page.locator('.fa-tabs').getByRole('button', { name: 'Sahayak AI' }).click();
  await page.getByRole('button', { name: 'What suits my farm?' }).click();
  await expect(page.locator('.fa-msg.ai').last()).toContainText('fits best');
  await page.getByLabel('Ask Sahayak').fill('Who can see my record?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.fa-msg.ai').last()).toContainText('Tata Capital');

  await page.getByRole('button', { name: 'हिं' }).click();
  await page.locator('.fa-tabs').getByRole('button', { name: 'होम' }).click();
  await expect(page.locator('.fa-hello h1')).toContainText('नमस्ते');
});

test('lender requests access to a private record', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Demo role').selectOption('lender');
  await page.goto('/#/case/DH-0987');
  await page.goto('/#/case/RR-2021');
  await expect(page.getByRole('heading', { name: 'Not shared with Tata Capital' })).toBeVisible();
  await page.getByRole('button', { name: 'Request access' }).click();
  await expect(page.locator('.card.locked')).toContainText('waiting for Ramkali');
});
