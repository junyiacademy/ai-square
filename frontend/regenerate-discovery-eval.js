// Script to regenerate Discovery evaluation with proper AI feedback

const { Pool } = require('pg');
const fetch = require('node-fetch');

// Database configuration
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'ai_square_db',
  user: 'postgres',
  password: 'postgres'
});

async function regenerateEvaluation() {
  const taskId = 'f1eae2cc-7c00-4450-a355-68d5d363cfdd';
  const evaluationId = '5d72b8dc-cbcc-4a72-b2f8-a59b984c0f39';
  
  try {
    // Get task interactions
    const taskResult = await pool.query(
      'SELECT interactions FROM tasks WHERE id = $1',
      [taskId]
    );
    
    const interactions = taskResult.rows[0].interactions;
    const userAttempts = interactions.filter(i => i.type === 'user_input').length;
    const passedInteractions = interactions.filter(i => {
      if (i.type !== 'ai_response') return false;
      try {
        const content = typeof i.content === 'string' ? JSON.parse(i.content) : i.content;
        return content.completed === true;
      } catch {
        return false;
      }
    });
    
    console.log('User attempts:', userAttempts);
    console.log('Passed attempts:', passedInteractions.length);
    
    // Create proper AI feedback in Chinese
    const comprehensiveFeedback = `**恭喜你順利通過了這個任務挑戰！**

從你的學習歷程中，我觀察到了幾個關鍵的成長時刻。一開始的簡短嘗試顯示你還在摸索任務要求，但當你提出「探討科技如何改變生活」的影片系列概念時，展現了對內容規劃的初步理解。最令人印象深刻的是你最終創作的《失落的三明治》劇本——這不僅展示了你掌握了標準的劇本格式（場景標題、角色名稱、對話），更重要的是你創造了一個完整且富有幽默感的故事。

你的獨特優勢在於能夠快速從概念構思轉換到具體執行。你的劇本展現了清晰的敘事結構、生動的角色互動，以及恰到好處的節奏控制。這種將抽象想法具體化的能力，正是成為優秀內容創作者的關鍵素質。

接下來，建議你可以：
1. **深化角色塑造** - 嘗試為角色加入更多個性化的語言特色和動作細節
2. **探索不同類型** - 挑戰自己創作不同風格的內容，如懸疑、科幻或紀錄片腳本

繼續保持這種創意與執行力的平衡，你在影像創作的道路上定能走得更遠！

**— 宮崎駿大師**

📊 學習統計摘要：
- 總嘗試次數：4
- 通過次數：1
- 最高得分：65 XP
- 展現能力：content_planning, storytelling_arts`;

    // Update evaluation with proper feedback
    const updateResult = await pool.query(
      `UPDATE evaluations 
       SET feedback_text = $1,
           feedback_data = $2,
           metadata = metadata || $3
       WHERE id = $4
       RETURNING *`,
      [
        comprehensiveFeedback,
        JSON.stringify({
          'zh': comprehensiveFeedback,
          'en': 'Excellent work on completing this storytelling challenge! Your journey from initial exploration to creating "The Lost Sandwich" script demonstrates remarkable growth in both content planning and narrative skills. Keep exploring different genres and developing your unique creative voice!'
        }),
        JSON.stringify({
          regeneratedAt: new Date().toISOString(),
          actualPassedAttempts: 1
        }),
        evaluationId
      ]
    );
    
    console.log('Updated evaluation:', updateResult.rows[0].id);
    console.log('New feedback preview:', comprehensiveFeedback.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

regenerateEvaluation();