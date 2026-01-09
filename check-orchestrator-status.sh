#!/bin/bash

# check-orchestrator-status.sh
# Check the status of the running orchestrator loop

echo "🔍 Orchestrator Loop Status"
echo "============================"
echo ""

# Check if PID file exists
if [ -f "orchestrator-loop.pid" ]; then
    PID=$(cat orchestrator-loop.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Loop is RUNNING (PID: $PID)"

        # Calculate uptime
        START_TIME=$(ps -p $PID -o lstart= 2>/dev/null)
        echo "   Started: $START_TIME"

        # Count completed iterations
        if [ -f "orchestrator-loop.log" ]; then
            COMPLETED=$(grep -c "✅ Iteration.*completed successfully" orchestrator-loop.log 2>/dev/null || echo "0")
            FAILED=$(grep -c "❌ Iteration.*failed" orchestrator-loop.log 2>/dev/null || echo "0")
            CURRENT=$(grep "Iteration.*of 36" orchestrator-loop.log 2>/dev/null | tail -1)

            echo ""
            echo "📊 Progress:"
            echo "   $CURRENT"
            echo "   Completed: $COMPLETED"
            echo "   Failed: $FAILED"
        fi
    else
        echo "❌ Loop is NOT RUNNING (stale PID file)"
    fi
else
    echo "❌ No PID file found - loop may not be started"
fi

echo ""
echo "📝 Recent Log Output:"
echo "--------------------"
tail -20 orchestrator-loop.log 2>/dev/null || echo "No log file found"

echo ""
echo "🗂️  Phase 2 Roadmap Status:"
echo "---------------------------"
grep -A 10 "Group A: Community Check-ins" ROADMAP.md 2>/dev/null | grep "^|" | head -7

echo ""
echo "💡 Commands:"
echo "   View full log: tail -f orchestrator-loop.log"
echo "   Stop loop: kill \$(cat orchestrator-loop.pid)"
echo "   Check status: ./check-orchestrator-status.sh"
