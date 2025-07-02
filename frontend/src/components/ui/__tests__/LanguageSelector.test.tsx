import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSelector } from '../LanguageSelector'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('renders language selector with flags', () => {
    render(<LanguageSelector />)
    
    // Check if the select element is rendered
    const select = screen.getByLabelText('選擇語言')
    expect(select).toBeInTheDocument()
  })

  it('displays all language options with flags', () => {
    render(<LanguageSelector />)
    
    const select = screen.getByLabelText('選擇語言')
    
    // Check if all language options are present with flags
    expect(select).toHaveTextContent('🇺🇸 English')
    expect(select).toHaveTextContent('🇹🇼 繁體中文')
    expect(select).toHaveTextContent('🇪🇸 Español')
    expect(select).toHaveTextContent('🇯🇵 日本語')
    expect(select).toHaveTextContent('🇰🇷 한국어')
    expect(select).toHaveTextContent('🇫🇷 Français')
    expect(select).toHaveTextContent('🇩🇪 Deutsch')
    expect(select).toHaveTextContent('🇷🇺 Русский')
    expect(select).toHaveTextContent('🇮🇹 Italiano')
  })

  it('changes language when option is selected', () => {
    const mockChangeLanguage = jest.fn()
    
    jest.spyOn(require('react-i18next'), 'useTranslation').mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    })
    
    render(<LanguageSelector />)
    
    const select = screen.getByLabelText('選擇語言')
    fireEvent.change(select, { target: { value: 'zhTW' } })
    
    expect(mockChangeLanguage).toHaveBeenCalledWith('zhTW')
  })

  it('saves language preference to localStorage', () => {
    render(<LanguageSelector />)
    
    const select = screen.getByLabelText('選擇語言')
    fireEvent.change(select, { target: { value: 'ja' } })
    
    expect(localStorage.getItem('ai-square-language')).toBe('ja')
  })


  it('dispatches custom event when language changes', () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent')
    
    render(<LanguageSelector />)
    
    const select = screen.getByLabelText('選擇語言')
    fireEvent.change(select, { target: { value: 'fr' } })
    
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'language-changed',
        detail: { language: 'fr' },
      })
    )
    
    mockDispatchEvent.mockRestore()
  })
})