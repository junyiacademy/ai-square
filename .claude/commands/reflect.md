---
name: reflect
description: Manually trigger error reflection and continuous improvement analysis
---

# /reflect - Error Reflection & Continuous Improvement

Trigger deep reflection on recent errors and generate improvement proposals.

## Usage

```
/reflect                    # Reflect on most recent error
/reflect --all             # Analyze all errors today
/reflect --week            # Weekly error analysis
/reflect --improve [area]  # Focus on specific area (agents/commands/skills)
```

## What It Does

1. **Analyzes Error Patterns**
   - Reviews `.claude/learning/error-patterns.json`
   - Identifies recurring issues
   - Suggests prevention strategies

2. **Evaluates System Performance**
   - Checks agent effectiveness
   - Reviews command usage
   - Analyzes skill gaps

3. **Generates Improvement Plan**
   - Proposes agent optimizations
   - Suggests new commands
   - Updates CLAUDE.md rules
   - Creates learning records

## Reflection Process

### Step 1: Error Analysis
- Classify recent errors by type
- Identify root causes
- Track frequency and patterns

### Step 2: System Evaluation
- Which agents failed to prevent errors?
- What skills are missing?
- Which commands could help?

### Step 3: Improvement Proposals
- Agent enhancements
- New automation rules
- Documentation updates
- Testing improvements

### Step 4: Implementation
- Update relevant configurations
- Create new commands if needed
- Enhance agent capabilities
- Document learnings

## Output Example

```markdown
## Reflection Report - 2025-11-29

### Errors Analyzed: 3

1. **TypeScript Error (2 occurrences)**
   - Root Cause: Missing await on Next.js 15 params
   - Prevention: Updated CLAUDE.md with examples
   - Agent Update: Enhanced quality-guardian-agent

2. **Deployment Failure (1 occurrence)**
   - Root Cause: GCP region mismatch
   - Prevention: Added pre-deployment check
   - Agent Update: Strengthened deployment-master-agent

### Improvements Implemented
✅ Added 2 new validation rules
✅ Enhanced 3 agents
✅ Created 1 new command
✅ Updated documentation

### Metrics
- Error Reduction: 60% vs last week
- Resolution Time: -40% faster
- Automation Level: 85% → 90%

### Next Steps
1. Monitor TypeScript errors for next 3 days
2. Test new deployment checks in staging
3. Review agent performance metrics
```

## Integration Points

- **error-reflection-agent**: Primary analysis engine
- **Learning System**: Updates `.claude/learning/*.json`
- **Hooks**: Can trigger from error detection
- **CLAUDE.md**: Updates rules based on learnings

## Best Practices

1. **Reflect Regularly**: Don't wait for major failures
2. **Act on Insights**: Implement improvements immediately
3. **Track Progress**: Monitor if improvements work
4. **Share Learnings**: Update team documentation

## Related Commands

- `/weekly-review` - Comprehensive weekly analysis
- `/context-check` - Monitor token usage
- `/visual-test` - Test UI changes

---

**Philosophy**: "每个错误都是学习机会" (Every error is a learning opportunity)