/**
 * 基本測試 - 驗證測試環境設置
 */

describe('基本測試環境', () => {
  it('應該能夠運行測試', () => {
    expect(1 + 1).toBe(2)
  })

  it('應該能夠載入測試工具', () => {
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('應該有正確的測試環境變數', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
