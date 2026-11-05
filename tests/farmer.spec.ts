import { test, expect } from '@playwright/test';

test('farmer login validates identity, scopes records, persists on reload and signs out', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Farmer login', exact: true }).click();
  await expect(page.getByLabel('Farmer ID')).toHaveCount(0);
  await page.getByLabel('Your farm').selectOption('ramkali');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Ramkali Ahirwar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for RR-2021' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for DH-0987' })).toBeVisible();
  await expect(page.getByText('DH-1042', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'View progress for DH-0987' }).click();
  await expect(page.getByRole('heading', { name: 'Progress history' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Ramkali Ahirwar' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Farmer login' })).toBeVisible();
  await page.getByLabel('Your farm').selectOption('sunita');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sunita Devi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for RR-2021' })).toHaveCount(0);
});

test('farmer login and dashboard fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/farmer');
  await page.getByLabel('Your farm').selectOption('sunita');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sunita Devi' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('farmer applies for infrastructure and requests record verification in the shared workflow', async ({ page }) => {
  await page.goto('/#/farmer');
  await page.getByLabel('Your farm').selectOption('sunita');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await page.getByRole('button', { name: 'Apply for infrastructure' }).click();
  await page.getByLabel('Acres to cover').fill('3');
  await page.getByRole('button', { name: 'Review request' }).click();
  await expect(page.getByRole('button', { name: 'Submit finance application' })).toHaveCount(0);
  await page.getByLabel('Acres to cover').fill('2');
  await page.getByRole('button', { name: 'Review request' }).click();
  await expect(page.getByText('₹1,05,000', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit finance application' })).toBeDisabled();
  await page.getByLabel('I consent to share my farm profile').check();
  await page.getByRole('button', { name: 'Submit finance application' }).click();
  await expect(page.getByRole('status')).toContainText('DH-1043');
  await expect(page.getByRole('button', { name: 'View progress for DH-1043' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'View progress for DH-1043' })).toBeVisible();
  await page.getByRole('button', { name: 'Request record verification', exact: true }).click();
  await page.getByRole('button', { name: /Farm pond/ }).click();
  await page.getByLabel('Year built').fill('2023');
  await page.getByRole('button', { name: 'Review request' }).click();
  await page.getByLabel('I consent to a field visit').check();
  await page.getByRole('button', { name: 'Submit verification request' }).click();
  await expect(page.getByRole('status')).toContainText('RR-2022');
  await expect(page.getByRole('button', { name: 'View progress for RR-2022' })).toBeVisible();
  // Partner queues consume the same case state and can process both requests.
  await page.goto('/#/case/DH-1043');
  await page.getByLabel('Demo role').selectOption('lender');
  await expect(page.getByRole('button', { name: 'Sanction loan' })).toBeVisible();
  await page.goto('/#/case/RR-2022');
  await page.getByLabel('Demo role').selectOption('verifier');
  await expect(page.getByRole('button', { name: 'Pass check' })).toBeVisible();
});

test('financial support request can be cancelled without creating an application', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/farmer');
  await page.getByLabel('Your farm').selectOption('sunita');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await page.getByRole('button', { name: 'Request financial support', exact: true }).click();
  await page.getByRole('button', { name: /Solar pump/ }).click();
  await page.getByRole('button', { name: 'Review request' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await expect(page.getByRole('button', { name: 'View progress for DH-1043' })).toHaveCount(0);
});
