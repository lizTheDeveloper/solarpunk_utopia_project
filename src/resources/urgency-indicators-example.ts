/**
 * Urgency Indicators - Example Usage
 *
 * Phase 2, Group C: Open Requests & Needs - Urgency indicators
 *
 * This example demonstrates how to use the urgency indicator system
 * for browsing and displaying community needs with clear visual
 * urgency levels.
 *
 * Following solarpunk values:
 * - Empathetic communication of needs
 * - Non-transactional mutual aid
 * - Accessible design
 * - Community care
 */

import { LocalDatabase } from '../core/database';
import { NeedBrowser } from './need-browser';
import { NeedBrowserUI } from './need-browser-ui';
import { NeedPosting } from './need-posting';
import type { UrgencyLevel } from '../types';

/**
 * Example 1: Browse needs with urgency filtering
 */
export async function exampleBrowseByUrgency() {
  const db = new LocalDatabase();
  const browser = new NeedBrowser(db);

  // Get all urgent needs
  const urgentNeeds = await browser.getNeedsByUrgency('urgent');
  console.log(`Found ${urgentNeeds.length} urgent needs`);

  // Get high-priority needs (urgent + needed)
  const highPriority = await browser.getHighPriorityNeeds();
  console.log(`Found ${highPriority.length} high-priority needs`);

  // Browse all needs sorted by urgency
  const allNeeds = await browser.browseNeeds({
    unfulfilledOnly: true,
    sortByUrgency: true
  });

  console.log('All needs sorted by urgency:');
  allNeeds.forEach(result => {
    const icon = browser.getUrgencyIcon(result.need.urgency);
    console.log(`${icon} [${result.need.urgency}] ${result.need.description}`);
  });
}

/**
 * Example 2: Post needs with different urgency levels
 */
export async function examplePostNeedsWithUrgency() {
  const db = new LocalDatabase();
  const needPosting = new NeedPosting(db);

  // Casual request
  await needPosting.postNeed({
    description: 'Looking for a book on urban gardening if anyone has one to lend',
    urgency: 'casual',
    resourceType: 'other'
  }, { userId: 'user-123' });

  // Helpful request
  await needPosting.postNeed({
    description: 'Could use some help moving furniture this weekend',
    urgency: 'helpful',
    resourceType: 'time'
  }, { userId: 'user-123' });

  // Needed request
  await needPosting.postNeed({
    description: 'Need a drill for home repairs by Friday',
    urgency: 'needed',
    resourceType: 'tool'
  }, { userId: 'user-456' });

  // Urgent request
  await needPosting.postNeed({
    description: 'Urgent: Need food for family tonight, pantry is empty',
    urgency: 'urgent',
    resourceType: 'food'
  }, { userId: 'user-789' });

  console.log('Posted needs with various urgency levels');
}

/**
 * Example 3: Display urgency information
 */
export async function exampleDisplayUrgencyInfo() {
  const db = new LocalDatabase();
  const browser = new NeedBrowser(db);

  const urgencyLevels: UrgencyLevel[] = ['casual', 'helpful', 'needed', 'urgent'];

  console.log('\nUrgency Level Guide:');
  console.log('===================');

  urgencyLevels.forEach(urgency => {
    const icon = browser.getUrgencyIcon(urgency);
    const description = browser.getUrgencyDescription(urgency);
    const colorClass = browser.getUrgencyColorClass(urgency);

    console.log(`\n${icon} ${urgency.toUpperCase()}`);
    console.log(`   Description: ${description}`);
    console.log(`   CSS Class: ${colorClass}`);
  });
}

/**
 * Example 4: Initialize the UI component
 */
export async function exampleInitializeUI() {
  const db = new LocalDatabase();

  // Create the browser UI
  const browserUI = new NeedBrowserUI(db, {
    containerId: 'need-browser-container',
    showFilters: true,
    onNeedClick: (need) => {
      console.log('Need clicked:', need.description);
    },
    onRespondClick: (need) => {
      console.log('User wants to help with:', need.description);
      // Here you would implement the response/coordination logic
    }
  });

  // Render the UI
  await browserUI.render();

  console.log('Need browser UI initialized');
}

/**
 * Example 5: Filter needs by urgency in UI
 */
export async function exampleFilterByUrgency() {
  const db = new LocalDatabase();
  const browserUI = new NeedBrowserUI(db, {
    containerId: 'need-browser-container',
    showFilters: true
  });

  await browserUI.render();

  // Show only urgent needs
  await browserUI.updateFilter({
    urgency: 'urgent',
    unfulfilledOnly: true
  });

  console.log('Filtered to show only urgent needs');
}

/**
 * Example 6: Understanding relevance scoring
 */
export async function exampleRelevanceScoring() {
  const db = new LocalDatabase();
  const browser = new NeedBrowser(db);

  const results = await browser.browseNeeds({
    unfulfilledOnly: true,
    sortByUrgency: true
  });

  console.log('\nNeeds with Relevance Scores:');
  console.log('============================');

  results.forEach(result => {
    const icon = browser.getUrgencyIcon(result.need.urgency);
    console.log(`\n${icon} [Score: ${result.relevanceScore}]`);
    console.log(`   Urgency: ${result.need.urgency}`);
    console.log(`   ${result.need.description.substring(0, 60)}...`);
  });
}

/**
 * Example HTML setup for the need browser
 */
export function getExampleHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Needs - Urgency Indicators</title>
  <link rel="stylesheet" href="./need-browser-ui.css">
</head>
<body>
  <div id="need-browser-container">
    <!-- The NeedBrowserUI component will render here -->
  </div>

  <script type="module">
    import { LocalDatabase } from '../core/database';
    import { NeedBrowserUI } from './need-browser-ui';

    // Initialize database
    const db = new LocalDatabase();

    // Create and render the need browser
    const browserUI = new NeedBrowserUI(db, {
      containerId: 'need-browser-container',
      showFilters: true,
      onNeedClick: (need) => {
        console.log('Viewing need:', need);
      },
      onRespondClick: (need) => {
        console.log('Responding to need:', need);
        alert(\`Thank you for wanting to help! We'll connect you with the person who posted this need.\`);
      }
    });

    browserUI.render();
  </script>
</body>
</html>
  `;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=================================');
  console.log('URGENCY INDICATORS EXAMPLES');
  console.log('=================================\n');

  await examplePostNeedsWithUrgency();
  await exampleDisplayUrgencyInfo();
  await exampleBrowseByUrgency();
  await exampleRelevanceScoring();

  console.log('\n=================================');
  console.log('Examples complete!');
  console.log('=================================');
}
