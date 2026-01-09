#!/bin/bash
#
# Code Quality Review Script
# Scans for fake integrations, stubs, unimplemented code, and suspicious patterns
# Can be run manually or as a cron job to track technical debt
#
# Usage:
#   ./scripts/review-code-quality.sh [options]
#
# Options:
#   --update-roadmap    Update ROADMAP.md with findings (default: report only)
#   --auto-commit       Automatically commit changes (requires --update-roadmap)
#   --output FILE       Output report to specific file (default: CODE_QUALITY_REPORT.md)
#   --quiet             Suppress progress messages
#   --help              Show this help message
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="${PROJECT_ROOT}/CODE_QUALITY_REPORT.md"
UPDATE_ROADMAP=false
AUTO_COMMIT=false
QUIET=false
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Colors for output (disabled in quiet mode)
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --update-roadmap)
      UPDATE_ROADMAP=true
      shift
      ;;
    --auto-commit)
      AUTO_COMMIT=true
      shift
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --quiet)
      QUIET=true
      shift
      ;;
    --help)
      head -n 20 "$0" | grep "^#" | sed 's/^# *//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# Logging functions
log() {
  if [[ "$QUIET" == "false" ]]; then
    echo -e "${BLUE}[INFO]${NC} $1"
  fi
}

warn() {
  if [[ "$QUIET" == "false" ]]; then
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
  fi
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  if [[ "$QUIET" == "false" ]]; then
    echo -e "${GREEN}[SUCCESS]${NC} $1"
  fi
}

# Change to project root
cd "$PROJECT_ROOT"

log "Starting code quality review..."
log "Project root: $PROJECT_ROOT"
log "Output file: $OUTPUT_FILE"

# Temporary files for collecting findings
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

STUBS_FILE="$TEMP_DIR/stubs.txt"
TODOS_FILE="$TEMP_DIR/todos.txt"
FAKE_IMPL_FILE="$TEMP_DIR/fake_impl.txt"
THROWS_FILE="$TEMP_DIR/throws.txt"
MOCK_FILE="$TEMP_DIR/mock.txt"
PLACEHOLDER_FILE="$TEMP_DIR/placeholder.txt"
SECURITY_FILE="$TEMP_DIR/security.txt"

# Search patterns
log "Scanning source code for issues..."

# 1. Find stub implementations (throws "not implemented" or "not yet implemented")
grep -rn "throw.*Error.*not.*implemented" src/ --include="*.ts" --include="*.js" 2>/dev/null > "$THROWS_FILE" || true

# 2. Find TODO/FIXME comments
grep -rn -E "(TODO|FIXME|HACK|XXX|STUB):" src/ --include="*.ts" --include="*.js" 2>/dev/null > "$TODOS_FILE" || true

# 3. Find fake/mock implementations
grep -rn -iE "(fake|mock|placeholder|stub|temporary)" src/ --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "test\|spec\|\.test\.\|\.spec\." > "$FAKE_IMPL_FILE" || true

# 4. Find placeholder/mock data
grep -rn -E "mock-|fake-|placeholder-" src/ --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "test\|spec" > "$MOCK_FILE" || true

# 5. Find security issues (XOR encryption, unencrypted keys, hardcoded secrets)
grep -rn -iE "(XOR|TODO.*encrypt|FIXME.*encrypt|hardcoded|FIXME.*security|TODO.*security)" src/ --include="*.ts" --include="*.js" 2>/dev/null > "$SECURITY_FILE" || true

# 6. Find placeholder comments
grep -rn -iE "\/\/.*placeholder|\/\*.*placeholder" src/ --include="*.ts" --include="*.js" 2>/dev/null > "$PLACEHOLDER_FILE" || true

# Count findings
STUBS_COUNT=$(wc -l < "$THROWS_FILE" | tr -d ' ')
TODOS_COUNT=$(wc -l < "$TODOS_FILE" | tr -d ' ')
FAKE_COUNT=$(wc -l < "$FAKE_IMPL_FILE" | tr -d ' ')
MOCK_COUNT=$(wc -l < "$MOCK_FILE" | tr -d ' ')
SECURITY_COUNT=$(wc -l < "$SECURITY_FILE" | tr -d ' ')
PLACEHOLDER_COUNT=$(wc -l < "$PLACEHOLDER_FILE" | tr -d ' ')

TOTAL_ISSUES=$((STUBS_COUNT + TODOS_COUNT + FAKE_COUNT + MOCK_COUNT + SECURITY_COUNT + PLACEHOLDER_COUNT))

