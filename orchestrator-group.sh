#!/bin/bash

# orchestrator-group.sh
# Orchestrates feature implementation for a specific group (A, B, C, D)

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <GROUP> [PHASE]"
    echo "Example: $0 A 2"
    exit 1
fi

GROUP="$1"
PHASE="${2:-2}"  # Default to Phase 2
ROADMAP_FILE="ROADMAP.md"
PROJECT_DIR="$(pwd)"

echo "🌻 Solarpunk Orchestrator - Phase $PHASE, Group $GROUP 🌻"
echo "=========================================================="
echo ""

# Phase 1: Implementation Agent
echo "🔨 Phase 1: Launching Implementation Agent..."
echo "Working on Phase $PHASE, Group $GROUP features..."
echo ""

claude --dangerously-skip-permissions --print "
You are the Implementation Agent for the Solarpunk Utopia Platform.

YOUR TASK:
1. Read the ROADMAP.md file carefully
2. Find the next unclaimed item in Phase ${PHASE}, Group ${GROUP} that is not marked as 'in progress' or 'done'
3. Update the ROADMAP.md to mark that item as '⏳ IN PROGRESS'
4. Read the relevant specification file(s) referenced in the roadmap for that feature
5. Implement the feature according to the specification
6. DO NOT commit any code - just implement and save files
7. When done, output a summary of what you implemented

IMPORTANT:
- ONLY work on features in Phase ${PHASE}, Group ${GROUP}
- If all features in this group are done, output 'GROUP_COMPLETE' and exit
- Follow the project's solarpunk values (no money, no surveillance, offline-first)
- Only implement what's specified - don't over-engineer

Start by examining Phase ${PHASE}, Group ${GROUP} in the ROADMAP.md.
"

if [ $? -ne 0 ]; then
    echo "❌ Implementation agent failed!"
    exit 1
fi

echo ""
echo "✅ Implementation complete!"
echo ""

# Phase 2: Review and Test Agent
echo "🔍 Phase 2: Launching Review and Test Agent..."
echo "Using AGENT_CODE_REVIEW_CHECKLIST.md for review..."
echo ""

claude --dangerously-skip-permissions --print "
You are the Review and Test Agent for the Solarpunk Utopia Platform.

IMPORTANT: Before starting, read the AGENT_CODE_REVIEW_CHECKLIST.md file.
Use it as your guide for this review.

YOUR TASK:
1. Read AGENT_CODE_REVIEW_CHECKLIST.md thoroughly
2. Review the code that was just implemented by the previous agent for Phase ${PHASE}, Group ${GROUP}
3. Use the checklist to verify:

   TYPE SAFETY:
   - [ ] No \`any\` types without justification
   - [ ] Null/undefined properly handled
   - [ ] Function return types explicit

   ERROR HANDLING:
   - [ ] All async operations have try/catch or .catch() handlers
   - [ ] Errors include context (what and where)
   - [ ] Consistent error pattern (throw OR return {success, error})

   SECURITY:
   - [ ] All user input sanitized using sanitizeUserContent()
   - [ ] IDs validated using requireValidIdentifier()
   - [ ] No innerHTML with unsanitized user content
   - [ ] No secrets or hardcoded user IDs like 'user-1'

   SOLARPUNK VALUES:
   - [ ] No tracking or analytics added
   - [ ] Works offline (no external API dependencies)
   - [ ] Automerge compatible (no undefined values, arrays modified in-place)

   CODE QUALITY:
   - [ ] Functions are small (single responsibility)
   - [ ] No code duplication
   - [ ] Uses existing utilities from src/utils/

4. Fix any issues you find based on the checklist
5. Write comprehensive tests for the implemented feature
6. Run the tests to ensure they pass (npm test)
7. DO NOT commit any code - the next agent will do that

Remember:
- Be thorough - the checklist exists because these issues keep recurring
- Tests should cover both happy paths and edge cases
- Check TECH_DEBT_REPORT.md to avoid repeating known issues

Review the recent changes for Phase ${PHASE}, Group ${GROUP} using the checklist.
"

if [ $? -ne 0 ]; then
    echo "❌ Review and test agent failed!"
    exit 1
fi

echo ""
echo "✅ Review and testing complete!"
echo ""

# Phase 3: Commit and Documentation Agent
echo "📝 Phase 3: Launching Commit and Documentation Agent..."
echo ""

claude --dangerously-skip-permissions --print "
You are the Commit and Documentation Agent for the Solarpunk Utopia Platform.

YOUR TASK:
1. Review all the changes made by the previous agents for Phase ${PHASE}, Group ${GROUP}
2. Update the ROADMAP.md to mark the completed feature as '✅ DONE'
3. Update any relevant documentation files if needed
4. Create a descriptive git commit with:
   - A clear commit message describing what was implemented
   - Reference to Phase ${PHASE}, Group ${GROUP} and the specific feature
   - The standard project footer:
     🌻 Generated with [Claude Code](https://claude.com/claude-code)
     Co-Authored-By: Claude <noreply@anthropic.com>
5. Push the commit to GitHub if remote is configured

The commit should clearly identify this as Phase ${PHASE}, Group ${GROUP}.
"

if [ $? -ne 0 ]; then
    echo "❌ Commit and documentation agent failed!"
    exit 1
fi

echo ""
echo "✅ All phases complete for Phase $PHASE, Group $GROUP!"
echo ""
