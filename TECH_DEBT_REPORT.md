# Tech Debt Report - Solarpunk Utopia Platform

**Generated:** 2026-01-09
**Files Reviewed:** 92 TypeScript files (~21,000 lines)
**Test Files:** 20 test files (~7,700 lines)

---

## Executive Summary

The codebase shows solid architectural foundations with local-first design, proper separation of concerns, and security awareness. However, parallel agent development has introduced technical debt that needs attention. The most critical issues are:

1. **Incomplete implementations** marked with TODO comments
2. **Hardcoded user IDs** bypassing authentication
3. **Code duplication** between TypeScript and JavaScript implementations
4. **Inconsistent error handling** patterns
5. **Excessive `any` type usage** weakening type safety

---

## Critical Issues (Fix Immediately)

### 1. Hardcoded User IDs Bypassing Authentication

**Severity:** HIGH | **Files Affected:** 3

```
src/main.ts:386 - ownerId: 'user-1', // TODO: Real user ID from authentication
src/main.ts:433 - userId: 'user-1', // TODO: Real user ID
src/care/check-in.ts:308 - const userId = 'user-1'; // TODO: Get from auth
src/resources/browse-needs.ts:324 - const userId = 'user-1'; // TODO: Get from auth
```

**Risk:** All operations are attributed to a single fake user, breaking multi-user support and creating data integrity issues in production.

**Fix:** Implement proper user context from identity service.

---

### 2. Temporary/Insecure Encryption Implementation

**Severity:** HIGH | **Files Affected:** 1

```typescript
// src/crypto/keys.ts:133-160
// Temporary XOR encryption - TODO: Replace with XChaCha20-Poly1305
```

**Risk:** XOR encryption is trivially breakable. Data encrypted with this is NOT secure.

**Fix:** Implement proper XChaCha20-Poly1305 encryption using TweetNaCl or similar.

---

### 3. Identity Private Key Storage

**Severity:** HIGH | **Files Affected:** 1

```typescript
// src/identity/identity-service.ts:71
// TODO: This should be stored securely
```

**Risk:** Private keys may be stored insecurely in IndexedDB without encryption.

**Fix:** Encrypt private keys at rest using derived key from user passphrase.

---

## High Priority Issues (Fix Soon)

### 4. Database Method Doesn't Exist

**Severity:** HIGH | **Files Affected:** 1

```typescript
// src/identity/IdentityManager.ts:248
// TODO: Add deleteUserProfile method to database
```

**Risk:** User deletion functionality is broken.

---

### 5. Excessive `any` Type Usage

**Severity:** MEDIUM-HIGH | **Files Affected:** 43 | **Occurrences:** 117

Type safety is being bypassed in multiple places:

| File | `any` Count |
|------|-------------|
| `src/core/database.ts` | 13 |
| `src/resources/photo-upload.test.ts` | 8 |
| `src/utils/input-sanitization.test.ts` | 7 |
| `src/resources/need-response.test.ts` | 7 |
| `src/resources/need-posting-example.ts` | 6 |
| Multiple others... | 76 |

**Common Patterns:**
- Automerge workarounds: `(doc.checkIns[id] as any)[key]`
- Test mocks without proper typing
- Building objects dynamically to avoid undefined

**Fix:** Create proper type utilities for Automerge operations.

---

### 6. Code Duplication: Two Database Implementations

**Severity:** MEDIUM-HIGH | **Impact:** Maintenance burden

There are TWO separate database implementations:

1. **TypeScript (main):** `src/core/database.ts` - Uses Automerge CRDTs
2. **JavaScript (platform):** `platform/src/scripts/db.js` - Custom LWW CRDTs

Both implement similar functionality but with different APIs and sync strategies.

**Risk:** Bug fixes and features need to be applied to both. Inconsistent behavior between implementations.

**Fix:** Deprecate one implementation or create shared core.

---

### 7. Unimplemented Sync Status Tracking

**Severity:** MEDIUM | **Files Affected:** 1

```typescript
// src/core/database.ts:725-728
getSyncStatus(): SyncStatus {
  return {
    lastSyncTime: 0, // TODO: Track actual sync times
    pendingChanges: 0, // TODO: Track pending changes
    connectedPeers: 0, // TODO: Track peer connections
  };
}
```

**Risk:** Users have no visibility into sync state, can't tell if data is up-to-date.

---

### 8. Network Adapters Missing Real Implementation

**Severity:** MEDIUM | **Files Affected:** 3

```typescript
// src/network/peer.ts:68
// TODO: Implement actual peer discovery

// src/network/peer.ts:214-219
// TODO: Implement WebRTC connection

// src/network/dtn/DTNManager.ts:160
// TODO: Handle bundle contents
```

**Risk:** Mesh networking is partially stubbed, limiting offline-first capability.

---

## Medium Priority Issues

### 9. Console Logging Proliferation

**Severity:** MEDIUM | **Occurrences:** 649 across 44 files

Excessive `console.log/warn/error` calls throughout production code.

