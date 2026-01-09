# Agent Code Review Checklist

Use this checklist after completing a coding task to ensure code quality, robustness, performance, and security.

---

## How to Use This Checklist

After solving the problem and getting your code working:

1. **Run through each section** below relevant to your changes
2. **Check off items** as you verify or fix them
3. **Document any exceptions** with justification
4. **Run tests** before considering the task complete

---

## 1. Type Safety

- [ ] **No `any` types without justification** - Use proper types or create new interfaces
- [ ] **Null/undefined handled** - Use optional chaining (`?.`) or null checks
- [ ] **Function return types explicit** - Don't rely on inference for public APIs
- [ ] **Generic types used where appropriate** - Avoid type assertions like `as Type`

```typescript
// Bad
function getData(id: any): any { ... }

// Good
function getData(id: string): Resource | undefined { ... }
```

---

## 2. Error Handling

- [ ] **All async operations have try/catch** or `.catch()` handlers
- [ ] **Errors include context** - Not just "Error occurred" but what and where
- [ ] **Errors propagate appropriately** - Don't swallow errors silently
- [ ] **User-facing errors are friendly** - Technical details in logs, helpful messages to users
- [ ] **Consistent error pattern** - Either throw or return `{success, error}`, not both

```typescript
// Bad
try { ... } catch (e) { console.log(e); }

// Good
try { ... } catch (error) {
  console.error(`Failed to save resource ${id}:`, error);
  throw new Error(`Could not save resource: ${error.message}`);
}
```

---

## 3. Security

### Input Validation
- [ ] **All user input sanitized** - Use `sanitizeUserContent()` for display
- [ ] **IDs validated** - Use `requireValidIdentifier()` or `validateIdentifier()`
- [ ] **No raw HTML injection** - Never use `innerHTML` with user content without sanitization

### Data Protection
- [ ] **No secrets in code** - No API keys, passwords, or private keys in source
- [ ] **Sensitive data not logged** - Don't log passwords, keys, or PII
- [ ] **Authorization checked** - Verify user can perform action on resource

### Common Vulnerabilities
- [ ] **No SQL/NoSQL injection** - Use parameterized queries
- [ ] **No command injection** - Don't pass user input to shell commands
- [ ] **No path traversal** - Validate file paths don't contain `..`

```typescript
// Bad
container.innerHTML = `<div>${userMessage}</div>`;

// Good
import { sanitizeUserContent } from '../utils/sanitize';
container.innerHTML = `<div>${sanitizeUserContent(userMessage)}</div>`;
```

---

## 4. Performance

- [ ] **No unnecessary re-renders** - Memoize expensive computations
- [ ] **Database queries efficient** - Use indexes, avoid scanning all records
- [ ] **Large lists paginated** - Don't load 10,000 items into memory
- [ ] **Event listeners cleaned up** - Remove listeners when components unmount
- [ ] **No memory leaks** - Clear intervals, cancel subscriptions

```typescript
// Bad - loads all resources then filters
const resources = db.listResources();
const mine = resources.filter(r => r.ownerId === userId);

// Better - use targeted query if available
const mine = db.getResourcesByOwner(userId);
```

---

## 5. Code Quality

### Readability
- [ ] **Functions are small** - Single responsibility, <30 lines preferred
- [ ] **Names are descriptive** - `getUserCareCircle` not `getUCC`
- [ ] **No magic numbers** - Use named constants
- [ ] **Complex logic has comments** - Explain *why*, not *what*

### Maintainability
- [ ] **No code duplication** - Extract shared logic to utilities
- [ ] **Dependencies are minimal** - Don't add libraries for simple tasks
- [ ] **Changes are focused** - Don't refactor unrelated code

### Consistency
- [ ] **Follows existing patterns** - Look at similar code in the repo
- [ ] **Uses existing utilities** - Check `src/utils/` before writing new helpers
- [ ] **Matches code style** - Same formatting, naming conventions

```typescript
// Bad - magic number
if (checkIns.length > 24) { ... }

// Good - named constant
const MAX_RECENT_CHECKINS = 24;
if (checkIns.length > MAX_RECENT_CHECKINS) { ... }
```

---

## 6. Testing

