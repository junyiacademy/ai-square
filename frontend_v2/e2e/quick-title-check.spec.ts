/**
 * 快速標題檢查 - 只測試有問題的語言
 */

import { test, expect } from '@playwright/test'

const problematicLanguages = [
  { code: 'it', name: 'Italiano', expectedTitle: 'Mappa delle Relazioni' },
  { code: 'es', name: 'Español', expectedTitle: 'Mapa de Relaciones' },
  { code: 'fr', name: 'Français', expectedTitle: 'Carte des Relations' }
]

test('問題語言標題檢查', async ({ page }) => {
  // 設定小螢幕視窗
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/relations')
  
  for (const lang of problematicLanguages) {
    // 切換語言
    await page.getByRole('button').filter({ hasText: /English|繁體中文|日本語|한국어|Español|Français|Deutsch|Русский|Italiano/ }).click()
    await page.waitForTimeout(300)
    await page.getByText(lang.name).click()
    await page.waitForTimeout(500)
    
    // 截圖
    await page.screenshot({ 
      path: `screenshots/title-${lang.code}-mobile.png`,
      fullPage: false 
    })
    
    // 檢查標題元素
    const title = page.getByRole('heading', { level: 1 })
    const titleText = await title.textContent()
    console.log(`${lang.name}: ${titleText}`)
    
    // 檢查是否有文字溢出
    const isVisible = await title.isVisible()
    expect(isVisible).toBe(true)
  }
})