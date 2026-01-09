#!/bin/bash

# launch-group-loop.sh GROUP_LETTER
# Runs a single orchestrator group in a loop every 15 minutes

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <GROUP_LETTER>"
    echo "Example: $0 A"
    exit 1
fi

GROUP=$1
PHASE=3
INTERVAL_MINUTES=15
DURATION_HOURS=24
INTERVAL_SECONDS=$((INTERVAL_MINUTES * 60))
TOTAL_ITERATIONS=$((DURATION_HOURS * 60 / INTERVAL_MINUTES))

LOG_FILE="orchestrator-p3g${GROUP}.log"

echo "🌻 Phase 3, Group ${GROUP} Orchestrator 🌻" | tee "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"
echo "Starting at: $(date)" | tee -a "$LOG_FILE"
echo "Interval: ${INTERVAL_MINUTES} minutes" | tee -a "$LOG_FILE"
echo "Total iterations: ${TOTAL_ITERATIONS}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for ((i=1; i<=TOTAL_ITERATIONS; i++)); do
    echo "" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo "Phase 3, Group ${GROUP} - Iteration $i/${TOTAL_ITERATIONS}" | tee -a "$LOG_FILE"
    echo "Time: $(date)" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"

    # Run the orchestrator for this group
    if ./orchestrator-group.sh "$GROUP" "$PHASE" 2>&1 | tee -a "$LOG_FILE" | grep -q "GROUP_COMPLETE"; then
        echo "✅ Phase 3, Group ${GROUP} is complete!" | tee -a "$LOG_FILE"
        break
    fi

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ Iteration $i completed successfully!" | tee -a "$LOG_FILE"
    else
        echo "❌ Iteration $i failed!" | tee -a "$LOG_FILE"
    fi

    # Don't sleep after the last iteration
    if [ $i -lt $TOTAL_ITERATIONS ]; then
        echo "⏳ Waiting ${INTERVAL_MINUTES} minutes..." | tee -a "$LOG_FILE"
        sleep $INTERVAL_SECONDS
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "🎉 Phase 3, Group ${GROUP} orchestrator finished!" | tee -a "$LOG_FILE"
