import { test, expect } from '@playwright/test';

test('farmer demo login validates identity, scopes records, persists on reload and signs out', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Farmer login', exact: true }).click();
  await page.getByLabel('Demo Farmer ID').fill('unknown');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('alert')).toContainText('valid demo Farmer ID');
  await page.getByLabel('Sample farmer').selectOption('UP-09-6115-4402');
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
  await page.getByLabel('Sample farmer').selectOption('UP-09-4471-2286');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sunita Devi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for RR-2021' })).toHaveCount(0);
});

test('farmer login and dashboard fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/farmer');
  await page.getByLabel('Sample farmer').selectOption('UP-09-4471-2286');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sunita Devi' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
