/**
 * 基本 E2E 測試 - 檢查測試環境設置
 */

import { test, expect } from '@playwright/test'

test('基本頁面載入測試', async ({ page }) => {
  await page.goto('/login')
  
  // 檢查頁面是否成功載入
  await expect(page).toBeDefined()
  
  // 檢查基本元素是否存在
  await expect(page.getByText('AI 素養學習平台')).toBeVisible()
})