- [ ] **Tests exist for new functionality** - At minimum, happy path
- [ ] **Edge cases covered** - Empty arrays, null values, invalid input
- [ ] **Tests are isolated** - Each test sets up its own state
- [ ] **Tests are deterministic** - No random failures, no time dependencies
- [ ] **Tests run fast** - Mock slow operations (network, database)

### Test Structure
```typescript
describe('ModuleName', () => {
  beforeEach(async () => {
    await db.init();  // Reset state
  });

  it('should handle the happy path', async () => { ... });
  it('should handle invalid input', async () => { ... });
  it('should handle edge cases', async () => { ... });
});
```

---

## 7. Solarpunk-Specific Checks

### Privacy
- [ ] **No tracking or analytics** - Never add user tracking
- [ ] **Data stays local by default** - Only sync what user explicitly shares
- [ ] **Location fuzzing for sensitive data** - Use neighborhood, not exact coordinates

### Offline-First
- [ ] **Works without network** - Test with airplane mode
- [ ] **No external API dependencies** - Don't call cloud services
- [ ] **Sync gracefully** - Handle merge conflicts with CRDTs

### Accessibility
- [ ] **Works on old phones** - Test on Android 5+ / Termux
- [ ] **Buttons are tappable** - Minimum 44x44px touch targets
- [ ] **Text is readable** - Sufficient contrast, reasonable font sizes

### Automerge Compatibility
- [ ] **No `undefined` values in documents** - Automerge doesn't support them
- [ ] **Arrays modified in-place** - Push to existing arrays, don't reassign
- [ ] **Objects spread carefully** - Don't use spread with Automerge docs

```typescript
// Bad - undefined not allowed
doc.field = undefined;

// Good - delete or omit the field
delete doc.field;

// Bad - array reassignment breaks Automerge
doc.items = [...doc.items, newItem];

// Good - push to existing array
doc.items.push(newItem);
```

---

## 8. Documentation

- [ ] **Public functions have JSDoc** - At minimum: description, params, returns
- [ ] **Complex algorithms documented** - Explain the approach
- [ ] **TODOs are actionable** - Include enough context to implement later
- [ ] **README updated** - If adding new features or changing behavior

```typescript
/**
 * Submit a check-in for the current user
 *
 * @param userId - The user's unique identifier
 * @param status - Current wellbeing status
 * @param message - Optional message to share with community
 * @returns The created check-in record
 */
export async function submitCheckIn(
  userId: string,
  status: CheckInStatus,
  message?: string
): Promise<CheckIn> { ... }
```

---

## 9. Pre-Commit Verification

Before committing, verify:

- [ ] **`npm run build` succeeds** - No TypeScript errors
- [ ] **`npm test` passes** - All tests green
- [ ] **No console.log debugging** - Remove temporary logs
- [ ] **No commented-out code** - Delete or restore, don't leave commented
- [ ] **No hardcoded test data** - Remove `user-1` type placeholders
- [ ] **Git status clean** - Only expected files modified

---

## 10. Quick Reference: Common Issues Found

| Issue | How to Fix |
|-------|------------|
| Using `any` type | Create proper interface or use generics |
| Hardcoded `user-1` | Get from identity service or function parameter |
| `innerHTML` with user content | Use `sanitizeUserContent()` |
| Silent `catch` blocks | Log error with context, rethrow or handle |
| Missing `await` | Add await or handle Promise |
| Automerge `undefined` | Use `delete` or omit field |
| Array spread with Automerge | Use `.push()` instead |
| Magic numbers | Create named constants |
| Duplicate code | Extract to utility function |
| Missing tests | Add test file or add test cases |

---

## Template: Self-Review Comment

After reviewing your own code, document what you checked:

```
## Self-Review Checklist Completed

- [x] Type safety verified
- [x] Error handling reviewed
- [x] Security checks passed
- [x] Tests added for new functionality
- [x] Follows existing patterns
- [x] Build and tests pass

### Notes
- Used `any` in line 42 due to Automerge type limitations
- Skipped location fuzzing - feature not user-facing yet
```

---

## Resources

- **Sanitization utilities:** `src/utils/sanitize.ts`
- **Type definitions:** `src/types/index.ts`
- **Test helpers:** `src/test-helpers.ts`
- **Example test:** `src/resources/resource-sharing.test.ts`
- **Tech debt report:** `TECH_DEBT_REPORT.md`
