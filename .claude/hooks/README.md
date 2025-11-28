# Claude Code Hooks - AI Square

This directory contains hooks that automatically enhance Claude's behavior.

## 🎯 check-agent-rules.py

**Purpose**:
1. Automatically detects when agents should be used and reminds Claude
2. Ensures GCP configuration is correct before any GCP operations

**Type**: UserPromptSubmit hook (runs before Claude processes user prompt)

**How it works**:
1. User submits a prompt
2. Hook script scans for trigger keywords
3. If GCP keywords detected → Adds GCP configuration pre-check (HIGHEST PRIORITY)
4. If task keywords detected → Adds agents-manager reminder
5. Claude sees the reminders and follows them

### GCP Configuration Pre-Check (NEW!)

**When triggered**: User prompt contains GCP-related keywords

**GCP Keywords**:
- `gcloud`, `cloud run`, `cloud sql`
- `deploy`, `deployment`, `staging`, `production`
- `vertex ai`, `secret manager`, `terraform`
- `infrastructure`, `cloud build`, `artifact registry`

**What happens**:
```
☁️ GCP OPERATION DETECTED → Verify Configuration FIRST

⚠️ CRITICAL PRE-CHECK:
   1. Verify gcloud configuration: gcloud config list
   2. Expected values:
      - project = ai-square-463013
      - account = youngtsai@junyiacademy.org
      - region = asia-east1
   3. If incorrect, use gcp-config-manager to fix
```

### Task Detection → agents-manager

**When triggered**: User prompt contains task-related keywords (excluding simple questions)

**Task Keywords**:
- Features: `new feature`, `implement`, `add feature`
- Bugs: `bug`, `error`, `broken`, `not working`, `issue`, `fix`
- Deployment: `deploy`, `deployment`, `staging`, `production`
- Code ops: `commit`, `refactor`, `architecture`
- Quality: `test`, `quality`, `review`, `check`
- TypeScript: `TS####`, `typescript error`, `type error`

### Example Outputs

**Example 1: GCP Operation Detected**

**User says**: "Ready to deploy to staging"

**Hook adds**:
```
☁️ GCP OPERATION DETECTED → Verify Configuration FIRST

⚠️ CRITICAL PRE-CHECK:
   1. Verify gcloud configuration: gcloud config list
   2. Expected values:
      - project = ai-square-463013
      - account = youngtsai@junyiacademy.org
      - region = asia-east1
   3. If incorrect, use gcp-config-manager to fix

🤖 TASK DETECTED → Use agents-manager
⚡ MANDATORY ACTION: Task(subagent_type="agents-manager", ...)
```

**Example 2: Task Only (No GCP)**

**User says**: "Fix the TypeScript errors"

**Hook adds**:
```
🤖 TASK DETECTED → Use agents-manager
⚡ MANDATORY ACTION: Task(subagent_type="agents-manager", ...)
```

**Example 3: Simple Question**

**User says**: "What's in the PRD?"

**Hook adds**:
```
✅ Simple question detected - proceed with direct answer
```

## 📝 Configuration

Hook is registered in `.claude/settings.json`:
```json
{
  "hooks": [
    {
      "matcher": "*",
      "hooks": [
        {
          "eventName": "UserPromptSubmit",
          "type": "command",
          "command": "./.claude/hooks/check-agent-rules.py",
          "timeout": 5
        }
      ]
    }
  ]
}
```

## 🧪 Testing

**Test GCP Pre-Check**:
1. Say: "I want to deploy to staging"
2. Check if Claude verifies `gcloud config list` FIRST
3. Verify Claude checks project/account/region

**Test Task Detection**:
1. Say: "Fix this bug"
2. Check if Claude uses agents-manager
3. Verify proper Task tool usage

**Test Simple Questions**:
1. Say: "What's the current architecture?"
2. Check if Claude answers directly (no agent trigger)

## 🔧 Maintenance

**Add new GCP keywords**:
1. Edit `check-agent-rules.py`
2. Add to `gcp_keywords` array
3. No restart needed (hooks reload automatically)

**Add new task keywords**:
1. Edit `check-agent-rules.py`
2. Add to `task_keywords` array
3. No restart needed

## ⚠️ Limitations

**Hook adds context, but doesn't force Claude to act**:
- Claude still needs to read and follow the reminder
- Estimated 80-90% compliance (not 100% guaranteed)
- User can manually remind Claude if needed

**GCP Pre-Check is a reminder, not enforcement**:
- Hook can't actually verify gcloud config (runs before Claude)
- Hook reminds Claude to check, then Claude executes `gcloud config list`
- If config is wrong, Claude should use gcp-config-manager to fix

## 📚 References

- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)
- [Project CLAUDE.md](../../CLAUDE.md) - Agent rules and workflows

---

**Version**: 1.0
**Last Updated**: 2025-01-27
