# Orchestrator Script

## Overview

The `orchestrator.sh` script automates the development workflow for the Solarpunk Utopia Platform by launching three sequential Claude Code instances that work together to implement, review, and commit features from the roadmap.

## How It Works

### Phase 1: Implementation Agent
- Reads `ROADMAP.md` to find the next unclaimed feature
- Marks the feature as "⏳ IN PROGRESS"
- Reads the relevant specification file(s)
- Implements the feature according to specifications
- Saves all code without committing

### Phase 2: Review and Test Agent
- Reviews the code written by the Implementation Agent
- Checks for security vulnerabilities, code quality, and adherence to solarpunk values
- Fixes any issues found
- Writes comprehensive tests
- Runs tests to ensure they pass
- Does not commit code

### Phase 3: Commit and Documentation Agent
- Reviews all changes from previous agents
- Updates `ROADMAP.md` to mark feature as "✅ DONE"
- Updates any relevant documentation
- Creates a descriptive git commit
- Pushes changes to GitHub

## Usage

### Prerequisites

- Claude CLI installed and configured (`claude` command available)
- Git repository initialized
- Clean working directory (or committed changes)
- `ROADMAP.md` present in project root

### Running the Orchestrator

```bash
./orchestrator.sh
```

### Testing the Orchestrator

Run the test script to verify all prerequisites:

```bash
./test-orchestrator.sh
```

## Flags Used

- `--dangerously-skip-permissions`: Bypasses all permission checks. This allows the agents to work autonomously without human intervention.
- `--print`: Makes Claude run in non-interactive mode and exit after completing the task.

## Safety Considerations

⚠️ **Warning**: This script will:
- Modify your codebase automatically
- Create git commits
- Push to GitHub remote
- Spawn 3 sequential Claude Code instances (which uses API credits)

**Recommendations**:
1. Run in a clean git branch
2. Review changes before pushing to main
3. Have a backup of your work
4. Monitor the first few runs to ensure agents behave as expected

## Cost Considerations

Each run spawns 3 Claude Code instances that will:
- Read multiple files
- Write code
- Run tests
- Make commits

This uses API credits. Monitor your usage if running frequently.

## Customization

You can customize the agent prompts by editing `orchestrator.sh`:
- Modify agent instructions
- Add additional agents
- Change the roadmap parsing logic
- Adjust commit message format

## Testing

The test completed successfully for Phase 2, Group A, first feature:
- ✅ "Daily check-in prompts" was marked as DONE
- ✅ Script syntax validated
- ✅ All prerequisites verified

## Philosophy

This orchestrator embodies the solarpunk principle of **automation for liberation**:
- Automates repetitive development tasks
- Frees developers to focus on design and community engagement
- Ensures consistent quality and testing
- Documents progress transparently in the roadmap

## Limitations

- Agents run sequentially (not in parallel) to maintain dependencies
- Requires internet connection for API access
- Cannot handle merge conflicts automatically
- Works best with well-defined specifications

## Future Enhancements

Possible improvements:
- Add parallel execution for independent features
- Implement rollback on failure
- Add agent coordination logs
- Create dashboard for monitoring progress
- Add approval gates between phases

---

🌻 Built for the Solarpunk Utopia Platform
✊ Liberation through automation
