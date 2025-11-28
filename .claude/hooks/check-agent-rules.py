#!/usr/bin/env python3
"""
Claude Code UserPromptSubmit Hook
Automatically reminds Claude to use agents-manager for any task
AND ensures GCP configuration is correct before GCP operations
"""
import json
import sys
import re

# Load user prompt from stdin
input_data = json.load(sys.stdin)
user_prompt = input_data.get("prompt", "").lower()

# GCP keywords that require configuration verification
gcp_keywords = [
    "gcloud", "cloud run", "cloud sql", "deploy", "deployment",
    "staging", "production", "vertex ai", "secret manager",
    "terraform", "infrastructure", "cloud build", "artifact registry"
]

# Task keywords that should trigger agents-manager
task_keywords = [
    # Features
    "new feature", "implement", "add feature", "create feature",
    # Bugs
    "bug", "error", "broken", "not working", "issue", "problem", "fix",
    # Deployment
    "deploy", "deployment", "staging", "production", "push",
    # Code operations
    "commit", "refactor", "architecture", "redesign",
    # Quality
    "test", "quality", "review", "check",
    # TypeScript
    r"ts\d{4}", "typescript error", "type error", "compilation error"
]

# Simple questions that don't need agents-manager
simple_questions = [
    "what is", "what's", "how do i", "where is", "where's",
    "explain", "show me", "查看", "看", "是什麼"
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

# Build context output
context_parts = []

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
    context_parts.append("""
🤖 TASK DETECTED → Use agents-manager

⚡ MANDATORY ACTION:
   Task(
       subagent_type="agents-manager",
       description="[brief task description]",
       prompt="[detailed explanation of task]"
   )

The agents-manager will:
✓ Analyze the task
✓ Call appropriate specialized agents
✓ Ensure quality standards are met
✓ Coordinate multiple agents if needed

DO NOT proceed without launching agents-manager.
""")

# Output final context
if context_parts:
    print("\n".join(context_parts))
else:
    print("✅ Simple question detected - proceed with direct answer")

sys.exit(0)
