import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page, farmer = 'sunita') {
  await page.goto('/#/farmer');
  await page.getByLabel('Your farm').selectOption(farmer);
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
}

test('farm assistant updates recommendations, assesses budgets and monitors pending checks', async ({ page }) => {
  await login(page);
  const assistant = page.getByRole('region', { name: 'Farm assistant' });
  await expect(assistant).toContainText('Local guidance');
  await assistant.getByLabel('Your priority').selectOption('energy');
  await expect(assistant).toContainText('Start by assessing solar pump');
  await assistant.getByRole('button', { name: 'Recommend', exact: true }).click();
  await expect(assistant).toContainText('within your stated upfront budget');
  await assistant.getByRole('button', { name: 'Assess', exact: true }).click();
  await assistant.getByLabel('Upfront budget').fill('0');
  await expect(assistant).toContainText('exceeds your ₹0 budget');
  await assistant.getByLabel('Upfront budget').fill('-1');
  await expect(assistant.getByRole('alert')).toContainText('zero or more');
  await assistant.getByLabel('Upfront budget').fill('10000');
  await assistant.getByRole('button', { name: 'Monitor', exact: true }).click();
  await expect(assistant).toContainText('DH-1042: Sanction');
  await expect(assistant.getByRole('button', { name: 'Ask AI for guidance' })).toBeDisabled();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Your farm').selectOption('rajesh');
  await page.getByRole('button', { name: 'Log in to my farm' }).click();
  await assistant.getByRole('button', { name: 'Monitor', exact: true }).click();
  await expect(assistant).toContainText('Dry-spell use confirmation is pending');
  await expect(assistant).not.toContainText('DH-1042');
});

test('AI response is labelled and fallback preserves guidance on service failure', async ({ page }) => {
  let sent: any;
  await page.route('**/api/advisor', async route => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { source: 'ai', text: 'Assess water storage first and confirm runoff with a field visit.' } });
  });
  await login(page);
  const assistant = page.getByRole('region', { name: 'Farm assistant' });
  await assistant.getByLabel('Share farm size').check();
  await assistant.getByRole('button', { name: 'Ask AI for guidance' }).click();
  await expect(assistant).toContainText('AI guidance');
  await expect(assistant).toContainText('confirm runoff with a field visit');
  expect(JSON.stringify(sent)).not.toContain('Sunita');
  expect(JSON.stringify(sent)).not.toContain('UP-09');
  await assistant.getByLabel('Your priority').selectOption('budget');
  await expect(assistant).toContainText('Local guidance');
  await page.route('**/api/advisor', route => route.fulfill({ status: 503, json: { error: 'not configured' } }));
  await assistant.getByRole('button', { name: 'Ask AI for guidance' }).click();
  await expect(assistant.getByRole('status')).toContainText('AI is unavailable');
  await expect(assistant).toContainText('Start by assessing');
});
