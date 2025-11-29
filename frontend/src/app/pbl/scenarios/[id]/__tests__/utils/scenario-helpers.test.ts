import { normalizeInstructions, getDifficultyBadge, getCategoryIcon } from '../../utils/scenario-helpers';

describe('normalizeInstructions', () => {
  describe('array inputs', () => {
    it('returns array of strings when input is string array', () => {
      const input = ['Step 1', 'Step 2', 'Step 3'];
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Step 1', 'Step 2', 'Step 3']);
    });

    it('filters out empty strings and whitespace', () => {
      const input = ['Step 1', '   ', '', 'Step 2'];
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Step 1', 'Step 2']);
    });

    it('extracts text property from objects in array', () => {
      const input = [
        { text: 'Instruction 1' },
        { text: 'Instruction 2' }
      ];
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Instruction 1', 'Instruction 2']);
    });

    it('extracts language-specific content from objects', () => {
      const input = [
        { en: 'English text', zh: '中文文本' },
        { en: 'Second item', zh: '第二項' }
      ];
      expect(normalizeInstructions(input, 'en')).toEqual(['English text', 'Second item']);
      expect(normalizeInstructions(input, 'zh')).toEqual(['中文文本', '第二項']);
    });

    it('falls back to English when language not found', () => {
      const input = [{ en: 'English fallback' }];
      const result = normalizeInstructions(input, 'fr');
      expect(result).toEqual(['English fallback']);
    });

    it('extracts content property from objects', () => {
      const input = [{ content: 'Content text' }];
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Content text']);
    });

    it('filters out non-string objects without extractable properties', () => {
      const input = [
        'Valid string',
        { random: 'object' },
        { text: 'Valid object' }
      ];
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Valid string', 'Valid object']);
    });
  });

  describe('single string inputs', () => {
    it('returns array with single string', () => {
      const result = normalizeInstructions('Single instruction', 'en');
      expect(result).toEqual(['Single instruction']);
    });
  });

  describe('object inputs (multilingual)', () => {
    it('returns language-specific array', () => {
      const input = {
        en: ['Step 1', 'Step 2'],
        zh: ['步驟 1', '步驟 2']
      };
      expect(normalizeInstructions(input, 'en')).toEqual(['Step 1', 'Step 2']);
      expect(normalizeInstructions(input, 'zh')).toEqual(['步驟 1', '步驟 2']);
    });

    it('returns language-specific string as array', () => {
      const input = {
        en: 'Single step',
        zh: '單一步驟'
      };
      expect(normalizeInstructions(input, 'en')).toEqual(['Single step']);
      expect(normalizeInstructions(input, 'zh')).toEqual(['單一步驟']);
    });

    it('searches nested array fields (items, list, steps, instructions)', () => {
      const input = {
        items: ['Item 1', 'Item 2']
      };
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Item 1', 'Item 2']);
    });

    it('prioritizes language-specific field over nested arrays', () => {
      const input = {
        en: ['English step'],
        items: ['Generic item']
      };
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['English step']);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for null', () => {
      const result = normalizeInstructions(null, 'en');
      expect(result).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      const result = normalizeInstructions(undefined, 'en');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty object', () => {
      const result = normalizeInstructions({}, 'en');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      const result = normalizeInstructions([], 'en');
      expect(result).toEqual([]);
    });

    it('handles deeply nested multilingual objects', () => {
      const input = {
        steps: [
          { en: 'Step 1', zh: '步驟 1' },
          { en: 'Step 2', zh: '步驟 2' }
        ]
      };
      const result = normalizeInstructions(input, 'en');
      expect(result).toEqual(['Step 1', 'Step 2']);
    });
  });
});

describe('getDifficultyBadge', () => {
  it('returns green badge for beginner', () => {
    const result = getDifficultyBadge('beginner');
    expect(result).toContain('bg-green-100');
    expect(result).toContain('text-green-800');
  });

  it('returns yellow badge for intermediate', () => {
    const result = getDifficultyBadge('intermediate');
    expect(result).toContain('bg-yellow-100');
    expect(result).toContain('text-yellow-800');
  });

  it('returns red badge for advanced', () => {
    const result = getDifficultyBadge('advanced');
    expect(result).toContain('bg-red-100');
    expect(result).toContain('text-red-800');
  });

  it('returns gray badge for unknown difficulty', () => {
    const result = getDifficultyBadge('unknown');
    expect(result).toContain('bg-gray-100');
    expect(result).toContain('text-gray-800');
  });

  it('includes dark mode classes', () => {
    const result = getDifficultyBadge('beginner');
    expect(result).toContain('dark:bg-green-900');
    expect(result).toContain('dark:text-green-200');
  });
});

describe('getCategoryIcon', () => {
  it('returns correct icon for analysis', () => {
    expect(getCategoryIcon('analysis')).toBe('📊');
  });

  it('returns correct icon for creation', () => {
    expect(getCategoryIcon('creation')).toBe('✨');
  });

  it('returns correct icon for evaluation', () => {
    expect(getCategoryIcon('evaluation')).toBe('🔍');
  });

  it('returns correct icon for application', () => {
    expect(getCategoryIcon('application')).toBe('🚀');
  });

  it('returns default icon for unknown category', () => {
    expect(getCategoryIcon('unknown')).toBe('📝');
  });
});
