/**
 * @jest-environment jsdom
 */
import { processInstructions, processDescription, processExpectedOutcome } from '../pbl-instructions';

describe('processInstructions', () => {
  describe('字串格式處理', () => {
    test('單行字串', () => {
      const input = "這是一個任務指示";
      const result = processInstructions(input);
      expect(result).toEqual(["這是一個任務指示"]);
    });

    test('多行字串 - 按換行分割', () => {
      const input = "第一行指示\n第二行指示\n第三行指示";
      const result = processInstructions(input);
      expect(result).toEqual(["第一行指示", "第二行指示", "第三行指示"]);
    });

    test('多行字串包含空行 - 過濾空行', () => {
      const input = "第一行\n\n第二行\n   \n第三行";
      const result = processInstructions(input);
      expect(result).toEqual(["第一行", "第二行", "第三行"]);
    });

    test('Semiconductor Adventure 真實案例', () => {
      const input = "冒險的第一關，就是要找出這些隱身的「小帮手」。\n试着告诉 AI 你从起床到出门，接触到的任何三样含有芯片的产品！";
      const result = processInstructions(input);
      expect(result).toEqual([
        "冒險的第一關，就是要找出這些隱身的「小帮手」。",
        "试着告诉 AI 你从起床到出门，接触到的任何三样含有芯片的产品！"
      ]);
    });
  });

  describe('陣列格式處理', () => {
    test('字串陣列 - 直接返回', () => {
      const input = ['任務1', '任務2', '任務3'];
      const result = processInstructions(input);
      expect(result).toEqual(['任務1', '任務2', '任務3']);
    });

    test('AI Job Search 真實案例', () => {
      const input = [
        'Use AI to identify top 5 trends in your industry',
        'Analyze skill requirements for your target role',
        'Create a summary of opportunities and challenges'
      ];
      const result = processInstructions(input);
      expect(result).toEqual([
        'Use AI to identify top 5 trends in your industry',
        'Analyze skill requirements for your target role',
        'Create a summary of opportunities and challenges'
      ]);
    });

    test('空陣列', () => {
      const input: string[] = [];
      const result = processInstructions(input);
      expect(result).toEqual([]);
    });
  });

  describe('多語言物件格式處理', () => {
    test('多語言物件 - 字串值 - 提取中文', () => {
      const input = {
        en: "English instruction line 1\nEnglish instruction line 2",
        zhTW: "中文指示第一行\n中文指示第二行",
        zhCN: "简体中文指示"
      };
      const result = processInstructions(input, 'zhTW');
      expect(result).toEqual(["中文指示第一行", "中文指示第二行"]);
    });

    test('多語言物件 - 字串值 - 提取英文', () => {
      const input = {
        en: "English instruction",
        zhTW: "中文指示"
      };
      const result = processInstructions(input, 'en');
      expect(result).toEqual(["English instruction"]);
    });

    test('多語言物件 - 找不到指定語言時使用英文', () => {
      const input = {
        en: "English fallback",
        zhCN: "简体中文"
      };
      const result = processInstructions(input, 'fr'); // 法文不存在
      expect(result).toEqual(["English fallback"]);
    });

    test('多語言物件 - 陣列值', () => {
      const input = {
        en: ["English task 1", "English task 2"],
        zhTW: ["中文任務1", "中文任務2"]
      };
      const result = processInstructions(input, 'zhTW');
      expect(result).toEqual(["中文任務1", "中文任務2"]);
    });

    test('多語言物件 - 空物件', () => {
      const input = {};
      const result = processInstructions(input);
      expect(result).toEqual([]);
    });
  });

  describe('邊界情況處理', () => {
    test('null 輸入', () => {
      const result = processInstructions(null);
      expect(result).toEqual([]);
    });

    test('undefined 輸入', () => {
      const result = processInstructions(undefined);
      expect(result).toEqual([]);
    });

    test('空字串', () => {
      const result = processInstructions('');
      expect(result).toEqual([]);
    });

    test('只有空白的字串', () => {
      const result = processInstructions('   \n   \n   ');
      expect(result).toEqual([]);
    });

    test('數字 (不正確的型別)', () => {
      const result = processInstructions(123 as any);
      expect(result).toEqual([]);
    });

    test('布林值 (不正確的型別)', () => {
      const result = processInstructions(true as any);
      expect(result).toEqual([]);
    });
  });
});

describe('processDescription', () => {
  test('字串描述', () => {
    const input = "這是任務描述";
    const result = processDescription(input);
    expect(result).toBe("這是任務描述");
  });

  test('多語言描述物件', () => {
    const input = {
      en: "English description",
      zhTW: "中文描述"
    };
    const result = processDescription(input, 'zhTW');
    expect(result).toBe("中文描述");
  });

  test('null 描述', () => {
    const result = processDescription(null);
    expect(result).toBe('');
  });
});

describe('processExpectedOutcome', () => {
  test('字串預期結果', () => {
    const input = "預期的學習成果";
    const result = processExpectedOutcome(input);
    expect(result).toBe("預期的學習成果");
  });

  test('多語言預期結果物件', () => {
    const input = {
      en: "Expected learning outcome",
      zhTW: "預期學習成果"
    };
    const result = processExpectedOutcome(input, 'zhTW');
    expect(result).toBe("預期學習成果");
  });

  test('undefined 預期結果', () => {
    const result = processExpectedOutcome(undefined);
    expect(result).toBe('');
  });
});