**Issues:**
- Performance impact on low-end devices
- No log levels or filtering
- Potential information leakage

**Fix:** Implement structured logging with configurable levels.

---

### 10. Missing Database Method for Attestation Verification

**Severity:** MEDIUM | **Files Affected:** 1

```typescript
// src/identity/identity-service.ts:293
// TODO: Look up issuer's public key from their DID
```

**Risk:** Attestation verification cannot validate issuer identity.

---

### 11. DTN Bundle Handling Incomplete

**Severity:** MEDIUM | **Files Affected:** 1

```typescript
// src/network/dtn/DTNManager.ts:82
source: 'self', // TODO: Use actual peer ID
```

**Risk:** DTN messages won't route correctly without proper source identification.

---

### 12. Binary Protocol Not Implemented

**Severity:** LOW-MEDIUM | **Files Affected:** 1

```typescript
// src/network/adapters/BluetoothAdapter.ts:281
// TODO: Use more efficient binary protocol (Protocol Buffers, MessagePack)
```

**Impact:** JSON serialization is inefficient for BLE's limited bandwidth.

---

## Low Priority / Improvement Opportunities

### 13. Anonymous Display Names

**Severity:** LOW | **Files Affected:** 2

```typescript
// src/network/SecureNetworkManager.ts:207
displayName: 'Anonymous', // TODO: Get from privacy settings

// src/network/NetworkManager.ts:235
displayName: 'Anonymous', // TODO: Get from user profile
```

**Impact:** All peers show as "Anonymous" in the UI.

---

### 14. Unimplemented Network Transports

**Severity:** LOW | **Files Affected:** 1

```typescript
// src/network/NetworkManager.ts:89
console.warn('WebSocket adapter not yet implemented');
```

**Impact:** Internet-based sync not available.

---

### 15. Care Circle AI Scheduling

**Severity:** LOW | **Files Affected:** 1

```typescript
// src/care/care-circles.ts:273
// TODO: In Phase 10, use AI to match skills, availability, and load balance
```

**Impact:** Manual scheduling only, no intelligent coordination.

---

## Test Coverage Gaps

### Files with No Tests

| Critical Module | Has Tests |
|-----------------|-----------|
| `src/network/NetworkManager.ts` | NO |
| `src/network/SecureNetworkManager.ts` | NO |
| `src/network/adapters/BluetoothAdapter.ts` | NO |
| `src/network/adapters/WiFiDirectAdapter.ts` | NO |
| `src/network/adapters/MeshtasticAdapter.ts` | NO |
| `src/network/dtn/DTNManager.ts` | NO |
| `src/sync/sync-engine.ts` | NO |
| `src/identity/did.ts` | NO |
| `src/identity/identity-service.ts` | NO |
| `src/crypto/keys.ts` | NO |
| `src/crypto/encryption.ts` | NO |

**Risk:** Core networking and cryptography code has no test coverage.

---

## Architectural Concerns

### 1. Global Singleton Pattern Overuse

Multiple modules export singletons that are difficult to test and mock:

```typescript
// src/core/database.ts:746
export const db = new LocalDatabase();

// src/identity/identity-service.ts
export const identityService: IdentityService = { ... };
```

**Fix:** Use dependency injection for better testability.

---

### 2. Mixed Rendering Approaches

Some modules return HTML strings directly:

```typescript
// src/care/check-in.ts:83
export function renderCheckInButtons(userId: string): string {
  return `<div class="check-in-container">...`;
}
```

While others use different patterns. Inconsistent UI architecture.

---

### 3. Error Handling Inconsistency

Some functions throw errors:
```typescript
throw new Error('No identity available');
```

Others return result objects:
```typescript
return { success: false, error: 'Resource not found' };
```

No consistent pattern across the codebase.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| TODO comments | 27 |
| FIXME comments | 0 |
| `any` type usages | 117 |
| `console.*` calls | 649 |
| Test files | 20 |
| Untested critical modules | 11 |
| Duplicate implementations | 2 (TS + JS database) |

---

## Recommended Prioritization

### Phase 1: Security Critical (1-2 sprints)
1. Replace XOR encryption with proper XChaCha20-Poly1305
2. Implement secure private key storage
3. Fix hardcoded user IDs with proper auth context

### Phase 2: Functionality Critical (2-3 sprints)
4. Add missing database methods
5. Implement sync status tracking
6. Complete network adapter implementations

### Phase 3: Quality Improvements (ongoing)
7. Reduce `any` type usage with proper typing
8. Add test coverage for networking and crypto
9. Consolidate duplicate implementations
10. Implement structured logging

---

## Notes for Future Agents

When working on this codebase:

1. **Check for existing TODOs** before implementing new features
2. **Prefer the TypeScript implementation** in `/src` over `/platform`
3. **Watch for Automerge quirks** - it doesn't support `undefined` values
4. **Test with mock database** - call `db.init()` in beforeEach
5. **Sanitize all user input** - use utilities from `src/utils/sanitize.ts`
