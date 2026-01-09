# Solarpunk Platform Scripts

Automation and maintenance scripts for the Solarpunk Utopia Platform.

---

## Code Quality Review

### `review-code-quality.sh`

Automatically scans the codebase for technical debt, fake integrations, stubs, and code quality issues.

**What It Finds:**
- 🚨 Stub implementations (functions that throw "not implemented" errors)
- 🔒 Security concerns (weak encryption, hardcoded values)
- 🎭 Fake/mock implementations in production code
- 📝 TODO/FIXME comments
- 🔧 Mock data in production files
- 📦 Placeholder code and comments

**Usage:**

```bash
# Generate report only (safe for CI/CD)
./scripts/review-code-quality.sh

# Generate report and update ROADMAP.md
./scripts/review-code-quality.sh --update-roadmap

# Full automation: generate, update roadmap, and commit
./scripts/review-code-quality.sh --update-roadmap --auto-commit

# Custom output location
./scripts/review-code-quality.sh --output reports/quality-$(date +%Y%m%d).md

# Quiet mode (for cron)
./scripts/review-code-quality.sh --quiet --update-roadmap
```

**Options:**
- `--update-roadmap` - Add findings to ROADMAP.md Priority 0 section
- `--auto-commit` - Automatically commit changes (requires --update-roadmap)
- `--output FILE` - Specify output file (default: CODE_QUALITY_REPORT.md)
- `--quiet` - Suppress progress messages (useful for cron)
- `--help` - Show help message

**Output:**

Generates `CODE_QUALITY_REPORT.md` with:
- Summary of all findings
- Critical stubs that will fail at runtime
- Security concerns requiring immediate attention
- Technical debt tracking
- Actionable recommendations

---

## Setting Up Automated Reviews

### Cron Job (Weekly Reviews)

Add to your crontab (`crontab -e`):

```cron
# Run code quality review every Monday at 9 AM
0 9 * * 1 cd /path/to/solarpunk_utopia_project && ./scripts/review-code-quality.sh --quiet --update-roadmap --auto-commit 2>&1 | logger -t code-review

# Run daily in report-only mode (no commits)
0 6 * * * cd /path/to/solarpunk_utopia_project && ./scripts/review-code-quality.sh --quiet 2>&1 | logger -t code-review
```

### GitHub Actions (CI/CD)

Create `.github/workflows/code-quality.yml`:

```yaml
name: Code Quality Review

on:
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:  # Allow manual trigger

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git operations

      - name: Run Code Quality Review
        run: |
          ./scripts/review-code-quality.sh --update-roadmap --auto-commit

      - name: Push Changes
        run: |
          git config user.name "Code Quality Bot"
          git config user.email "bot@solarpunk.local"
          git push

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: code-quality-report
          path: CODE_QUALITY_REPORT.md
```

### Pre-commit Hook (Local Development)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run code quality review before each commit
./scripts/review-code-quality.sh --quiet

# Check if critical issues increased
if [ -f CODE_QUALITY_REPORT.md ]; then
  STUBS=$(grep -o "Critical: Stub Implementations ([0-9]*)" CODE_QUALITY_REPORT.md | grep -o "[0-9]*")
  if [ "$STUBS" -gt 10 ]; then
    echo "WARNING: $STUBS stub implementations found!"
    echo "Consider fixing critical stubs before committing."
  fi
fi
```

---

## Example Workflows

### 1. Manual Review Before Release

```bash
# Generate comprehensive report
./scripts/review-code-quality.sh --output reports/pre-release-review.md

# Review the report
less reports/pre-release-review.md

# If acceptable, update roadmap
./scripts/review-code-quality.sh --update-roadmap

# Commit manually with context
git add ROADMAP.md CODE_QUALITY_REPORT.md
git commit -m "Pre-release code quality review"
```

### 2. Automated Weekly Cleanup

```bash
# Run automatically via cron
./scripts/review-code-quality.sh \
  --quiet \
  --update-roadmap \
  --auto-commit \
  --output "reports/weekly-$(date +%Y-%m-%d).md"
```

### 3. Track Progress Over Time

```bash
# Keep historical reports
mkdir -p reports/quality-history

# Generate dated report
./scripts/review-code-quality.sh \
  --output "reports/quality-history/$(date +%Y-%m-%d).md"

# Compare with last week
diff reports/quality-history/2024-01-01.md reports/quality-history/2024-01-08.md
```

---

## Integration with Development Workflow

### For Teams

1. **Weekly Reviews**: Run automatically via cron, commit to shared repository
2. **Pull Request Checks**: Fail PR if critical issues increase
3. **Sprint Planning**: Review CODE_QUALITY_REPORT.md during planning
4. **Technical Debt Days**: Use report to prioritize cleanup work

### For Solo Developers

1. **Monthly Check-ins**: Review report monthly, track progress
2. **Pre-release**: Always run before tagging releases
3. **Refactoring Guide**: Use report to identify refactoring targets

---

## Output File Format

### CODE_QUALITY_REPORT.md

Structured markdown report with:
- **Summary Statistics**: Total counts by category
- **Critical Sections**: Prioritized by severity
- **Code References**: File paths and line numbers
- **Recommendations**: Actionable next steps
- **Tracking**: Timestamp and change history

### ROADMAP.md Updates

Adds a section to Priority 0 with:
- Scan timestamp
- Critical stub implementations
- Security concerns
- Link to full report

---

## Customization

### Add Custom Patterns

Edit the script to add new search patterns:

```bash
# Find specific anti-patterns
grep -rn "your-pattern" src/ --include="*.ts" > "$TEMP_DIR/custom.txt"
```

### Adjust Thresholds

Modify exit codes for CI/CD:

```bash
# Exit with error if too many stubs found
if [[ $STUBS_COUNT -gt 5 ]]; then
  error "Too many stubs: $STUBS_COUNT (max: 5)"
  exit 1
fi
```

### Filter False Positives

Add exclusions:

```bash
# Exclude specific files or patterns
grep -rn "pattern" src/ --include="*.ts" | \
  grep -v "exclude-this" | \
  grep -v "exclude-that" > "$OUTPUT"
```

---

## Troubleshooting

### Script Fails to Run

```bash
# Ensure script is executable
chmod +x scripts/review-code-quality.sh

# Check bash version (requires bash 4+)
bash --version

# Run with debugging
bash -x scripts/review-code-quality.sh
```

### No Git Permissions (Cron)

```bash
# Set up SSH keys for cron
ssh-agent bash
ssh-add ~/.ssh/id_rsa

# Or use HTTPS with token
git config credential.helper store
```

### False Positives

Edit the script to add exclusions or adjust patterns. Common false positives:
- Test files (already excluded)
- Example code (add `--exclude="*-example.ts"`)
- Third-party code (add to `.gitignore`)

---

## Related Documentation

- **ROADMAP.md** - Priority 0: Tech Debt Remediation
- **AGENT_CODE_REVIEW_CHECKLIST.md** - Manual review guidelines
- **TECH_DEBT_REPORT.md** - Detailed technical debt analysis

---

## Contributing

To add new quality checks:

1. Add search pattern to script
2. Create new temporary file for results
3. Add section to report generation
4. Update this README with new check description
5. Test with `./scripts/review-code-quality.sh`

---

🌻 **Keeping our codebase healthy, one scan at a time!** ✊
