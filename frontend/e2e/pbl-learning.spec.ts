/**
 * E2E 測試 - PBL 學習流程
 * 測試從開始學習到完成並獲得報告的完整流程
 */

import { test, expect } from '@playwright/test'

test.describe('PBL 學習流程 E2E 測試', () => {
  // 在每個測試前先登入
  test.beforeEach(async ({ page }) => {
    // 登入學生帳戶
    await page.goto('/login')
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')
    await page.getByRole('button', { name: 'Login' }).click()
    
    // 等待重定向到主頁
    await expect(page).toHaveURL(/\/relations/)
    
    // 前往 PBL 頁面
    await page.goto('/pbl')
  })

  test('🎯 完整學習流程 - 從選擇情境到獲得報告', async ({ page }) => {
    // 1. 選擇學習情境
    await expect(page.getByText('探索 PBL 情境')).toBeVisible()
    
    // 點擊「AI 輔助求職訓練」情境
    const scenarioCard = page.locator('text=AI 輔助求職訓練')
    await scenarioCard.click()
    
    // 確認進入情境詳情
    await expect(page.getByText('開始學習')).toBeVisible()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 2. 第一階段：搜尋職缺
    await expect(page.getByText('階段 1：搜尋合適職缺')).toBeVisible()
    
    // 輸入搜尋需求
    const chatInput = page.getByPlaceholder('輸入您的想法...')
    await chatInput.fill('我想找台北的前端工程師職缺，薪資希望在 80k 以上')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 等待 AI 回應
    await expect(page.locator('.ai-response')).toBeVisible({ timeout: 10000 })
    
    // 繼續對話
    await chatInput.fill('請幫我篩選需要 React 經驗的職缺')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 等待回應並完成階段
    await expect(page.locator('.ai-response').nth(1)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '完成此階段' }).click()
    
    // 3. 第二階段：準備履歷
    await expect(page.getByText('階段 2：準備履歷和自我介紹')).toBeVisible()
    
    // 上傳或輸入履歷內容
    const editor = page.locator('.monaco-editor textarea')
    await editor.fill(`# 個人簡歷

## 基本資訊
- 姓名：測試用戶
- 經驗：3年前端開發經驗
- 技能：React, TypeScript, Next.js

## 工作經歷
### 前端工程師 - ABC 公司 (2021-2024)
- 使用 React 開發響應式網頁應用
- 導入 TypeScript 提升程式碼品質
- 參與敏捷開發流程`)
    
    // 請求 AI 建議
    await page.getByRole('button', { name: 'AI 履歷建議' }).click()
    await expect(page.locator('.ai-suggestion')).toBeVisible({ timeout: 10000 })
    
    // 完成階段
    await page.getByRole('button', { name: '完成此階段' }).click()
    
    // 4. 第三階段：模擬面試
    await expect(page.getByText('階段 3：模擬面試')).toBeVisible()
    
    // 開始語音對話（模擬）
    await page.getByRole('button', { name: '開始面試' }).click()
    
    // 模擬回答問題
    await chatInput.fill('我選擇前端開發是因為喜歡創造用戶可以直接互動的介面')
    await page.getByRole('button', { name: '發送' }).click()
    
    await expect(page.locator('.ai-response')).toBeVisible({ timeout: 10000 })
    
    // 繼續回答
    await chatInput.fill('我最大的優勢是具備良好的問題解決能力和團隊合作精神')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 結束面試
    await page.getByRole('button', { name: '結束面試' }).click()
    
    // 5. 完成學習，查看報告
    await expect(page.getByText('恭喜完成！')).toBeVisible()
    await page.getByRole('button', { name: '查看學習報告' }).click()
    
    // 驗證報告內容
    await expect(page).toHaveURL(/\/pbl\/report/)
    await expect(page.getByText('學習成果報告')).toBeVisible()
    
    // 檢查報告包含的元素
    await expect(page.getByText('總體評分')).toBeVisible()
    await expect(page.getByText('各階段表現')).toBeVisible()
    await expect(page.getByText('能力雷達圖')).toBeVisible()
    await expect(page.getByText('學習建議')).toBeVisible()
    
    // 檢查可以下載報告
    const downloadButton = page.getByRole('button', { name: '下載 PDF 報告' })
    await expect(downloadButton).toBeVisible()
  })

  test('⏸️ 暫停和繼續學習', async ({ page }) => {
    // 開始學習
    await page.locator('text=AI 輔助求職訓練').click()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 進行一些互動
    await page.getByPlaceholder('輸入您的想法...').fill('測試訊息')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 暫停學習
    await page.getByRole('button', { name: '暫停' }).click()
    await expect(page.getByText('學習已暫停')).toBeVisible()
    
    // 返回 PBL 首頁
    await page.goto('/pbl')
    
    // 應該看到「繼續學習」選項
    await expect(page.getByText('您有未完成的學習')).toBeVisible()
    await page.getByRole('button', { name: '繼續學習' }).click()
    
    // 確認回到之前的進度
    await expect(page.getByText('測試訊息')).toBeVisible()
  })

  test('💾 自動保存進度', async ({ page }) => {
    // 開始學習
    await page.locator('text=AI 輔助求職訓練').click()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 輸入一些內容
    const chatInput = page.getByPlaceholder('輸入您的想法...')
    await chatInput.fill('這是測試自動保存的訊息')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 等待自動保存提示
    await expect(page.locator('text=已自動保存')).toBeVisible({ timeout: 5000 })
    
    // 重新整理頁面
    await page.reload()
    
    // 檢查內容是否還在
    await expect(page.getByText('這是測試自動保存的訊息')).toBeVisible()
  })

  test('📊 即時評估回饋', async ({ page }) => {
    // 開始學習
    await page.locator('text=AI 輔助求職訓練').click()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 完成第一階段
    await page.getByPlaceholder('輸入您的想法...').fill('我想找工作')
    await page.getByRole('button', { name: '發送' }).click()
    await page.getByRole('button', { name: '完成此階段' }).click()
    
    // 應該看到階段評估
    await expect(page.getByText('階段評估')).toBeVisible()
    await expect(page.locator('.score-display')).toBeVisible()
    await expect(page.getByText('表現回饋')).toBeVisible()
    
    // 繼續到下一階段
    await page.getByRole('button', { name: '繼續下一階段' }).click()
  })
})

