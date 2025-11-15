import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/vertex-ai';
import { GitHubCommit } from '@/types';

interface PRDescriptionRequest {
  commits: Array<{ message: string }>;
  branch: string;
}

interface PRDescriptionResponse {
  success: boolean;
  description: string;
  isGenerated?: boolean;
}

export async function POST(request: NextRequest) {
  let requestData: PRDescriptionRequest = { commits: [], branch: '' };

  try {
    requestData = await request.json() as PRDescriptionRequest;
    const { commits, branch } = requestData;

    if (!commits || !Array.isArray(commits)) {
      return NextResponse.json(
        { error: 'Commits array is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一個專業的 Pull Request 描述撰寫助手，專門為教育內容管理系統生成詳細的 PR 描述。

規則：
1. 使用繁體中文撰寫
2. 分析所有 commits 的內容，總結整體變更
3. 根據 commit messages 理解改動的脈絡
4. 整理出主要變更類別（如：內容更新、錯誤修正、功能改進等）
5. 提供整體性的 review 建議
6. 保持專業但易懂的語氣

輸出格式：
## 📋 PR 總覽
[一段話總結這個 PR 的主要目的]

## 📝 變更摘要
[整理所有 commits 的變更，按類別分組]

### 內容更新
- [具體更新項目]

### 功能改進
- [具體改進項目]

### 錯誤修正
- [具體修正項目]

## 🎯 變更影響
[說明這些變更對系統的整體影響]

## ✅ Review 重點
- [reviewer 需要特別注意的事項]
- [潛在風險或需要確認的地方]

## 📊 變更統計
- 總共修改 X 個檔案
- 包含 Y 個提交
- 主要影響：[影響範圍]`;

    const prompt = `分支名稱: ${branch}

以下是這個分支中所有的 commit messages：

${commits.map((commit: { message: string }, index: number) => `
Commit ${index + 1}:
${commit.message}
---
`).join('\n')}

請分析這些 commits，生成一個完整的 Pull Request 描述。
注意：
1. 要整合所有 commits 的內容，不是逐一列出
2. 找出共同的主題和模式
3. 提供有價值的 review 指引`;

    console.log('Generating PR description for', commits.length, 'commits');
    const prDescription = await generateContent(prompt, systemPrompt);

    const response: PRDescriptionResponse = {
      success: true,
      description: prDescription.trim(),
      isGenerated: true
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Generate PR description error:', error);

    // Get commits count from requestData
    const commitsCount = requestData.commits?.length || 0;

    // Fallback to simple description
    const fallbackDescription = `## 📋 內容更新

本次 PR 包含 ${commitsCount} 個提交的內容更新。

請查看個別 commit 訊息了解詳細變更。`;

    const response: PRDescriptionResponse = {
      success: true,
      description: fallbackDescription,
      isGenerated: false
    };
    return NextResponse.json(response);
  }
}
