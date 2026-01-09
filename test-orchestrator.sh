#!/bin/bash

# test-orchestrator.sh
# Simple test to verify orchestrator.sh would work correctly

set -e

echo "🧪 Testing Orchestrator Script"
echo "=============================="
echo ""

# Test 1: Check if script exists and is executable
echo "Test 1: Checking script..."
if [ -x "./orchestrator.sh" ]; then
    echo "✅ orchestrator.sh exists and is executable"
else
    echo "❌ orchestrator.sh is not executable"
    exit 1
fi

# Test 2: Check syntax
echo ""
echo "Test 2: Checking bash syntax..."
if bash -n ./orchestrator.sh; then
    echo "✅ Script syntax is valid"
else
    echo "❌ Script has syntax errors"
    exit 1
fi

# Test 3: Check if ROADMAP.md exists
echo ""
echo "Test 3: Checking for ROADMAP.md..."
if [ -f "ROADMAP.md" ]; then
    echo "✅ ROADMAP.md exists"
else
    echo "❌ ROADMAP.md not found"
    exit 1
fi

# Test 4: Check if claude CLI is available
echo ""
echo "Test 4: Checking for claude CLI..."
if command -v claude &> /dev/null; then
    echo "✅ claude CLI is available at: $(which claude)"
else
    echo "❌ claude CLI not found in PATH"
    exit 1
fi

# Test 5: Check Phase 2 status
echo ""
echo "Test 5: Checking Phase 2 status in ROADMAP.md..."
if grep -q "Daily check-in prompts.*✅ DONE" ROADMAP.md; then
    echo "✅ First Phase 2 item is marked as DONE"
elif grep -q "Daily check-in prompts.*⏳ IN PROGRESS" ROADMAP.md; then
    echo "⏳ First Phase 2 item is marked as IN PROGRESS"
else
    echo "📋 First Phase 2 item is unclaimed (ready for orchestrator)"
fi

# Test 6: Check if git is initialized
echo ""
echo "Test 6: Checking git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✅ Git repository is initialized"
else
    echo "❌ Not a git repository"
    exit 1
fi

echo ""
echo "=============================="
echo "✅ All tests passed!"
echo ""
echo "The orchestrator.sh script is ready to use."
echo "Run it with: ./orchestrator.sh"
echo ""
echo "⚠️  Warning: This will spawn 3 sequential Claude Code instances"
echo "   and will modify the codebase. Make sure you have a clean"
echo "   working directory or have committed your changes first."
