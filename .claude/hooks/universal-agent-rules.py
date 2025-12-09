#!/usr/bin/env python3
"""
Universal Claude Code UserPromptSubmit Hook
Automatically reminds Claude to use agents-manager for any task
AND adapts to different project types based on settings.json
"""
import json
import sys
import re
import os
from pathlib import Path

def load_project_settings():
    """Load project settings from .claude/settings.json"""
    try:
        settings_path = Path(".claude/settings.json")
        if settings_path.exists():
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                return settings.get("projectSettings", {})
    except Exception:
        pass
    return {}

# Load user prompt from stdin
input_data = json.load(sys.stdin)
user_prompt = input_data.get("prompt", "").lower()

# Load project settings
project_settings = load_project_settings()
project_type = project_settings.get("type", "general")
framework = project_settings.get("framework", "")
language = project_settings.get("language", "")

# Base keywords that should trigger agents-manager
base_task_keywords = [
    # Features
    "new feature", "implement", "add feature", "create feature",
    # Bugs
    "bug", "error", "broken", "not working", "issue", "problem", "fix",
    # Deployment
    "deploy", "deployment", "staging", "production", "push",
    # Code operations
    "commit", "refactor", "architecture", "redesign",
    # Quality
    "test", "quality", "review", "check"
]

# Project-specific keywords
project_keywords = []

# Add framework-specific keywords
if framework == "next.js" or framework == "nextjs":
    project_keywords.extend([
        "next.js", "nextjs", "react", "jsx", "tsx", "component",
        "typescript error", "type error", "compilation error",
        r"ts\d{4}"
    ])
elif framework == "fastapi":
    project_keywords.extend([
        "fastapi", "uvicorn", "pydantic", "sqlalchemy", "alembic",
        "python error", "import error", "module not found"
    ])

# Add language-specific keywords
if language == "python":
    project_keywords.extend([
        "python", "pip", "poetry", "pytest", "virtualenv",
        "requirements.txt", "pyproject.toml"
    ])
elif language == "typescript" or "typescript" in framework:
    project_keywords.extend([
        "typescript", "tsc", "eslint", "jest", "npm", "yarn"
    ])

# Combine all task keywords
task_keywords = base_task_keywords + project_keywords

# GCP keywords that require configuration verification
gcp_keywords = [
    "gcloud", "cloud run", "cloud sql", "deploy", "deployment",
    "staging", "production", "vertex ai", "secret manager",
    "terraform", "infrastructure", "cloud build", "artifact registry"
]

# Simple questions that don't need agents-manager
simple_questions = [
    "what is", "what's", "how do i", "where is", "where's",
    "explain", "show me", "查看", "看", "是什麼"
]

# Follow-up task indicators
followup_indicators = [
    "also", "然後", "另外", "and then", "after that", "接著",
    "additionally", "furthermore", "moreover", "plus"
]

# Urgent task indicators
urgent_indicators = [
    "urgent", "critical", "broken", "emergency", "緊急", "立即",
    "immediately", "asap", "production down", "outage"
]

# Batch operation indicators
batch_indicators = [
    "all", "every", "each", "batch", "全部", "所有",
    "multiple", "several", "各個", "一起"
]

# Check for GCP keywords
is_gcp_operation = any(keyword in user_prompt for keyword in gcp_keywords)

# Check for task keywords
is_task = False
for keyword in task_keywords:
    if "\\" in keyword or keyword.startswith("ts"):
        if re.search(keyword, user_prompt):
            is_task = True
            break
    else:
        if keyword in user_prompt:
            is_task = True
            break

is_simple_question = any(q in user_prompt for q in simple_questions)

# Check for follow-up tasks
has_followup = any(indicator in user_prompt for indicator in followup_indicators)

# Check for urgent tasks
is_urgent = any(indicator in user_prompt for indicator in urgent_indicators)

# Check for batch operations
is_batch = any(indicator in user_prompt for indicator in batch_indicators)

# Build context output
context_parts = []

# Project context
if project_settings:
    project_name = project_settings.get("name", "unknown")
    context_parts.append(f"""
📋 PROJECT CONTEXT: {project_name}
   Type: {project_type}
   Framework: {framework}
   Language: {language}
""")

# GCP configuration verification (HIGHEST PRIORITY)
if is_gcp_operation:
    context_parts.append("""
☁️ GCP OPERATION DETECTED → Verify Configuration FIRST

⚠️ CRITICAL PRE-CHECK:
   1. Verify gcloud configuration:
      gcloud config list

   2. Expected values:
      - project = ai-square-463013
      - account = youngtsai@junyiacademy.org
      - region = asia-east1

   3. If incorrect, use gcp-config-manager:
      Task(
          subagent_type="gcp-config-manager",
          description="Fix GCP configuration",
          prompt="Ensure gcloud is configured with project ai-square-463013, account youngtsai@junyiacademy.org, region asia-east1"
      )

DO NOT execute GCP commands with wrong configuration!
""")

# Task routing to agents-manager
if is_task and not is_simple_question:
    context_parts.append(f"""
🤖 TASK DETECTED → Use agents-manager

⚡ MANDATORY ACTION:
   Task(
       subagent_type="agents-manager",
       description="[brief task description]",
       prompt="[detailed explanation of task]"
   )

The agents-manager will:
✓ Analyze the task for {project_type} project
✓ Call appropriate specialized agents
✓ Consider {framework} framework specifics
✓ Ensure quality standards are met
✓ Coordinate multiple agents if needed

DO NOT proceed without launching agents-manager.
""")

# Add intelligent task detection suggestions
if is_task and not is_simple_question:
    suggestions = []

    # Urgent task handling
    if is_urgent:
        suggestions.append("""
🚨 URGENT TASK DETECTED → Prioritize immediate action

⚡ URGENT MODE:
   1. Skip extended analysis - act quickly
   2. Use deployment-master-agent for production issues
   3. Check logs immediately: gh run view --log-failed
   4. Prepare rollback plan while fixing

Remember: "不要解釋，直接修復！" (Don't explain, just fix!)
""")

    # Multiple tasks handling
    if has_followup:
        suggestions.append("""
📋 MULTIPLE TASKS DETECTED → Consider task sequencing

⚡ OPTIMIZATION SUGGESTION:
   1. Identify independent vs dependent tasks
   2. For independent tasks: Run agents in parallel
      Example:
      Task(subagent_type="security-audit-agent", ...)
      Task(subagent_type="documentation-sync-agent", ...)

   3. For dependent tasks: Run sequentially
      Example: quality → deployment → monitoring

See CLAUDE.md section "⚡ Parallel Agent Execution" for safe combinations.
""")

    # Batch operations handling
    if is_batch:
        suggestions.append("""
🔄 BATCH OPERATION DETECTED → Consider parallel execution

⚡ PARALLEL EXECUTION STRATEGY:
   1. Check if items are independent
   2. If yes, use parallel Task calls for 30% speed boost
   3. Safe parallel combinations:
      - Testing + Performance
      - Security + Documentation
      - Database + Monitoring
      - Quality + Architecture

   4. For large batches, consider headless mode:
      claude -p "process all files"

Avoid sequential processing when parallel is safe!
""")

    if suggestions:
        context_parts.extend(suggestions)

# Output final context
if context_parts:
    print("\n".join(context_parts))
else:
    print("✅ Simple question detected - proceed with direct answer")

sys.exit(0)