// 測試不同的學習情境
test.describe('不同學習情境測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')
    await page.getByRole('button', { name: 'Login' }).click()
    await page.goto('/pbl')
  })

  test('📚 教育內容創作情境', async ({ page }) => {
    await page.locator('text=AI 輔助教育內容創作').click()
    await expect(page.getByText('創作教學內容')).toBeVisible()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 驗證進入正確的情境
    await expect(page.getByText('階段 1：分析學習需求')).toBeVisible()
  })

  test('🏢 商業提案情境', async ({ page }) => {
    await page.locator('text=AI 商業提案準備').click()
    await expect(page.getByText('準備商業提案')).toBeVisible()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 驗證進入正確的情境
    await expect(page.getByText('階段 1：市場研究')).toBeVisible()
  })
})

// 測試錯誤處理
test.describe('錯誤處理測試', () => {
  test('🚫 網路中斷恢復', async ({ page, context }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('student@example.com')
    await page.getByLabel('Password').fill('student123')
    await page.getByRole('button', { name: 'Login' }).click()
    await page.goto('/pbl')
    
    // 開始學習
    await page.locator('text=AI 輔助求職訓練').click()
    await page.getByRole('button', { name: '開始學習' }).click()
    
    // 模擬網路中斷
    await context.setOffline(true)
    
    // 嘗試發送訊息
    await page.getByPlaceholder('輸入您的想法...').fill('測試離線訊息')
    await page.getByRole('button', { name: '發送' }).click()
    
    // 應該顯示錯誤提示
    await expect(page.getByText('網路連接失敗')).toBeVisible()
    
    // 恢復網路
    await context.setOffline(false)
    
    // 重試應該成功
    await page.getByRole('button', { name: '重試' }).click()
    await expect(page.locator('.ai-response')).toBeVisible({ timeout: 10000 })
  })
})