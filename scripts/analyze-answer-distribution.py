#!/usr/bin/env python3
"""
Analyze answer distribution in assessment question banks.
Identifies pattern bias that allows students to game the system.
"""

import yaml
import sys
from pathlib import Path
from collections import Counter
from typing import Dict, List

def analyze_question_file(filepath: Path) -> Dict:
    """Analyze a single question file for answer distribution."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    answers = []
    questions_detail = []

    if 'tasks' not in data:
        return {
            'total': 0,
            'distribution': {},
            'questions': [],
            'has_bias': False
        }

    for task in data['tasks']:
        if 'questions' not in task:
            continue
        for q in task['questions']:
            answer = q.get('correct_answer', '').lower()
            answers.append(answer)
            questions_detail.append({
                'id': q.get('id'),
                'domain': q.get('domain'),
                'difficulty': q.get('difficulty'),
                'answer': answer,
                'question': q.get('question', '')[:60] + '...'
            })

    distribution = Counter(answers)
    total = len(answers)

    # Check for bias: if any answer appears > 40% of the time
    has_bias = any(count > total * 0.4 for count in distribution.values())

    return {
        'total': total,
        'distribution': dict(distribution),
        'percentages': {k: (v/total*100) for k, v in distribution.items()} if total > 0 else {},
        'questions': questions_detail,
        'has_bias': has_bias
    }

def print_analysis(filename: str, analysis: Dict):
    """Print analysis in readable format."""
    print(f"\n{'='*60}")
    print(f"File: {filename}")
    print(f"{'='*60}")
    print(f"Total Questions: {analysis['total']}")

    if analysis['total'] == 0:
        print("⚠️  No questions found")
        return

    print("\nAnswer Distribution:")
    for option in ['a', 'b', 'c', 'd']:
        count = analysis['distribution'].get(option, 0)
        pct = analysis['percentages'].get(option, 0)
        bar = '█' * int(pct / 5)
        status = '✅' if 20 <= pct <= 30 else '⚠️' if pct > 0 else '❌'
        print(f"  {status} Option {option.upper()}: {count:2d} ({pct:5.1f}%) {bar}")

    if analysis['has_bias']:
        print("\n🚨 CRITICAL: PATTERN BIAS DETECTED!")
        print("   Students can game the test by selecting the same option repeatedly.")
    else:
        print("\n✅ Answer distribution is balanced")

    print("\nQuestion Details:")
    for q in analysis['questions']:
        print(f"  {q['id']:6s} | {q['difficulty']:12s} | Answer: {q['answer'].upper()} | {q['question']}")

def main():
    # Analyze English version (source of truth)
    base_path = Path(__file__).parent.parent / 'frontend' / 'public' / 'assessment_data' / 'ai_literacy'
    en_file = base_path / 'ai_literacy_questions_en.yaml'

    if not en_file.exists():
        print(f"❌ File not found: {en_file}")
        sys.exit(1)

    analysis = analyze_question_file(en_file)
    print_analysis(en_file.name, analysis)

    # Print recommendations
    print(f"\n{'='*60}")
    print("RECOMMENDATIONS")
    print(f"{'='*60}")
    print("\n1. Target Distribution (for 12 questions):")
    print("   - Option A: 3 questions (25%)")
    print("   - Option B: 3 questions (25%)")
    print("   - Option C: 3 questions (25%)")
    print("   - Option D: 3 questions (25%)")

    print("\n2. Acceptable Range: 20-30% per option")

    print("\n3. Redistribution Strategy:")
    print("   - Review each question independently")
    print("   - Ensure correct answer makes logical sense")
    print("   - Avoid creating new patterns (e.g., ABCDABCDABCD)")
    print("   - Randomize while maintaining balance")

    print("\n4. Quality Checks:")
    print("   - Verify answer explanations still match")
    print("   - Ensure no correlation between difficulty and answer")
    print("   - Test that questions still assess knowledge accurately")

    if analysis['has_bias']:
        sys.exit(1)  # Exit with error code if bias detected

    sys.exit(0)

if __name__ == '__main__':
    main()
