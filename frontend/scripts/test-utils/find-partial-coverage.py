#!/usr/bin/env python3
import json

with open('coverage/coverage-summary.json', 'r') as f:
    data = json.load(f)

# Find files with 50-75% coverage
partial = []
for k, v in data.items():
    if k != 'total' and 50 <= v['lines']['pct'] < 75:
        partial.append((v['lines']['pct'], v['lines']['total'] - v['lines']['covered'], k.split('/')[-1]))

partial.sort(key=lambda x: x[1])  # Sort by uncovered lines
print('Files with 50-75% coverage (easier to improve):')
print('=' * 60)
for pct, uncovered, file in partial[:15]:
    print(f'{pct:6.2f}%  {uncovered:4} lines  {file}')
