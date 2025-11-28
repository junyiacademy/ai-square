---
name: context-check
description: Display current token usage and provide guidance on context management
color: blue
---

# Context Check Command

## Purpose
Monitor current conversation token usage and provide clear guidance on when to use `/clear` to prevent context pollution.

## What This Command Does

1. **Token Usage Analysis**
   - Reports current conversation token count
   - Calculates percentage of budget used
   - Provides clear status indicator

2. **Context Management Guidance**
   - GREEN: < 30k tokens - Context is clean
   - YELLOW: 30k-50k tokens - Consider clearing soon
   - ORANGE: 50k-70k tokens - Should clear before next major task
   - RED: > 70k tokens - Clear immediately

3. **Actionable Recommendations**
   - When to use `/clear`
   - What to save before clearing
   - How to preserve important context

## Usage

Simply invoke:
```
/context-check
```

## Output Format

```
=== Context Health Report ===

Current Token Usage: 45,231 / 200,000 (22.6%)
Status: YELLOW - Consider clearing soon

Recommendations:
- Finish current task
- Use /clear before starting next feature
- Save important decisions in documentation

Context Pollution Risk: MEDIUM
Suggestion: Clear context after completing current work
```

## Implementation

Check the conversation's token budget and provide actionable guidance:

1. Read current token count from system
2. Calculate risk level
3. Provide specific next steps
4. Remind about best practices from Anthropic

## When to Use /clear

Based on Anthropic's 2025 best practices:

- **Before new feature**: Start with clean context
- **Before bug fixing**: Avoid mixing contexts
- **When > 50k tokens**: Prevent accuracy degradation
- **When switching focus**: Clean mental model

## What to Save First

Before using `/clear`:
1. Update documentation with key decisions
2. Commit code changes
3. Note any pending tasks in TODO.md or issues
4. Save important error messages or patterns discovered

## Context Pollution Signs

Warning signs that `/clear` is needed:
- Responses reference unrelated previous tasks
- Instructions getting ignored
- Inconsistent coding patterns
- Decreased response accuracy

## Related Best Practices

- Use Plan Mode for complex multi-file changes
- Use subagents for investigations
- Keep focused on one task at a time
- Document decisions before clearing

---

**Note**: This command helps implement Anthropic's research-backed best practice of frequent context clearing to maintain high accuracy and reduce token waste.
