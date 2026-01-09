#!/bin/bash

# orchestrator.sh
# Orchestrates three Claude Code instances to implement, review, and commit roadmap items

set -e  # Exit on error

ROADMAP_FILE="ROADMAP.md"
PROJECT_DIR="$(pwd)"

echo "🌻 Solarpunk Utopia Platform - AI Orchestrator 🌻"
echo "=================================================="
echo ""

# Phase 1: Implementation Agent
echo "🔨 Phase 1: Launching Implementation Agent..."
echo "This agent will claim the next unclaimed roadmap item and implement it."
echo ""

claude --dangerously-skip-permissions --print "
You are the Implementation Agent for the Solarpunk Utopia Platform.

YOUR TASK:
1. Read the ROADMAP.md file carefully
2. Find the next unclaimed item that is not yet marked as 'in progress' or 'done'
3. Update the ROADMAP.md to mark that item as 'in progress' (add a status indicator like ⏳ or [IN PROGRESS])
4. Read the relevant specification file(s) referenced in the roadmap for that feature
5. Implement the feature according to the specification
6. DO NOT commit any code - just implement and save files
7. When done, output a summary of what you implemented

Remember:
- Follow the project's solarpunk values (no money, no surveillance, offline-first, accessible)
- Only implement what's specified - don't over-engineer
- Write clean, simple code
- The next agent will review your work and write tests

Start by examining the ROADMAP.md and choosing the next item to implement.
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
echo "This agent will review the implementation and write tests."
echo ""

claude --dangerously-skip-permissions --print "
You are the Review and Test Agent for the Solarpunk Utopia Platform.

YOUR TASK:
1. Review the code that was just implemented by the previous agent
2. Check for:
   - Security vulnerabilities (XSS, injection, etc.)
   - Adherence to solarpunk values (no tracking, no surveillance, offline-first)
   - Code quality and simplicity
   - Accessibility concerns
3. Fix any issues you find
4. Write comprehensive tests for the implemented feature
5. Run the tests to ensure they pass
6. DO NOT commit any code - the next agent will do that

Remember:
- Be thorough but not perfectionist
- Tests should cover both happy paths and edge cases
- Make sure the feature works offline

Review the recent changes and write tests for them.
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
echo "This agent will commit the work, update documentation, and push to GitHub."
echo ""

claude --dangerously-skip-permissions --print "
You are the Commit and Documentation Agent for the Solarpunk Utopia Platform.

YOUR TASK:
1. Review all the changes made by the previous agents
2. Update the ROADMAP.md to mark the completed feature as DONE (use ✅ or [DONE])
3. Update any relevant documentation files if needed
4. Create a descriptive git commit with:
   - A clear commit message describing what was implemented
   - Reference to the phase and feature from the roadmap
   - The standard project footer:
     🌻 Generated with [Claude Code](https://claude.com/claude-code)
     Co-Authored-By: Claude <noreply@anthropic.com>
5. Push the commit to GitHub

Remember:
- The commit message should follow the project's style
- Make sure the roadmap accurately reflects the completed work
- Update any other docs that reference this feature

Commit the work and push to GitHub.
"

if [ $? -ne 0 ]; then
    echo "❌ Commit and documentation agent failed!"
    exit 1
fi

echo ""
echo "✅ All phases complete!"
echo ""
echo "🌻 Feature successfully implemented, tested, and committed! 🌻"
echo "=================================================="
