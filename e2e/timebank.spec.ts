import { test, expect } from '@playwright/test';

test.describe('Time Bank Features', () => {
  test('should show skills tab', async ({ page }) => {
    await page.goto('/');

    // Click on Skills tab
    await page.click('button[data-view="skills"]');

    // Should show the skills view
    await expect(page.locator('#skills-view')).toHaveClass(/active/);
    await expect(page.locator('#skills-view h2')).toContainText('Skills & Time Bank');
  });

  test('should allow offering multiple skills', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Add first skill
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Gardening');
    await page.fill('#skill-description', 'I can help with urban gardening');
    await page.fill('#skill-categories', 'agriculture, food, sustainability');
    await page.click('button[type="submit"]');

    // Add second skill
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Bike Repair');
    await page.fill('#skill-description', 'I can fix most bikes');
    await page.fill('#skill-categories', 'repair, transportation');
    await page.click('button[type="submit"]');

    // Verify both skills appear
    await expect(page.locator('#skills-list')).toContainText('Gardening');
    await expect(page.locator('#skills-list')).toContainText('Bike Repair');
  });

  test('should show skill categories', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Add a skill with categories
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Carpentry');
    await page.fill('#skill-description', 'Building and repairs');
    await page.fill('#skill-categories', 'building, repair, crafts');
    await page.click('button[type="submit"]');

    // Check that categories appear as badges
    await expect(page.locator('#skills-list .badge')).toContainText('building');
    await expect(page.locator('#skills-list .badge')).toContainText('repair');
    await expect(page.locator('#skills-list .badge')).toContainText('crafts');
  });

  test('should handle skills with no categories', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Add a skill without categories
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Listening');
    await page.fill('#skill-description', 'I can provide emotional support');
    await page.fill('#skill-categories', '');
    await page.click('button[type="submit"]');

    // Verify skill appears
    await expect(page.locator('#skills-list')).toContainText('Listening');
  });

  test('should show availability status', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Add a skill
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Cooking');
    await page.fill('#skill-description', 'I can teach cooking');
    await page.fill('#skill-categories', 'food, teaching');
    await page.click('button[type="submit"]');

    // Should show as available by default
    await expect(page.locator('#skills-list')).toContainText('✓ Available');
  });

  test('should persist skills across sessions', async ({ page }) => {
    await page.goto('/');

    // Navigate to skills
    await page.click('button[data-view="skills"]');

    // Add a skill
    await page.click('#add-skill-btn');
    await page.fill('#skill-name', 'Meditation');
    await page.fill('#skill-description', 'Mindfulness practice');
    await page.fill('#skill-categories', 'wellness, teaching');
    await page.click('button[type="submit"]');

    // Reload the page
    await page.reload();

    // Navigate back to skills
    await page.click('button[data-view="skills"]');

    // Skill should still be there
    await expect(page.locator('#skills-list')).toContainText('Meditation');
  });
});

test.describe('Community Care Features', () => {
  test('should show care tab by default', async ({ page }) => {
    await page.goto('/');

    // Care should be the default active tab
    await expect(page.locator('.tab.active')).toHaveAttribute('data-view', 'care');
    await expect(page.locator('#care-view')).toHaveClass(/active/);
  });

  test('should display care view content', async ({ page }) => {
    await page.goto('/');

    // Check that care content exists
    await expect(page.locator('#care-view')).toBeVisible();
    await expect(page.locator('#care-content')).toBeVisible();
  });
});

test.describe('Resource Sharing Features', () => {
  test('should categorize resources by type', async ({ page }) => {
    await page.goto('/');

    // Navigate to resources
    await page.click('button[data-view="resources"]');

    // Add different types of resources
    const resourceTypes = [
      { name: 'Hammer', type: 'tool', mode: 'lend' },
      { name: 'Workshop Space', type: 'space', mode: 'share' },
      { name: 'Excess Produce', type: 'food', mode: 'give' }
    ];

    for (const resource of resourceTypes) {
      await page.click('#add-resource-btn');
      await page.fill('#resource-name', resource.name);
      await page.fill('#resource-description', `${resource.name} for community use`);
      await page.selectOption('#resource-type', resource.type);
      await page.selectOption('#resource-mode', resource.mode);
      await page.click('button[type="submit"]');
    }

    // Verify all resources appear with correct badges
    await expect(page.locator('#resources-list')).toContainText('Hammer');
    await expect(page.locator('#resources-list')).toContainText('Workshop Space');
    await expect(page.locator('#resources-list')).toContainText('Excess Produce');
  });

  test('should show share modes correctly', async ({ page }) => {
    await page.goto('/');

    // Navigate to resources
    await page.click('button[data-view="resources"]');

    // Add resource with 'give' mode
    await page.click('#add-resource-btn');
    await page.fill('#resource-name', 'Gift Item');
    await page.fill('#resource-description', 'This is a gift');
    await page.selectOption('#resource-type', 'other');
    await page.selectOption('#resource-mode', 'give');
    await page.click('button[type="submit"]');

    // Should show the share mode badge
    await expect(page.locator('#resources-list .badge')).toContainText('give');
  });
});

test.describe('Needs Posting Features', () => {
  test('should show urgency levels', async ({ page }) => {
    await page.goto('/');

    // Navigate to needs
    await page.click('button[data-view="needs"]');

    // Add needs with different urgency levels
    const urgencyLevels = ['casual', 'helpful', 'needed', 'urgent'];

    for (const urgency of urgencyLevels) {
      await page.click('#add-need-btn');
      await page.fill('#need-description', `Need with ${urgency} urgency`);
      await page.selectOption('#need-urgency', urgency);
      await page.click('button[type="submit"]');
    }

    // Verify all urgency levels appear
    await expect(page.locator('#needs-list')).toContainText('casual');
    await expect(page.locator('#needs-list')).toContainText('helpful');
    await expect(page.locator('#needs-list')).toContainText('needed');
    await expect(page.locator('#needs-list')).toContainText('urgent');
  });

  test('should show unfulfilled needs', async ({ page }) => {
    await page.goto('/');

    // Navigate to needs
    await page.click('button[data-view="needs"]');

    // Add a need
    await page.click('#add-need-btn');
    await page.fill('#need-description', 'Test need');
    await page.selectOption('#need-urgency', 'helpful');
    await page.click('button[type="submit"]');

    // Should show as open
    await expect(page.locator('#needs-list')).toContainText('⏳ Open');
  });
});
