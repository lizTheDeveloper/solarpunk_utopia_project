/**
 * Example usage of Browse Community Needs feature
 * Demonstrates how to populate and use the browse needs functionality
 */

import { db } from '../core/database';
import { renderBrowseNeedsView } from './browse-needs';

/**
 * Populate database with example community needs
 */
export async function populateExampleNeeds() {
  console.log('Populating example community needs...');

  // Urgent needs
  await db.addNeed({
    userId: 'user-alice',
    description: 'Emergency: Need blankets and warm clothes for unhoused neighbor during cold snap',
    urgency: 'urgent',
    resourceType: 'other',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-bob',
    description: 'Urgent: Car broke down, need ride to work this week (7am-8am)',
    urgency: 'urgent',
    resourceType: 'other',
    fulfilled: false,
  });

  // Needed items
  await db.addNeed({
    userId: 'user-charlie',
    description: 'Need a ladder to clean gutters before the rain season starts',
    urgency: 'needed',
    resourceType: 'tool',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-diana',
    description: 'Looking for someone with carpentry skills to help build raised garden beds',
    urgency: 'needed',
    resourceType: 'skill',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-elena',
    description: 'Need childcare for Saturday afternoon (2-5pm) while I volunteer at food bank',
    urgency: 'needed',
    resourceType: 'time',
    fulfilled: false,
  });

  // Helpful items
  await db.addNeed({
    userId: 'user-frank',
    description: 'Would love to borrow a pressure washer to clean patio',
    urgency: 'helpful',
    resourceType: 'tool',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-grace',
    description: 'Looking for someone to teach me how to preserve/can vegetables',
    urgency: 'helpful',
    resourceType: 'skill',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-henry',
    description: 'Would appreciate help moving a couch upstairs',
    urgency: 'helpful',
    resourceType: 'time',
    fulfilled: false,
  });

  // Casual items
  await db.addNeed({
    userId: 'user-iris',
    description: 'Looking for board games to borrow for game night',
    urgency: 'casual',
    resourceType: 'other',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-jack',
    description: 'Would love to borrow camping gear for weekend trip next month',
    urgency: 'casual',
    resourceType: 'equipment',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-kate',
    description: 'Looking for book recommendations and anyone willing to share gardening books',
    urgency: 'casual',
    resourceType: 'other',
    fulfilled: false,
  });

  // Food needs
  await db.addNeed({
    userId: 'user-leo',
    description: 'Looking for fresh vegetables from community gardens',
    urgency: 'needed',
    resourceType: 'food',
    fulfilled: false,
  });

  await db.addNeed({
    userId: 'user-maya',
    description: 'Would love excess fruit from anyone\'s trees - making preserves!',
    urgency: 'helpful',
    resourceType: 'food',
    fulfilled: false,
  });

  // Fulfilled need (for testing filters)
  await db.addNeed({
    userId: 'user-nina',
    description: 'Needed a drill - already fulfilled by Omar!',
    urgency: 'needed',
    resourceType: 'tool',
    fulfilled: true,
  });

  console.log('Example community needs populated successfully!');
}

/**
 * Initialize the browse needs example
 */
export async function initBrowseNeedsExample() {
  // Initialize database
  await db.init();

  // Populate example needs
  await populateExampleNeeds();

  // Render the view
  renderBrowseNeedsView();

  console.log('Browse community needs example initialized!');
  console.log('Try filtering by urgency or resource type.');
  console.log('Click "I Can Help" on any need to see the response dialog.');
}

/**
 * Demo: Browse all needs
 */
export function demoBrowseAllNeeds() {
  const allNeeds = db.listNeeds();
  console.log(`\n=== All Community Needs (${allNeeds.length}) ===`);
  allNeeds.forEach(need => {
    const status = need.fulfilled ? '✓ FULFILLED' : '○ ACTIVE';
    console.log(`${status} [${need.urgency.toUpperCase()}] ${need.description}`);
  });
}

/**
 * Demo: Browse only urgent needs
 */
export function demoBrowseUrgentNeeds() {
  const urgentNeeds = db.listNeeds().filter(n => n.urgency === 'urgent' && !n.fulfilled);
  console.log(`\n=== Urgent Community Needs (${urgentNeeds.length}) ===`);
  urgentNeeds.forEach(need => {
    console.log(`🚨 ${need.description}`);
  });
}

/**
 * Demo: Browse needs by resource type
 */
export function demoBrowseNeedsByType(resourceType: string) {
  const needs = db.listNeeds().filter(n => n.resourceType === resourceType && !n.fulfilled);
  console.log(`\n=== ${resourceType.toUpperCase()} Needs (${needs.length}) ===`);
  needs.forEach(need => {
    const urgencyEmoji = {
      'urgent': '🚨',
      'needed': '⚠️',
      'helpful': '🤝',
      'casual': '💬'
    }[need.urgency] || '○';
    console.log(`${urgencyEmoji} ${need.description}`);
  });
}

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).browseNeedsDemo = {
    init: initBrowseNeedsExample,
    populate: populateExampleNeeds,
    browseAll: demoBrowseAllNeeds,
    browseUrgent: demoBrowseUrgentNeeds,
    browseByType: demoBrowseNeedsByType,
  };

  console.log('Browse Needs Demo loaded! Available commands:');
  console.log('  browseNeedsDemo.init() - Initialize with example data');
  console.log('  browseNeedsDemo.populate() - Populate example needs');
  console.log('  browseNeedsDemo.browseAll() - Show all needs');
  console.log('  browseNeedsDemo.browseUrgent() - Show urgent needs only');
  console.log('  browseNeedsDemo.browseByType("tool") - Show needs by type');
}
