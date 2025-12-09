---
name: weekly-review
description: Comprehensive weekly review of errors, improvements, and optimization opportunities
---

# /weekly-review - Weekly Performance & Improvement Review

Generate comprehensive weekly analysis of development performance, error patterns, and improvement opportunities.

## Usage

```
/weekly-review              # Review current week
/weekly-review --compare    # Compare with previous week
/weekly-review --export     # Export detailed report
/weekly-review --focus [area]  # Focus on specific area
```

## Review Sections

### 1. 📊 Performance Metrics
- Tasks completed
- Errors encountered
- Token usage
- Agent utilization
- Parallel vs sequential execution ratio

### 2. 🔴 Error Analysis
- Top 5 most frequent errors
- New error types discovered
- Resolved vs unresolved issues
- Error trend (increasing/decreasing)

### 3. ✅ Improvements Made
- Agent optimizations
- New commands created
- CLAUDE.md updates
- Hook enhancements
- Process improvements

### 4. 🎯 Success Stories
- Complex problems solved
- Performance improvements
- Automation achievements
- Time saved through optimizations

### 5. 📈 Trends & Patterns
- User workflow patterns
- Common command sequences
- Peak productivity times
- Bottleneck identification

### 6. 🚀 Optimization Opportunities
- Agents that could be merged
- Commands that could be created
- Workflows that could be automated
- Parallel execution opportunities

### 7. 📝 Action Items
- Priority improvements for next week
- Technical debt to address
- Documentation to update
- Skills to develop

## Output Format

```markdown
# Weekly Review Report
**Period**: 2025-11-23 to 2025-11-29
**Generated**: 2025-11-29 18:00

## 📊 Executive Summary
- **Productivity**: ↑ 30% vs last week
- **Error Rate**: ↓ 45% vs last week
- **Automation Level**: 85% → 90%
- **Token Efficiency**: ↑ 25% improvement

## 🔴 Top Errors This Week
| Error Type | Count | Status | Prevention |
|------------|-------|--------|------------|
| TypeScript | 5 | Resolved | Updated quality-guardian-agent |
| Deployment | 2 | Resolved | Added pre-deploy checks |
| Testing | 1 | Pending | Investigating flaky tests |

## ✅ Major Improvements
1. **Agent Consolidation** (Nov 29)
   - Merged 4 agents into 2 unified agents
   - Result: 20% complexity reduction

2. **Parallel Execution** (Nov 29)
   - Added parallel agent execution rules
   - Result: 30% speed improvement

3. **Hook Intelligence** (Nov 29)
   - Enhanced error detection and suggestions
   - Result: Better automation decisions

## 🎯 Success Highlights
- ✨ Implemented Prompt-to-Course feature (Phase 1 & 2)
- ✨ Zero production incidents
- ✨ 100% test pass rate maintained
- ✨ Reduced deployment time by 40%

## 📈 Usage Patterns
**Most Used Agents**:
1. agents-manager (45 calls)
2. quality-guardian-agent (28 calls)
3. deployment-master-agent (15 calls)

**Common Workflows**:
1. Test → Build → Deploy (8 times)
2. Fix TypeScript → Run tests → Commit (6 times)
3. Review → Refactor → Test (5 times)

## 🚀 Recommendations for Next Week

### High Priority
1. **Implement Auto-Context Management**
   - Auto-clear when > 50k tokens
   - Estimated: 25% token savings

2. **Create Batch Testing Command**
   - Run all test types in parallel
   - Estimated: 40% faster testing

### Medium Priority
1. **Add Performance Monitoring Dashboard**
2. **Create Error Recovery Automation**

### Low Priority
1. **Document new workflow patterns**
2. **Update team training materials**

## 📊 Detailed Metrics

### Agent Performance
| Agent | Calls | Avg Time | Success Rate |
|-------|-------|----------|--------------|
| agents-manager | 45 | 2.3s | 100% |
| quality-guardian | 28 | 3.1s | 96% |
| deployment-master | 15 | 8.5s | 93% |

### Error Categories
- Code Quality: 40% (↓ from 60%)
- Deployment: 25% (↓ from 40%)
- Testing: 20% (→ stable)
- Configuration: 15% (↑ from 10%)

## 🎓 Learnings & Insights

1. **Parallel execution significantly improves speed**
   - Especially for independent testing and analysis tasks

2. **Proactive error reflection reduces recurrence**
   - Errors rarely repeat after proper reflection

3. **User prefers immediate action over explanation**
   - Adjusted response style accordingly

## 📝 Action Plan for Next Week

### Monday
- [ ] Implement auto-context management
- [ ] Review and update error patterns

### Tuesday-Thursday
- [ ] Create batch testing command
- [ ] Test parallel execution improvements

### Friday
- [ ] Generate next weekly review
- [ ] Update documentation with learnings

---

**Improvement Rate**: 📈 30% week-over-week
**Next Review**: 2025-12-06
```

## Data Sources

- `.claude/learning/error-patterns.json`
- `.claude/learning/improvements.json`
- `.claude/learning/performance-metrics.json`
- `.claude/learning/user-preferences.json`
- Git commit history
- Agent call logs

## Automation

This review can be automated to run every Friday at 5 PM:
```bash
# Add to crontab or GitHub Actions
0 17 * * 5 claude --command /weekly-review --export
```

## Integration with Slack

Send summary to Slack:
```bash
/weekly-review --export --slack
```

## Related Commands

- `/reflect` - Manual error reflection
- `/context-check` - Token usage analysis
- `/visual-test` - UI testing workflow

---

**Goal**: Continuous improvement through data-driven insights