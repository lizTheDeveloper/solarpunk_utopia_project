import { test, expect } from '@playwright/test';

test.describe('Solarpunk Utopia Platform', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Solarpunk Utopia');

    // Check for the offline/online status indicator
    await expect(page.locator('#sync-indicator')).toBeVisible();

    // Check that the Care tab is active by default
    await expect(page.locator('.tab.active')).toHaveAttribute('data-view', 'care');
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/');

    // Click on Resources tab
    await page.click('button[data-view="resources"]');
    await expect(page.locator('#resources-view')).toHaveClass(/active/);

    // Click on Skills tab
    await page.click('button[data-view="skills"]');
    await expect(page.locator('#skills-view')).toHaveClass(/active/);

    // Click on Community tab
    await page.click('button[data-view="community"]');
    await expect(page.locator('#community-view')).toHaveClass(/active/);
  });

  test('should show empty state for resources', async ({ page }) => {
    await page.goto('/');

    // Navigate to resources
    await page.click('button[data-view="resources"]');

    // Should show empty state initially
    await expect(page.locator('#resources-list .empty-state')).toContainText('No resources yet');
  });

  test('should add a new resource', async ({ page }) => {
    await page.goto('/');

    // Navigate to resources
    await page.click('button[data-view="resources"]');

    // Click add resource button
    await page.click('#add-resource-btn');

    // Wait for modal to appear
    await expect(page.locator('#modal')).toHaveClass(/active/);

    // Fill in the form
    await page.fill('#resource-name', 'Test Tool');
    await page.fill('#resource-description', 'A test tool for testing');
    await page.selectOption('#resource-type', 'tool');
    await page.selectOption('#resource-mode', 'lend');
    await page.fill('#resource-location', 'Test Location');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for modal to close
    await expect(page.locator('#modal')).not.toHaveClass(/active/);

    // Check that the resource appears in the list
    await expect(page.locator('#resources-list')).toContainText('Test Tool');
    await expect(page.locator('#resources-list')).toContainText('A test tool for testing');
  });

  test('should add a new need', async ({ page }) => {
    await page.goto('/');

    // Navigate to needs
    await page.click('button[data-view="needs"]');

    // Click add need button
    await page.click('#add-need-btn');

    // Wait for modal
    await expect(page.locator('#modal')).toHaveClass(/active/);

    // Fill in the form
    await page.fill('#need-description', 'Need help with testing');
    await page.selectOption('#need-urgency', 'helpful');

    // Submit
    await page.click('button[type="submit"]');

    // Verify the need appears
    await expect(page.locator('#needs-list')).toContainText('Need help with testing');
  });

  test('should add a new skill', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Click add skill button
    await page.click('#add-skill-btn');

    // Wait for modal
    await expect(page.locator('#modal')).toHaveClass(/active/);

    // Fill in the form
    await page.fill('#skill-name', 'Testing');
    await page.fill('#skill-description', 'I can help test your code');
    await page.fill('#skill-categories', 'software, quality-assurance');

    // Submit
    await page.click('button[type="submit"]');

    // Verify the skill appears
    await expect(page.locator('#skills-list')).toContainText('Testing');
    await expect(page.locator('#skills-list')).toContainText('I can help test your code');
  });

  test('should display community information', async ({ page }) => {
    await page.goto('/');

    // Navigate to community
    await page.click('button[data-view="community"]');

    // Check for community info
    await expect(page.locator('#community-info')).toContainText('Members:');
    await expect(page.locator('#community-info')).toContainText('Sync Status');
  });

  test('should show export buttons', async ({ page }) => {
    await page.goto('/');

    // Navigate to community
    await page.click('button[data-view="community"]');

    // Check for export buttons
    await expect(page.locator('#export-json-btn')).toBeVisible();
    await expect(page.locator('#export-csv-btn')).toBeVisible();
    await expect(page.locator('#export-binary-btn')).toBeVisible();
  });

  test('should persist data across page reloads', async ({ page }) => {
    await page.goto('/');

    // Add a resource
    await page.click('button[data-view="resources"]');
    await page.click('#add-resource-btn');
    await page.fill('#resource-name', 'Persistent Tool');
    await page.fill('#resource-description', 'This should persist');
    await page.selectOption('#resource-type', 'tool');
    await page.selectOption('#resource-mode', 'share');
    await page.click('button[type="submit"]');

    // Reload the page
    await page.reload();

    // Navigate back to resources
    await page.click('button[data-view="resources"]');

    // Check that the resource is still there
    await expect(page.locator('#resources-list')).toContainText('Persistent Tool');
  });
});
