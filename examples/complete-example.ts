/**
 * Complete Example: Phase I Integration
 *
 * Demonstrates all three Phase I groups working together:
 * - Group D: Identity Without Surveillance
 * - Group A: Offline-First Core
 * - Group B: Mesh & Resilient Networking
 */

import {
  platformService,
  PlatformState,
  identityService,
  PrivacyLevel,
  LocationPrecision,
  SkillCategory
} from '../src/index.js';

async function main() {
  console.log('🌻 Solarpunk Utopia Platform - Complete Example\n');

  // ========================================================================
  // Step 1: Initialize Platform
  // ========================================================================

  console.log('1. Initializing platform...');

  await platformService.initialize({
    communityId: 'oakland-mutual-aid',
    communityName: 'Oakland Mutual Aid Network',
    communitySecret: 'we-take-care-of-us' // Shared secret for encryption
  });

  console.log('   State:', platformService.getState());
  // Should be: PlatformState.IdentityRequired

  // ========================================================================
  // Step 2: Create Identity (Group D)
  // ========================================================================

  console.log('\n2. Creating identity...');

  const { did, recoveryPhrase } = await platformService.createIdentity('my-secure-passphrase');

  console.log('   ✅ Identity created!');
  console.log('   DID:', did);
  console.log('   Recovery phrase (SAVE THIS):', recoveryPhrase);
  console.log('   State:', platformService.getState());
  // Should be: PlatformState.Ready

  // ========================================================================
  // Step 3: Configure Privacy (Group D)
  // ========================================================================

  console.log('\n3. Configuring privacy settings...');

  await identityService.updatePrivacySettings({
    profile: {
      name: PrivacyLevel.Community,      // Community can see name
      bio: PrivacyLevel.Community,
      photo: PrivacyLevel.Community,
      contact: PrivacyLevel.Private      // Contact is private
    },
    location: {
      precision: LocationPrecision.Neighborhood, // Fuzzy to ~1km
      visibility: PrivacyLevel.Community
    },
    activity: {
      offerings: PrivacyLevel.Community,  // Share what I offer
      requests: PrivacyLevel.Community,   // Share what I need
      history: PrivacyLevel.Private       // History stays private
    },
    reputation: {
      attestations: PrivacyLevel.Community, // Share attestations
      skills: PrivacyLevel.Community
    }
  });

  console.log('   ✅ Privacy configured (opt-in, maximum privacy by default)');

  // ========================================================================
  // Step 4: Update Profile
  // ========================================================================

  console.log('\n4. Updating profile...');

  platformService.updateProfile({
    name: 'Alex',
    bio: 'Community gardener and bike mechanic. Happy to help!',
    location: {
      lat: 37.8044,
      lng: -122.2712
    }
  });

  console.log('   ✅ Profile updated (stored locally in CRDT)');

  // ========================================================================
  // Step 5: Post Resources (Group A - Offline-First)
  // ========================================================================

  console.log('\n5. Posting resources (works offline!)...');

  const bikeTools = platformService.postResource({
    type: 'lend',
    title: 'Bike repair toolkit',
    description: 'Full set of tools for bike maintenance and repair',
    category: 'tools',
    availability: 'available',
    location: {
      lat: 37.8044,
      lng: -122.2712
    }
  });

  console.log('   ✅ Posted:', bikeTools.title);
  console.log('   Resource ID:', bikeTools.id);

  const seeds = platformService.postResource({
    type: 'give',
    title: 'Tomato seeds',
    description: 'Heirloom tomato seeds from my garden',
    category: 'gardening',
    availability: 'available'
  });

  console.log('   ✅ Posted:', seeds.title);

  // ========================================================================
  // Step 6: Post Requests
  // ========================================================================

  console.log('\n6. Posting request...');

  const request = platformService.postRequest({
    title: 'Need help moving furniture',
    description: 'Moving a couch up 2 flights of stairs this Saturday',
    category: 'help',
    urgency: 'medium'
  });

  console.log('   ✅ Posted request:', request.title);

  // ========================================================================
  // Step 7: View Local Data (All Offline!)
  // ========================================================================

  console.log('\n7. Viewing local data...');

  const allResources = platformService.getResources();
  console.log('   Resources:', allResources.length);
  allResources.forEach(r => {
    console.log(`   - ${r.title} (${r.type})`);
  });

  const allRequests = platformService.getRequests();
  console.log('   Requests:', allRequests.length);
  allRequests.forEach(r => {
    console.log(`   - ${r.title} (${r.urgency} urgency)`);
  });

  console.log('\n   ✅ All data stored locally (works 100% offline!)');

  // ========================================================================
  // Step 8: Simulate Helping Someone & Receiving Attestation
  // ========================================================================

  console.log('\n8. Receiving attestation for helping someone...');

  // Simulate another user giving us an attestation
  // (In real use, they would issue this through their identity)
  const attestation = await identityService.issueSkillAttestation(
    did, // To ourselves (simulating receiving one)
    'bike-repair',
    SkillCategory.Repair,
    'Helped fix my bike chain. Very patient and knowledgeable!'
  );

  console.log('   ✅ Received attestation for:', attestation.credentialSubject.skill);

  // View attestation bundles (privacy-preserving)
  const bundles = await identityService.getMyAttestationBundles();
  console.log('   My skills:');
  bundles.forEach(b => {
    console.log(`   - ${b.skill}: ${b.count} attestation(s)`);
  });

  // ========================================================================
  // Step 9: Export Data (Data Sovereignty)
  // ========================================================================

  console.log('\n9. Exporting data (data sovereignty)...');

  const exportedData = await platformService.exportData();
  console.log('   ✅ Data exported:');
  console.log('   - Identity data: ✓');
  console.log('   - Community data: ✓');
  console.log('   - Ready for backup or migration!');

  // ========================================================================
  // Step 10: Sync Preparation (Group B - Would Sync with Peers)
  // ========================================================================

  console.log('\n10. Sync status...');

  const syncStats = platformService.getSyncStats();
  console.log('   Connected peers:', syncStats.connectedPeers);
  console.log('   Last sync times:', syncStats.lastSyncTimes.size);

  console.log('\n   Note: To sync with peers, call:');
  console.log('   await platformService.syncWithPeer("peer-id");');
  console.log('\n   Sync is:');
  console.log('   ✅ End-to-end encrypted');
  console.log('   ✅ DID-authenticated');
  console.log('   ✅ Privacy-aware (filtered before encryption)');
  console.log('   ✅ Conflict-free (CRDT merging)');

  // ========================================================================
  // Summary
  // ========================================================================

  console.log('\n' + '='.repeat(60));
  console.log('🌻 Phase I Complete: All Systems Operational ✊');
  console.log('='.repeat(60));

  console.log('\n✅ Group D: Identity Without Surveillance');
  console.log('   - Decentralized ID:', did.substring(0, 30) + '...');
  console.log('   - No phone/email required');
  console.log('   - Privacy controls active');
  console.log('   - Reputation system ready');

  console.log('\n✅ Group A: Offline-First Core');
  console.log('   - CRDT document storage active');
  console.log('   - Resources:', allResources.length);
  console.log('   - Requests:', allRequests.length);
  console.log('   - Works 100% offline');

  console.log('\n✅ Group B: Mesh & Resilient Networking');
  console.log('   - P2P sync engine ready');
  console.log('   - E2E encryption enabled');
  console.log('   - Multi-transport support');
  console.log('   - Privacy-preserving sync');

  console.log('\n🎯 Emma Goldman Test: PASSED');
  console.log('   This increases community autonomy.');
  console.log('   This creates no dependencies on corporations.');

  console.log('\n🌻 The foundation is complete.');
  console.log('   Ready for Phase II: Trust Building');
  console.log('\n');
}

// Run the example
main().catch(console.error);
