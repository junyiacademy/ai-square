import React from 'react'
import { render, screen } from '@testing-library/react'
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
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      language: 'en',
    },
  }),
}))

describe('Footer', () => {
  it('renders footer with all sections', () => {
    render(<Footer />)
    
    // Check main sections based on actual Footer component
    expect(screen.getByText('About AI Square')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    
    // Check description
    expect(screen.getByText(/AI Square is a Git-Based learning platform/)).toBeInTheDocument()
    
    // Check stats
    expect(screen.getByText(/10\+/)).toBeInTheDocument()
    expect(screen.getByText('Languages')).toBeInTheDocument()
    expect(screen.getByText(/4/)).toBeInTheDocument()
    expect(screen.getByText('AI Domains')).toBeInTheDocument()
    expect(screen.getByText(/20\+/)).toBeInTheDocument()
    expect(screen.getByText('Competencies')).toBeInTheDocument()
  })

  it('renders resource links', () => {
    render(<Footer />)
    
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

  it('renders copyright text', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    
    expect(screen.getByText(`© ${currentYear} AI Square.`)).toBeInTheDocument()
    expect(screen.getByText('All rights reserved.')).toBeInTheDocument()
  })

  it('renders contact email', () => {
    render(<Footer />)
    
    const emailLink = screen.getByRole('link', { name: 'support@junyiacademy.org' })
    expect(emailLink).toHaveAttribute('href', 'mailto:support@junyiacademy.org')
  })

  it('renders footer tagline', () => {
    render(<Footer />)
    
    expect(screen.getByText('Made with ❤️ for AI literacy education')).toBeInTheDocument()
  })
})