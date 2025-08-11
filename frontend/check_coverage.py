import json
import os

# Check if coverage file exists
coverage_file = 'coverage/coverage-summary.json'
if not os.path.exists(coverage_file):
    print("No coverage file found. Running limited test to generate...")
else:
    with open(coverage_file, 'r') as f:
        data = json.load(f)
        total = data.get('total', {})
        lines = total.get('lines', {})
        print(f"Current Test Coverage:")
        print(f"  Lines: {lines.get('pct', 0):.2f}%")
        print(f"  Statements: {total.get('statements', {}).get('pct', 0):.2f}%")
        print(f"  Functions: {total.get('functions', {}).get('pct', 0):.2f}%")
        print(f"  Branches: {total.get('branches', {}).get('pct', 0):.2f}%")
        
        target = 80.0
        current = lines.get('pct', 0)
        if current >= target:
            print(f"\n✅ Target of {target}% achieved\!")
        else:
            gap = target - current
            total_lines = lines.get('total', 0)
            covered_lines = lines.get('covered', 0)
            lines_needed = int(total_lines * target / 100) - covered_lines
            print(f"\n📊 Gap to {target}%: {gap:.2f}%")
            print(f"   Lines needed: {lines_needed}")
