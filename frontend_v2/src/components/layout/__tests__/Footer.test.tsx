import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
    t: (key: string) => key,
    i18n: {
      language: 'en',
    },
  }),
}))

describe('Footer', () => {
  it('renders footer with all sections', () => {
    render(<Footer />)
    
    // Check main sections
    expect(screen.getByText('footer.company')).toBeInTheDocument()
    expect(screen.getByText('footer.resources')).toBeInTheDocument()
    expect(screen.getByText('footer.legal')).toBeInTheDocument()
    expect(screen.getByText('footer.connect')).toBeInTheDocument()
  })

  it('renders company links', () => {
    render(<Footer />)
    
    const aboutLink = screen.getByRole('link', { name: 'footer.about' })
    const featuresLink = screen.getByRole('link', { name: 'footer.features' })
    const pricingLink = screen.getByRole('link', { name: 'footer.pricing' })
    const contactLink = screen.getByRole('link', { name: 'footer.contact' })
    
    expect(aboutLink).toHaveAttribute('href', '/about')
    expect(featuresLink).toHaveAttribute('href', '/features')
    expect(pricingLink).toHaveAttribute('href', '/pricing')
    expect(contactLink).toHaveAttribute('href', '/contact')
  })

  it('renders resource links', () => {
    render(<Footer />)
    
    const docsLink = screen.getByRole('link', { name: 'footer.documentation' })
    const apiLink = screen.getByRole('link', { name: 'footer.api' })
    const blogLink = screen.getByRole('link', { name: 'footer.blog' })
    const supportLink = screen.getByRole('link', { name: 'footer.support' })
    
    expect(docsLink).toHaveAttribute('href', '/docs')
    expect(apiLink).toHaveAttribute('href', '/api')
    expect(blogLink).toHaveAttribute('href', '/blog')
    expect(supportLink).toHaveAttribute('href', '/support')
  })

  it('renders legal links', () => {
    render(<Footer />)
    
    const privacyLink = screen.getByRole('link', { name: 'footer.privacy' })
    const termsLink = screen.getByRole('link', { name: 'footer.terms' })
    const cookiesLink = screen.getByRole('link', { name: 'footer.cookies' })
    const licenseLink = screen.getByRole('link', { name: 'footer.license' })
    
    expect(privacyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('href', '/terms')
    expect(cookiesLink).toHaveAttribute('href', '/cookies')
    expect(licenseLink).toHaveAttribute('href', '/license')
  })

  it('renders social media links', () => {
    render(<Footer />)
    
    const githubLink = screen.getByRole('link', { name: /github/i })
    const twitterLink = screen.getByRole('link', { name: /twitter/i })
    const linkedinLink = screen.getByRole('link', { name: /linkedin/i })
    
    expect(githubLink).toHaveAttribute('href', 'https://github.com/ai-square')
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/ai_square')
    expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/company/ai-square')
    
    // Check that external links open in new tab
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders newsletter subscription form', () => {
    render(<Footer />)
    
    const emailInput = screen.getByPlaceholderText('footer.emailPlaceholder')
    const subscribeButton = screen.getByRole('button', { name: 'footer.subscribe' })
    
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(subscribeButton).toBeInTheDocument()
  })

  it('handles newsletter subscription', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    )
    global.fetch = mockFetch as any

    render(<Footer />)
    
    const emailInput = screen.getByPlaceholderText('footer.emailPlaceholder')
    const subscribeButton = screen.getByRole('button', { name: 'footer.subscribe' })
    
    // Enter email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    // Submit form
    fireEvent.click(subscribeButton)
    
    // Check success message appears
    expect(await screen.findByText('footer.subscribeSuccess')).toBeInTheDocument()
    
    // Check API was called
    expect(mockFetch).toHaveBeenCalledWith('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
  })

  it('validates email format', () => {
    render(<Footer />)
    
    const emailInput = screen.getByPlaceholderText('footer.emailPlaceholder')
    const subscribeButton = screen.getByRole('button', { name: 'footer.subscribe' })
    
    // Try invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(subscribeButton)
    
    // Check error message
    expect(screen.getByText('footer.invalidEmail')).toBeInTheDocument()
  })

  it('renders copyright information', () => {
    render(<Footer />)
    
    const currentYear = new Date().getFullYear()
    const copyright = screen.getByText(new RegExp(`${currentYear}.*AI Square`))
    
    expect(copyright).toBeInTheDocument()
  })

  it('applies dark mode styles', () => {
    render(<Footer />)
    
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveClass('bg-gray-900', 'dark:bg-gray-950')
  })

  it('is responsive', () => {
    render(<Footer />)
    
    // Check grid layout classes
    const mainGrid = screen.getByTestId('footer-grid')
    expect(mainGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('handles subscription errors', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Subscription failed' }),
      })
    )
    global.fetch = mockFetch as any

    render(<Footer />)
    
    const emailInput = screen.getByPlaceholderText('footer.emailPlaceholder')
    const subscribeButton = screen.getByRole('button', { name: 'footer.subscribe' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(subscribeButton)
    
    expect(await screen.findByText('footer.subscribeError')).toBeInTheDocument()
  })

  it('disables form during submission', async () => {
    const mockFetch = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100))
    )
    global.fetch = mockFetch as any

    render(<Footer />)
    
    const emailInput = screen.getByPlaceholderText('footer.emailPlaceholder')
    const subscribeButton = screen.getByRole('button', { name: 'footer.subscribe' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(subscribeButton)
    
    // Check button is disabled during submission
    expect(subscribeButton).toBeDisabled()
    expect(screen.getByText('footer.subscribing')).toBeInTheDocument()
    
    // Wait for completion
    await screen.findByText('footer.subscribeSuccess')
    expect(subscribeButton).not.toBeDisabled()
  })

  it('renders language selector in footer', () => {
    render(<Footer />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    expect(languageSelector).toBeInTheDocument()
  })

  it('renders footer logo and tagline', () => {
    render(<Footer />)
    
    const logo = screen.getByAltText('AI Square Logo')
    const tagline = screen.getByText('footer.tagline')
    
    expect(logo).toBeInTheDocument()
    expect(tagline).toBeInTheDocument()
  })

  it('handles keyboard navigation', () => {
    render(<Footer />)
    
    const firstLink = screen.getByRole('link', { name: 'footer.about' })
    const secondLink = screen.getByRole('link', { name: 'footer.features' })
    
    // Focus first link
    firstLink.focus()
    expect(document.activeElement).toBe(firstLink)
    
    // Tab to next link
    fireEvent.keyDown(firstLink, { key: 'Tab' })
    // Note: actual tab behavior would need more complex testing
  })

  it('has proper ARIA labels for social icons', () => {
    render(<Footer />)
    
    const githubLink = screen.getByRole('link', { name: /github/i })
    const twitterLink = screen.getByRole('link', { name: /twitter/i })
    
    expect(githubLink).toHaveAttribute('aria-label', expect.stringContaining('GitHub'))
    expect(twitterLink).toHaveAttribute('aria-label', expect.stringContaining('Twitter'))
  })
})