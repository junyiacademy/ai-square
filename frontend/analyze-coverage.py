#!/usr/bin/env python3
import json
import sys

with open('coverage/coverage-summary.json', 'r') as f:
    data = json.load(f)

files = []
for k, v in data.items():
    if k != 'total':
        files.append((v['lines']['pct'], v['lines']['total'] - v['lines']['covered'], k))

# Sort by coverage percentage
files.sort()

print("Files with lowest coverage (need testing):")
print("=" * 80)
print(f"{'Coverage':<10} {'Uncovered Lines':<15} File")
print("-" * 80)

for pct, uncovered, file in files[:30]:
    filename = file.split("/")[-1]
    print(f"{pct:6.2f}%    {uncovered:<15} {filename}")

print("\n" + "=" * 80)
print(f"Current Total Coverage: {data['total']['lines']['pct']:.2f}%")
print(f"Target Coverage: 80.00%")
print(f"Gap: {80.00 - data['total']['lines']['pct']:.2f}%")
print(f"Lines to cover: {data['total']['lines']['total'] * 0.8 - data['total']['lines']['covered']:.0f}")