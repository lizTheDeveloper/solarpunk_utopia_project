#!/bin/bash

# launch-daily-security-review.sh
# Runs security review once every 24 hours

set -e

INTERVAL_HOURS=24
DURATION_DAYS=30  # Run for 30 days, then stop
INTERVAL_SECONDS=$((INTERVAL_HOURS * 60 * 60))
TOTAL_ITERATIONS=$((DURATION_DAYS * 24 / INTERVAL_HOURS))

LOG_FILE="security-review.log"

echo "🔒 Daily Security Review Orchestrator 🔒" | tee "$LOG_FILE"
echo "=========================================" | tee -a "$LOG_FILE"
echo "Starting at: $(date)" | tee -a "$LOG_FILE"
echo "Interval: ${INTERVAL_HOURS} hours" | tee -a "$LOG_FILE"
echo "Total iterations: ${TOTAL_ITERATIONS} (${DURATION_DAYS} days)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for ((i=1; i<=TOTAL_ITERATIONS; i++)); do
    echo "" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo "Security Review - Iteration $i/${TOTAL_ITERATIONS}" | tee -a "$LOG_FILE"
    echo "Time: $(date)" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"

    # Run the security review orchestrator
    if ./security-review-orchestrator.sh 2>&1 | tee -a "$LOG_FILE"; then
        echo "✅ Security review iteration $i completed successfully!" | tee -a "$LOG_FILE"
    else
        echo "❌ Security review iteration $i failed!" | tee -a "$LOG_FILE"
    fi

    # Don't sleep after the last iteration
    if [ $i -lt $TOTAL_ITERATIONS ]; then
        echo "⏳ Next security review in ${INTERVAL_HOURS} hours..." | tee -a "$LOG_FILE"
        sleep $INTERVAL_SECONDS
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "🎉 Daily security review orchestrator finished!" | tee -a "$LOG_FILE"
echo "Completed at: $(date)" | tee -a "$LOG_FILE"
