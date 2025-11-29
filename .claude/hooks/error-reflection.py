#!/usr/bin/env python3
"""
Claude Code Error Reflection Hook
Detects errors in output and triggers reflection mechanism
"""
import json
import sys
import re
from datetime import datetime

# Load output from stdin
try:
    input_data = json.load(sys.stdin)
    output_text = input_data.get("output", "").lower()
except:
    # If not JSON, treat as plain text
    output_text = sys.stdin.read().lower()

# Error indicators that trigger reflection
error_indicators = [
    # English
    "error", "failed", "failure", "exception", "crash", "broken",
    "undefined", "not found", "cannot", "unable", "invalid",
    # TypeScript specific
    r"ts\d{4}", "type error", "compilation error",
    # Test specific
    "test failed", "tests failed", "failing",
    # Deployment specific
    "deployment failed", "build failed", "connection refused",
    # Chinese
    "錯誤", "失敗", "異常", "無法", "找不到"
]

# Success indicators (don't trigger reflection)
success_indicators = [
    "success", "passed", "completed", "deployed successfully",
    "all tests pass", "build success", "成功", "通過"
]

# Check if output contains errors
has_error = False
error_type = None
error_details = []

for indicator in error_indicators:
    if "\\" in indicator:  # Regex pattern
        if re.search(indicator, output_text):
            has_error = True
            error_type = "TypeScript" if "ts" in indicator else "Unknown"
            error_details.append(f"Pattern: {indicator}")
            break
    else:
        if indicator in output_text:
            has_error = True
            # Classify error type
            if any(ts in indicator for ts in ["ts", "type", "compilation"]):
                error_type = "TypeScript"
            elif any(test in indicator for test in ["test", "failing"]):
                error_type = "Testing"
            elif any(deploy in indicator for deploy in ["deploy", "build"]):
                error_type = "Deployment"
            elif any(conn in indicator for conn in ["connection", "database"]):
                error_type = "Configuration"
            else:
                error_type = "General"
            error_details.append(f"Keyword: {indicator}")
            break

# Check if it's actually a success (override error detection)
is_success = any(indicator in output_text for indicator in success_indicators)
if is_success:
    has_error = False

# If error detected, trigger reflection
if has_error:
    reflection_prompt = f"""
🔴 ERROR DETECTED → Triggering Error Reflection

⚠️ ERROR REFLECTION REQUIRED:
   Type: {error_type}
   Indicators: {', '.join(error_details)}
   Time: {datetime.now().isoformat()}

📋 MANDATORY REFLECTION STEPS:
   1. Analyze root cause
   2. Identify what could have prevented this
   3. Propose improvements to:
      - Relevant agents
      - CLAUDE.md rules
      - Commands or hooks
      - Testing strategies

   4. Update .claude/learning/error-patterns.json
   5. Create prevention rule

🤖 LAUNCH ERROR REFLECTION:
   Task(
       subagent_type="error-reflection-agent",
       description="Analyze and learn from {error_type} error",
       prompt="Perform deep reflection on the error, identify root cause, and propose system improvements"
   )

💡 REMEMBER: Every error is a learning opportunity!

After reflection, ask yourself:
- Could better agent coordination have prevented this?
- Is there a missing skill or capability?
- Should we add a new command or automation?
- Does CLAUDE.md need updated rules?

The goal: This exact error should never happen again.
"""
    print(reflection_prompt)

    # Also update error patterns file (simple tracking)
    try:
        import os
        patterns_file = os.path.expanduser("~/.claude/learning/error-patterns.json")
        if os.path.exists(patterns_file):
            with open(patterns_file, 'r') as f:
                data = json.load(f)

            # Update statistics
            data["statistics"]["totalErrors"] += 1
            data["statistics"]["lastUpdated"] = datetime.now().isoformat()

            # Find matching pattern and update
            for pattern in data["patterns"]:
                if pattern["type"] == error_type:
                    pattern["occurrences"] += 1
                    pattern["lastSeen"] = datetime.now().isoformat()
                    break

            with open(patterns_file, 'w') as f:
                json.dump(data, f, indent=2)
    except:
        pass  # Silent fail for file operations

else:
    # No error detected, but check for improvement opportunities
    improvement_keywords = ["slow", "could be better", "optimize", "improve", "enhance"]

    needs_improvement = any(keyword in output_text for keyword in improvement_keywords)

    if needs_improvement:
        print("""
💡 IMPROVEMENT OPPORTUNITY DETECTED

Consider running performance analysis:
   Task(
       subagent_type="performance-optimization-agent",
       description="Analyze and optimize performance",
       prompt="Identify bottlenecks and propose optimizations"
   )
""")

sys.exit(0)