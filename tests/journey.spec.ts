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
  await page.addInitScript(() => localStorage.setItem('dhara.v2', '{broken'));
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
