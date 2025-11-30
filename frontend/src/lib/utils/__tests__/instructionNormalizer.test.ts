import { normalizeInstructions } from '../instructionNormalizer';

describe('normalizeInstructions', () => {
  it('should handle string input', () => {
    const result = normalizeInstructions('Single instruction', 'en');
    expect(result).toEqual(['Single instruction']);
  });

  it('should handle string array input', () => {
    const result = normalizeInstructions(['Step 1', 'Step 2', 'Step 3'], 'en');
    expect(result).toEqual(['Step 1', 'Step 2', 'Step 3']);
  });

  it('should handle multilingual object (Record<string, string>)', () => {
    const input = {
      en: 'English instruction',
      zh: '中文說明'
    };
    expect(normalizeInstructions(input, 'en')).toEqual(['English instruction']);
    expect(normalizeInstructions(input, 'zh')).toEqual(['中文說明']);
  });

  it('should handle multilingual arrays (Record<string, string[]>)', () => {
    const input = {
      en: ['Step 1', 'Step 2'],
      zh: ['步驟 1', '步驟 2']
    };
    expect(normalizeInstructions(input, 'en')).toEqual(['Step 1', 'Step 2']);
    expect(normalizeInstructions(input, 'zh')).toEqual(['步驟 1', '步驟 2']);
  });

  it('should fallback to English when language not found', () => {
    const input = {
      en: 'English instruction',
      zh: '中文說明'
    };
    expect(normalizeInstructions(input, 'fr')).toEqual(['English instruction']);
  });

  it('should handle array of objects with text property', () => {
    const input = [
      { text: 'Instruction 1' },
      { text: 'Instruction 2' }
    ];
    expect(normalizeInstructions(input, 'en')).toEqual(['Instruction 1', 'Instruction 2']);
  });

  it('should handle array of multilingual objects', () => {
    const input = [
      { en: 'Step 1', zh: '步驟 1' },
      { en: 'Step 2', zh: '步驟 2' }
    ];
    expect(normalizeInstructions(input, 'en')).toEqual(['Step 1', 'Step 2']);
    expect(normalizeInstructions(input, 'zh')).toEqual(['步驟 1', '步驟 2']);
  });

  it('should handle array of objects with content property', () => {
    const input = [
      { content: 'Content 1' },
      { content: 'Content 2' }
    ];
    expect(normalizeInstructions(input, 'en')).toEqual(['Content 1', 'Content 2']);
  });

  it('should filter out empty strings', () => {
    const input = ['Step 1', '', '   ', 'Step 2'];
    expect(normalizeInstructions(input, 'en')).toEqual(['Step 1', 'Step 2']);
  });

  it('should skip objects that cannot be converted to strings', () => {
    const input = [
      'Valid string',
      { invalid: 'object' },
      'Another valid string'
    ];
    expect(normalizeInstructions(input, 'en')).toEqual(['Valid string', 'Another valid string']);
  });

  it('should check nested array fields (items, list, steps, instructions)', () => {
    const input = {
      items: ['Item 1', 'Item 2']
    };
    expect(normalizeInstructions(input, 'en')).toEqual(['Item 1', 'Item 2']);
  });

  it('should return empty array for null/undefined', () => {
    expect(normalizeInstructions(null, 'en')).toEqual([]);
    expect(normalizeInstructions(undefined, 'en')).toEqual([]);
  });

  it('should return empty array for unparseable objects', () => {
    const input = { random: 'data', without: 'recognized', fields: true };
    expect(normalizeInstructions(input, 'en')).toEqual([]);
  });
});
