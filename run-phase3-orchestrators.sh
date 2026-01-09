#!/bin/bash

# run-phase3-orchestrators.sh
# Runs Phase 3 orchestrators in parallel, every 15 minutes

set -e

PHASE=3
GROUPS=("A" "B" "C" "D")
INTERVAL_MINUTES=15
DURATION_HOURS=24  # Run for 24 hours total
INTERVAL_SECONDS=$((INTERVAL_MINUTES * 60))
TOTAL_ITERATIONS=$((DURATION_HOURS * 60 / INTERVAL_MINUTES))

echo "🌻 Phase 3 Parallel Orchestrators 🌻" | tee phase3-orchestrator.log
echo "=======================================" | tee -a phase3-orchestrator.log
echo "Phase: ${PHASE}" | tee -a phase3-orchestrator.log
echo "Groups: ${GROUPS[@]}" | tee -a phase3-orchestrator.log
echo "Starting at: $(date)" | tee -a phase3-orchestrator.log
echo "Total duration: ${DURATION_HOURS} hours" | tee -a phase3-orchestrator.log
echo "Interval: ${INTERVAL_MINUTES} minutes" | tee -a phase3-orchestrator.log
echo "Total iterations: ${TOTAL_ITERATIONS} per group" | tee -a phase3-orchestrator.log
echo "" | tee -a phase3-orchestrator.log

# Function to run orchestrator for a specific group
run_group_orchestrator() {
    local group=$1
    local log_file="orchestrator-phase3-group-${group}.log"

    echo "🚀 Starting Phase 3, Group ${group} orchestrator" | tee -a "$log_file"

    for ((i=1; i<=TOTAL_ITERATIONS; i++)); do
        echo "" | tee -a "$log_file"
        echo "======================================" | tee -a "$log_file"
        echo "Phase 3, Group ${group} - Iteration $i of ${TOTAL_ITERATIONS}" | tee -a "$log_file"
        echo "Time: $(date)" | tee -a "$log_file"
        echo "======================================" | tee -a "$log_file"

        # Run the group-specific orchestrator
        if ./orchestrator-group.sh "$group" "$PHASE" 2>&1 | tee -a "$log_file" | grep -q "GROUP_COMPLETE"; then
            echo "✅ Phase 3, Group ${group} is complete! Stopping this orchestrator." | tee -a "$log_file"
            break
        fi

        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo "✅ Phase 3, Group ${group} iteration $i completed successfully!" | tee -a "$log_file"
        else
            echo "❌ Phase 3, Group ${group} iteration $i failed!" | tee -a "$log_file"
        fi

        # Don't sleep after the last iteration
        if [ $i -lt $TOTAL_ITERATIONS ]; then
            echo "⏳ Phase 3, Group ${group} waiting ${INTERVAL_MINUTES} minutes..." | tee -a "$log_file"
            sleep $INTERVAL_SECONDS
        fi
    done

    echo "" | tee -a "$log_file"
    echo "🎉 Phase 3, Group ${group} orchestrator finished!" | tee -a "$log_file"
}

# Launch orchestrators in parallel for each group
echo "🚀 Launching 4 parallel orchestrators for Phase 3..." | tee -a phase3-orchestrator.log
echo "" | tee -a phase3-orchestrator.log

for group in "${GROUPS[@]}"; do
    echo "Starting Phase 3, Group ${group}..." | tee -a phase3-orchestrator.log
    # Run in background and capture PID
    ( run_group_orchestrator "$group" ) &
    GROUP_PID=$!
    echo "$GROUP_PID" > "orchestrator-phase3-group-${group}.pid"
    echo "  Phase 3, Group ${group} launched with PID: $GROUP_PID" | tee -a phase3-orchestrator.log

    # Small delay to avoid race conditions
    sleep 2
done

echo "" | tee -a phase3-orchestrator.log
echo "✅ All 4 Phase 3 orchestrators launched!" | tee -a phase3-orchestrator.log
echo "" | tee -a phase3-orchestrator.log
echo "Monitor with:" | tee -a phase3-orchestrator.log
for group in "${GROUPS[@]}"; do
    echo "  tail -f orchestrator-phase3-group-${group}.log" | tee -a phase3-orchestrator.log
done
echo "" | tee -a phase3-orchestrator.log
echo "Stop with:" | tee -a phase3-orchestrator.log
for group in "${GROUPS[@]}"; do
    echo "  kill \$(cat orchestrator-phase3-group-${group}.pid)" | tee -a phase3-orchestrator.log
done
echo "" | tee -a phase3-orchestrator.log

# Wait for all background jobs to complete
wait

echo "" | tee -a phase3-orchestrator.log
echo "========================================" | tee -a phase3-orchestrator.log
echo "🎉 All Phase 3 orchestrators complete!" | tee -a phase3-orchestrator.log
echo "Finished at: $(date)" | tee -a phase3-orchestrator.log
echo "========================================" | tee -a phase3-orchestrator.log