log "Found $TOTAL_ISSUES total issues:"
log "  - Stubs (throws not implemented): $STUBS_COUNT"
log "  - TODO/FIXME comments: $TODOS_COUNT"
log "  - Fake/mock implementations: $FAKE_COUNT"
log "  - Mock data: $MOCK_COUNT"
log "  - Security issues: $SECURITY_COUNT"
log "  - Placeholder comments: $PLACEHOLDER_COUNT"

# Generate report
log "Generating report..."

cat > "$OUTPUT_FILE" <<EOF
# Code Quality Review Report

**Generated:** $TIMESTAMP
**Total Issues Found:** $TOTAL_ISSUES

---

## Summary

This automated report identifies code quality issues including:
- Unimplemented stubs (functions that throw "not implemented" errors)
- TODO/FIXME comments indicating incomplete work
- Fake or mock implementations in production code
- Security concerns (weak encryption, hardcoded values)
- Placeholder code and comments

---

## 🚨 Critical: Stub Implementations ($STUBS_COUNT)

These functions throw "not implemented" errors and will fail at runtime:

EOF

if [[ $STUBS_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  cat "$THROWS_FILE" >> "$OUTPUT_FILE"
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No stub implementations found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## 🔒 Security Concerns ($SECURITY_COUNT)

Potential security issues requiring review:

EOF

if [[ $SECURITY_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  head -n 50 "$SECURITY_FILE" >> "$OUTPUT_FILE"
  if [[ $SECURITY_COUNT -gt 50 ]]; then
    echo "... and $((SECURITY_COUNT - 50)) more" >> "$OUTPUT_FILE"
  fi
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No security concerns found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## 🎭 Fake/Mock Implementations ($FAKE_COUNT)

Production code containing fake, mock, or temporary implementations:

EOF

if [[ $FAKE_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  head -n 50 "$FAKE_IMPL_FILE" >> "$OUTPUT_FILE"
  if [[ $FAKE_COUNT -gt 50 ]]; then
    echo "... and $((FAKE_COUNT - 50)) more" >> "$OUTPUT_FILE"
  fi
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No fake implementations found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## 📝 TODO/FIXME Comments ($TODOS_COUNT)

Outstanding work items marked in code:

EOF

if [[ $TODOS_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  head -n 50 "$TODOS_FILE" >> "$OUTPUT_FILE"
  if [[ $TODOS_COUNT -gt 50 ]]; then
    echo "... and $((TODOS_COUNT - 50)) more" >> "$OUTPUT_FILE"
  fi
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No TODO/FIXME comments found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## 🔧 Mock Data in Production ($MOCK_COUNT)

Mock or placeholder data found in production code:

EOF

if [[ $MOCK_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  head -n 30 "$MOCK_FILE" >> "$OUTPUT_FILE"
  if [[ $MOCK_COUNT -gt 30 ]]; then
    echo "... and $((MOCK_COUNT - 30)) more" >> "$OUTPUT_FILE"
  fi
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No mock data found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## 📦 Placeholder Comments ($PLACEHOLDER_COUNT)

Comments indicating placeholder code:

EOF

if [[ $PLACEHOLDER_COUNT -gt 0 ]]; then
  echo '```' >> "$OUTPUT_FILE"
  head -n 30 "$PLACEHOLDER_FILE" >> "$OUTPUT_FILE"
  if [[ $PLACEHOLDER_COUNT -gt 30 ]]; then
    echo "... and $((PLACEHOLDER_COUNT - 30)) more" >> "$OUTPUT_FILE"
  fi
  echo '```' >> "$OUTPUT_FILE"
else
  echo "*No placeholder comments found.*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" <<EOF

---

## Recommendations

### Immediate Actions

1. **Fix stub implementations** - Replace \`throw new Error('not implemented')\` with real code
2. **Review security issues** - Particularly encryption and key storage
3. **Remove mock data** - Move to test fixtures or implement real functionality

### Short-term Actions

1. **Address TODOs** - Prioritize by criticality
2. **Document incomplete features** - Mark experimental features clearly
3. **Add tests** - Ensure stubs are covered by tests that expect failures

### Long-term Actions

1. **Refactor fake implementations** - Replace with real integrations
2. **Track technical debt** - Add to ROADMAP.md Priority 0 section
3. **Set up continuous monitoring** - Run this script regularly

---

## How to Use This Report

1. **Review Critical Issues First** - Focus on stubs and security concerns
2. **Prioritize by Impact** - Consider user-facing vs internal code
3. **Update Roadmap** - Add issues to ROADMAP.md Priority 0 section
4. **Track Progress** - Re-run this script to measure improvement

Run with \`--update-roadmap\` to automatically add critical issues to ROADMAP.md.

---

*Generated by: \`scripts/review-code-quality.sh\`*
*Next review recommended: Run weekly or before major releases*
EOF

success "Report generated: $OUTPUT_FILE"

# Update roadmap if requested
if [[ "$UPDATE_ROADMAP" == "true" ]]; then
  log "Updating ROADMAP.md..."

  # Check if ROADMAP.md exists
  if [[ ! -f "ROADMAP.md" ]]; then
    error "ROADMAP.md not found. Skipping roadmap update."
    exit 1
  fi

  # Create a backup
  cp ROADMAP.md ROADMAP.md.backup

  # Extract critical issues for roadmap
  CRITICAL_STUBS=$(head -n 10 "$THROWS_FILE" | awk -F: '{print $1 ":" $2}' | sort -u || echo "None")
  CRITICAL_SECURITY=$(head -n 10 "$SECURITY_FILE" | awk -F: '{print $1 ":" $2}' | sort -u || echo "None")

  # Generate timestamp for tracking
  UPDATE_TIMESTAMP=$(date +"%Y-%m-%d")

  # Create update section
  TEMP_UPDATE="$TEMP_DIR/roadmap_update.md"
  cat > "$TEMP_UPDATE" <<EOF

### Automated Code Quality Review ($UPDATE_TIMESTAMP)

**Last Scan:** $TIMESTAMP
**Issues Found:** $TOTAL_ISSUES (Stubs: $STUBS_COUNT, Security: $SECURITY_COUNT, TODOs: $TODOS_COUNT)

**Critical Stub Implementations:**
EOF

  if [[ $STUBS_COUNT -gt 0 ]]; then
    echo "$CRITICAL_STUBS" | while read -r line; do
      if [[ -n "$line" ]]; then
        echo "- $line" >> "$TEMP_UPDATE"
      fi
    done
  else
    echo "- None found ✅" >> "$TEMP_UPDATE"
  fi

  cat >> "$TEMP_UPDATE" <<EOF

**Security Concerns:**
EOF

  if [[ $SECURITY_COUNT -gt 0 ]]; then
    echo "$CRITICAL_SECURITY" | while read -r line; do
      if [[ -n "$line" ]]; then
        echo "- $line" >> "$TEMP_UPDATE"
      fi
    done
  else
    echo "- None found ✅" >> "$TEMP_UPDATE"
  fi

  echo "" >> "$TEMP_UPDATE"
  echo "**Full Report:** See \`CODE_QUALITY_REPORT.md\`" >> "$TEMP_UPDATE"

  # Find insertion point in ROADMAP.md (after Group E or at end of Priority 0)
  if grep -q "### Group E:" ROADMAP.md; then
    # Insert after Group E section
    awk '/^### Group E:/{p=1} p&&/^---/{print; system("cat '"$TEMP_UPDATE"'"); p=0; next} 1' ROADMAP.md > ROADMAP.md.new
    mv ROADMAP.md.new ROADMAP.md
  elif grep -q "## Priority 0:" ROADMAP.md; then
    # Insert at end of Priority 0 section
    awk '/^## Priority 0:/,/^---$/{if(/^---$/ && !p){system("cat '"$TEMP_UPDATE"'"); p=1}} 1' ROADMAP.md > ROADMAP.md.new
    mv ROADMAP.md.new ROADMAP.md
  else
    warn "Could not find insertion point in ROADMAP.md. Appending to end."
    cat "$TEMP_UPDATE" >> ROADMAP.md
  fi

  success "Updated ROADMAP.md with findings"

  # Auto-commit if requested
  if [[ "$AUTO_COMMIT" == "true" ]]; then
    log "Auto-committing changes..."

    git add ROADMAP.md "$OUTPUT_FILE"

    git commit -m "Automated code quality review - $UPDATE_TIMESTAMP

Found $TOTAL_ISSUES issues:
- Stub implementations: $STUBS_COUNT
- Security concerns: $SECURITY_COUNT
- TODO/FIXME comments: $TODOS_COUNT
- Fake implementations: $FAKE_COUNT
- Mock data: $MOCK_COUNT

See CODE_QUALITY_REPORT.md for full details.

🤖 Automated review via scripts/review-code-quality.sh"

    success "Changes committed to git"
  else
    log "Review complete. Run 'git diff ROADMAP.md' to see changes."
    log "Add --auto-commit to automatically commit changes."
  fi

  # Cleanup backup
  rm -f ROADMAP.md.backup
else
  log "Review complete. Report saved to: $OUTPUT_FILE"
  log "Run with --update-roadmap to add findings to ROADMAP.md"
fi

# Exit with appropriate code
if [[ $TOTAL_ISSUES -gt 0 ]]; then
  warn "Found $TOTAL_ISSUES code quality issues requiring attention"
  exit 0  # Exit 0 for cron compatibility
else
  success "No code quality issues found! 🎉"
  exit 0
fi
