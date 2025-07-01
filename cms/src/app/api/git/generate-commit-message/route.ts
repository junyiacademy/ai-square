import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/vertex-ai';
import { CommitMessageRequest, CommitMessageResponse } from '@/types';

export async function POST(request: NextRequest) {
  let requestData: CommitMessageRequest = { filePath: '', oldContent: '', newContent: '' };
  
  try {
    requestData = await request.json() as CommitMessageRequest;
    const { filePath, oldContent, newContent } = requestData;

    if (!filePath || !newContent) {
      return NextResponse.json(
        { error: 'File path and new content are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一個專業的 Git commit message 撰寫助手，專門為教育內容管理系統生成詳細的中文 commit 訊息。

規則：
1. 使用繁體中文撰寫
2. 第一行為簡短摘要（格式: feat(cms): 具體動作描述）
3. 空一行後，詳細說明變更內容
4. 使用條列式說明主要變更點
5. 分析變更的目的和影響
6. 如果適用，提供 review 注意事項
7. 保持專業但易懂的語氣

範例格式：
feat(cms): 更新高中智慧城市情境的任務描述

本次更新改進了高中智慧城市 PBL 情境中的任務內容：

主要變更：
- 修改任務一描述，強化數據分析的學習目標
- 新增任務二的評估標準，包含更明確的成功指標
- 調整任務三的 AI 模組設定，提升互動性

變更原因：
- 根據教師回饋，原任務描述過於抽象
- 學生需要更明確的引導來完成任務
- 加強與真實世界應用的連結

Review 注意事項：
- 請確認新的任務描述是否符合學習目標
- 檢查 AI 模組設定是否合理
- 確保中英文版本的一致性

🤖 Generated with AI Square CMS
Co-Authored-By: Vertex AI <noreply@google.com>`;

    const prompt = `檔案路徑: ${filePath}

原始內容:
${oldContent || '(新檔案)'}

更新內容:
${newContent}

請根據內容差異，生成一個詳細的 commit message。
重要：必須詳細說明具體改了哪幾隻檔案，什麼樣的相關內容、為什麼要改、以及 review 時需要注意什麼。`;

    const commitMessage = await generateContent(prompt, systemPrompt);
    
    const response: CommitMessageResponse = { 
      success: true,
      message: commitMessage.trim()
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Generate commit message error:', error);
    
    // Get filePath from requestData
    const filePath = requestData.filePath || 'unknown';
    
    // Fallback to simple message if AI fails
    const fallbackMessage = `feat(cms): 更新 ${filePath} 內容

更新檔案: ${filePath}

🤖 Generated with AI Square CMS`;
    
    const response: CommitMessageResponse = { 
      success: true,
      message: fallbackMessage
    };
    return NextResponse.json(response);
  }
}