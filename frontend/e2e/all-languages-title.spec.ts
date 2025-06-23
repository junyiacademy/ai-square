/**
 * 全語言標題響應式測試
 * 確保所有 9 種語言的標題在不同視窗大小都能正確顯示
 */

import { test, expect } from '@playwright/test'

const languages = [
  { code: 'en', name: 'English', expectedTitle: 'AI Literacy Relations Map' },
  { code: 'zh-TW', name: '繁體中文', expectedTitle: 'AI 素養四大領域架構' },
  { code: 'ja', name: '日本語', expectedTitle: 'AIリテラシー関連マップ' },
  { code: 'ko', name: '한국어', expectedTitle: 'AI 리터러시 관계도' },
  { code: 'es', name: 'Español', expectedTitle: 'Mapa de Relaciones de Alfabetización en IA' },
  { code: 'fr', name: 'Français', expectedTitle: 'Carte des Relations de la Littératie en IA' },
  { code: 'de', name: 'Deutsch', expectedTitle: 'Beziehungskarte der KI-Kompetenz' },
  { code: 'ru', name: 'Русский', expectedTitle: 'Карта Связей ИИ-грамотности' },
  { code: 'it', name: 'Italiano', expectedTitle: 'Mappa delle Relazioni dell\'Alfabetizzazione IA' }
]

const viewports = [
  { name: 'mobile-small', width: 320, height: 568 },  // iPhone SE
  { name: 'mobile', width: 375, height: 667 },        // iPhone 8
  { name: 'tablet', width: 768, height: 1024 },       // iPad
  { name: 'desktop', width: 1920, height: 1080 }      // Desktop
]

test.describe('多語言標題響應式測試', () => {
  test.describe.configure({ mode: 'serial' })

  for (const viewport of viewports) {
    test(`所有語言標題在 ${viewport.name} (${viewport.width}px) 都應該正確顯示`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/relations')
      
      const results = []
      
      for (const lang of languages) {
        // 等待頁面穩定
        await page.waitForLoadState('networkidle')
        
        // 切換語言
        const languageButton = page.getByRole('button').filter({ hasText: /English|繁體中文|日本語|한국어|Español|Français|Deutsch|Русский|Italiano/ })
        await languageButton.click()
        await page.getByText(lang.name, { exact: true }).click()
        
        // 等待語言切換完成
        await page.waitForTimeout(500)
        
        // 檢查標題
        const title = page.getByRole('heading', { level: 1 })
        await expect(title).toBeVisible()
        await expect(title).toContainText(lang.expectedTitle)
        
        // 獲取標題的邊界框
        const titleBox = await title.boundingBox()
        const containerBox = await page.locator('main').boundingBox()
        
        // 驗證標題沒有溢出
        const isOverflowing = titleBox.width > containerBox.width - 32 // 32px for padding
        
        results.push({
          language: lang.name,
          width: titleBox.width,
          containerWidth: containerBox.width,
          isOverflowing,
          ratio: (titleBox.width / (containerBox.width - 32) * 100).toFixed(1)
        })
        
        // 如果溢出，截圖記錄
        if (isOverflowing) {
          await page.screenshot({ 
            path: `screenshots/overflow-${lang.code}-${viewport.name}.png`,
            clip: titleBox
          })
        }
        
        // 驗證沒有溢出
        expect(isOverflowing).toBe(false)
      }
      
      // 輸出測試結果表格
      console.log(`\n📱 視窗: ${viewport.name} (${viewport.width}px)`)
      console.table(results)
    })
  }

  test('視覺回歸測試 - 截圖所有語言標題', async ({ page }) => {
    await page.goto('/relations')
    
    for (const lang of languages) {
      // 切換語言
      const languageButton = page.getByRole('button').filter({ hasText: /English|繁體中文|日本語|한국어|Español|Français|Deutsch|Русский|Italiano/ })
      await languageButton.click()
      await page.getByText(lang.name, { exact: true }).click()
      await page.waitForTimeout(500)
      
      // 截取完整頁面截圖
      await page.screenshot({
        path: `screenshots/full-page-${lang.code}.png`,
        fullPage: false
      })
      
      // 截取標題區域
      const titleArea = page.locator('h1').first()
      await titleArea.screenshot({
        path: `screenshots/title-only-${lang.code}.png`
      })
    }
  })
})

test('測試標題的 CSS 類別', async ({ page }) => {
  await page.goto('/relations')
  
  const title = page.getByRole('heading', { level: 1 })
  
  // 檢查是否有正確的響應式類別
  const classAttribute = await title.getAttribute('class')
  
  expect(classAttribute).toContain('text-2xl')     // 小螢幕字體
  expect(classAttribute).toContain('sm:text-3xl')  // 大螢幕字體
  expect(classAttribute).toContain('px-4')         // 水平內距
  expect(classAttribute).toContain('text-center')  // 置中對齊
})