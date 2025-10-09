import React from 'react'
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render'
import { Footer } from '../Footer'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>
  }
})

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      // Return common translations
      const translations: Record<string, string> = {
        'footer.languages': 'Languages',
        'footer.domains': 'AI Domains',
        'footer.competencies': 'Competencies',
        'footer.rights': 'All rights reserved.'
      };
      return translations[key] || defaultValue || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}))

describe('Footer', () => {
  it('renders footer with all sections', async () => {
    renderWithProviders(<Footer />)
    
    // Check main sections based on actual Footer component
    expect(screen.getByText('About AI Square')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    
    // Check description
    expect(screen.getByText(/AI Square is a Git-Based learning platform/)).toBeInTheDocument()
    
    // Check stats - text is combined in single elements
    expect(screen.getByText('Languages: English / 繁體中文 / 简体中文')).toBeInTheDocument()
    expect(screen.getByText('4 AI Domains')).toBeInTheDocument()
    expect(screen.getByText('20+ Competencies')).toBeInTheDocument()
  })

  it('renders resource links', async () => {
    renderWithProviders(<Footer />)
    
    const journeyLink = screen.getByRole('link', { name: 'User Journey' })
    const roadmapLink = screen.getByRole('link', { name: 'Product Roadmap' })
    const feedbackLink = screen.getByRole('link', { name: 'Feedback' })
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' })
    
    expect(journeyLink).toHaveAttribute('href', '/about/journey')
    expect(roadmapLink).toHaveAttribute('href', '/about/roadmap')
    expect(feedbackLink).toHaveAttribute('href', 'https://github.com/anthropics/claude-code/issues')
    expect(privacyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('renders copyright text', async () => {
    renderWithProviders(<Footer />)
    const currentYear = new Date().getFullYear()
    
    // The copyright text is rendered together in a single element
    const copyrightText = `© ${currentYear} AI Square. All rights reserved.`
    expect(screen.getByText(copyrightText)).toBeInTheDocument()
  })

  it('renders contact email', async () => {
    renderWithProviders(<Footer />)
    
    const emailLink = screen.getByRole('link', { name: 'support@junyiacademy.org' })
    expect(emailLink).toHaveAttribute('href', 'mailto:support@junyiacademy.org')
  })

  it('renders footer tagline', async () => {
    renderWithProviders(<Footer />)
    
    expect(screen.getByText('Made with ❤️ for AI literacy education')).toBeInTheDocument()
  })
})
