# 如何從開發日誌生成教學文件

本指南說明如何將開發日誌轉換為有價值的教學內容。

## 為什麼要這樣做？

1. **知識傳承**: 將開發經驗轉化為可學習的教材
2. **成本效益**: 展示 AI 協作的實際價值
3. **最佳實踐**: 從實際案例中提煉模式

## 轉換流程

### 1. 收集開發日誌
```bash
# 查看所有功能日誌
ls docs/features/*.yml

# 生成統計報告
make metrics
```

### 2. 識別教學要點

從日誌中的 `teachable_moments` 提取：
- 技術洞察
- 解決方案模式
- 常見陷阱

### 3. 生成教學文件結構

```markdown
# [功能名稱] 實作教學

## 學習目標
- 了解 [技術概念]
- 掌握 [實作技巧]
- 避免 [常見錯誤]

## 背景說明
[從日誌的 description 改寫]

## 實作步驟
[從 timeline 轉換為教學步驟]

## 關鍵程式碼
[從 deliverables 提取重要片段]

## 成本效益分析
- 開發時間: X 分鐘
- AI 協助: Y%
- 成本節省: $Z

## 經驗總結
[從 learnings 整理]
```

## 自動化生成腳本

```python
# docs/tutorials/generate_tutorial.py
import yaml
import os
from pathlib import Path

def generate_tutorial(feature_log_path):
    with open(feature_log_path, 'r', encoding='utf-8') as f:
        log = yaml.safe_load(f)
    
    tutorial = f"""# {log['feature']} 實作教學

## 學習目標
"""
    
    # 從 teachable_moments 生成學習目標
    for moment in log.get('teachable_moments', []):
        tutorial += f"- 了解{moment['topic']}\n"
    
    tutorial += f"""
## 實作概述
{log['description']}

## 時間與成本分析
- 總開發時間: {log['metrics']['total_time']} 分鐘
- AI 貢獻: {log['metrics']['ai_percentage']}%
- 成本節省: ${log['cost_estimation']['cost_saving']}

## 技術實作步驟
"""
    
    # 轉換 timeline 為教學步驟
    for i, phase in enumerate(log['timeline'], 1):
        tutorial += f"""
### 步驟 {i}: {phase['phase']}
- 時間: {phase['duration']} 分鐘
- 重點: {phase['notes']}
"""
    
    # 加入關鍵學習
    tutorial += "\n## 關鍵學習點\n"
    for strength in log['learnings']['ai_strengths']:
        tutorial += f"- **AI 優勢**: {strength}\n"
    
    for insight in log['learnings']['collaboration_insights']:
        tutorial += f"- **協作洞察**: {insight}\n"
    
    return tutorial

# 使用範例
if __name__ == "__main__":
    log_file = "docs/features/2025-06-22-homepage-login.yml"
    tutorial = generate_tutorial(log_file)
    
    # 儲存教學文件
    output_path = "docs/tutorials/homepage-login-tutorial.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(tutorial)
    
    print(f"✅ 教學文件已生成: {output_path}")
```

## 教學文件類型

### 1. 技術教學
- 重點在實作細節
- 包含程式碼範例
- 解釋設計決策

### 2. 流程教學
- 重點在開發方法
- AI 協作技巧
- 時間管理

### 3. 成本分析
- ROI 計算方法
- 效率提升數據
- 最佳化建議

## 發布管道

1. **內部文檔**: 團隊學習資料
2. **部落格文章**: 公開分享經驗
3. **影片教學**: 螢幕錄製實作過程
4. **工作坊教材**: 培訓課程內容

## 持續改進

- 定期回顧教學效果
- 收集學習者回饋
- 更新教學內容
- 建立教學資料庫