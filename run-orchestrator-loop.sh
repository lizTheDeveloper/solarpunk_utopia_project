#!/bin/bash

# run-orchestrator-loop.sh
# Runs the orchestrator every 10 minutes for 6 hours

set -e

INTERVAL_MINUTES=10
DURATION_HOURS=6
PROJECT_DIR="$(pwd)"
LOG_FILE="${PROJECT_DIR}/orchestrator-loop.log"

# Calculate total iterations
TOTAL_ITERATIONS=$((DURATION_HOURS * 60 / INTERVAL_MINUTES))
INTERVAL_SECONDS=$((INTERVAL_MINUTES * 60))

echo "🌻 Solarpunk Orchestrator Loop 🌻" | tee -a "$LOG_FILE"
echo "=================================" | tee -a "$LOG_FILE"
echo "Starting at: $(date)" | tee -a "$LOG_FILE"
echo "Total duration: ${DURATION_HOURS} hours" | tee -a "$LOG_FILE"
echo "Interval: ${INTERVAL_MINUTES} minutes" | tee -a "$LOG_FILE"
echo "Total iterations: ${TOTAL_ITERATIONS}" | tee -a "$LOG_FILE"
echo "Log file: ${LOG_FILE}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for ((i=1; i<=TOTAL_ITERATIONS; i++)); do
    echo "========================================" | tee -a "$LOG_FILE"
    echo "Iteration $i of ${TOTAL_ITERATIONS}" | tee -a "$LOG_FILE"
    echo "Time: $(date)" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Run the orchestrator
    if ./orchestrator.sh 2>&1 | tee -a "$LOG_FILE"; then
        echo "" | tee -a "$LOG_FILE"
        echo "✅ Iteration $i completed successfully!" | tee -a "$LOG_FILE"
    else
        echo "" | tee -a "$LOG_FILE"
        echo "❌ Iteration $i failed!" | tee -a "$LOG_FILE"
        echo "Check the log for details: ${LOG_FILE}" | tee -a "$LOG_FILE"
        # Continue even if one iteration fails
    fi

    # Don't sleep after the last iteration
    if [ $i -lt $TOTAL_ITERATIONS ]; then
        echo "" | tee -a "$LOG_FILE"
        echo "⏳ Waiting ${INTERVAL_MINUTES} minutes before next iteration..." | tee -a "$LOG_FILE"
        echo "Next run at: $(date -v+${INTERVAL_MINUTES}M)" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
        sleep $INTERVAL_SECONDS
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "🎉 All iterations complete!" | tee -a "$LOG_FILE"
echo "Finished at: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
