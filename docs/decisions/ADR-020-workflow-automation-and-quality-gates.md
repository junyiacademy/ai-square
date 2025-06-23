# ADR-020: Workflow Automation and Quality Gates

## Status
Accepted

## Context
During development on 2025-06-23, several critical workflow issues were identified:
1. Tests were not being executed during development or before commits
2. Changelog updates were not integrated into the commit workflow
3. Direct git commands bypassed established quality checks
4. No protection against pushing failing code to remote repository

These issues led to:
- Broken tests being committed and pushed
- Missing changelog entries for important changes
- Inconsistent code quality
- Workflow violations by AI assistants

## Decision
We have implemented a comprehensive workflow automation system with multiple quality gates:

### 1. Pre-commit Checks (via Makefile)
- **Test Execution**: All tests must pass before commit
- **Linting**: Code must pass ESLint/ruff checks
- **Type Checking**: TypeScript must compile without errors
- **Infrastructure Change Detection**: Allows test waivers for workflow improvements

### 2. Post-commit Automation
- **Changelog Updates**: Automatic for feat/fix/perf commits
- **Documentation Generation**: Dev logs and documentation updates
- **Commit Hash Recording**: For traceability

### 3. Pre-push Hook
- **Final Safety Net**: Prevents pushing failing code
- **Security Scanning**: Checks for sensitive information
- **Commit Message Validation**: Ensures conventional commits
- **Build Verification**: Confirms project builds successfully

### 4. CI/CD Pipeline (GitHub Actions)
- **Multi-version Testing**: Node.js 18.x and 20.x
- **Coverage Reporting**: Track test coverage trends
- **Security Audits**: npm audit for vulnerabilities
- **Documentation Validation**: Ensure required docs exist

### 5. AI Assistant Rules (CLAUDE.md)
- **Forbidden Commands**: Direct git add/commit commands
- **Required Workflow**: Must use Makefile commands
- **Clear Examples**: Show proper commit procedures
- **Enforcement**: Refuse requests for direct git commands

## Implementation Details

### Makefile Integration
```makefile
# Standard commit with all checks
make commit-check

# Ticket-based development
make commit-ticket

# Manual test execution
make test-all

# Pre-push check without pushing
make pre-push-check

# Setup git hooks
make setup-hooks
```

### Test Waiver for Infrastructure
When improving the development workflow itself, tests may temporarily fail. The system detects infrastructure changes and allows waivers:
- Changes to test files, CI/CD, Makefile, or workflow scripts
- Marked as "Tests (waived)" in check summary
- Prevents blocking necessary improvements

### Changelog Automation
- Parses commit messages for type (feat, fix, perf)
- Updates docs/CHANGELOG.md automatically
- Groups changes by date
- Maintains conventional changelog format

## Consequences

### Positive
- **Quality Assurance**: Failing tests cannot reach production
- **Documentation**: Changelog always up-to-date
- **Consistency**: All commits follow same workflow
- **Protection**: Multiple layers prevent bad code
- **Automation**: Reduces manual steps and human error

### Negative
- **Initial Setup**: Requires running `make setup-hooks`
- **Learning Curve**: Team must understand Makefile workflow
- **Override Needed**: Sometimes `--no-verify` required for emergencies

### Trade-offs
- **Speed vs Safety**: Checks add time but prevent issues
- **Flexibility vs Consistency**: Enforced workflow may feel restrictive
- **Automation vs Control**: Some prefer manual changelog updates

## Lessons Learned
1. **AI Assistants Need Clear Rules**: Without explicit restrictions, AI may bypass workflows
2. **Multiple Gates Are Necessary**: Pre-commit, pre-push, and CI/CD catch different issues
3. **Infrastructure Changes Need Special Handling**: Workflow improvements shouldn't be blocked by temporarily failing tests
4. **Documentation Must Be Automatic**: Manual documentation updates are often forgotten

## References
- [Commit Workflow Story](../stories/2025-06-23-workflow-integration-lessons.md)
- [ADR-017: Dev Logs Structure](ADR-017-dev-logs-structure-and-standards.md)
- [Pre-push Hook Script](../scripts/pre-push-hook.sh)
- [Commit Guide Script](../scripts/commit-guide.py)
- [CLAUDE.md Rules](../../CLAUDE.md)

## Related Decisions
- ADR-014: Makefile-Based Development Workflow
- ADR-016: Ticket-Based Development with Time Tracking
- ADR-017: Dev Logs Structure and Standards