import React from 'react';
import { render, screen } from '@testing-library/react';
import TermsOfServicePage from '../page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en'
    }
  })
}));

describe('TermsOfServicePage', () => {
  it('should render without errors', () => {
    const { container } = render(<TermsOfServicePage />);
    expect(container).toBeTruthy();
  });

  it('should display the page title', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('should show effective date', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/Effective Date/)).toBeInTheDocument();
    expect(screen.getByText(/2025-07-01/)).toBeInTheDocument();
  });

  it('should show last updated date', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/Last Updated/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-30/)).toBeInTheDocument();
  });

  it('should display all major sections', () => {
    render(<TermsOfServicePage />);

    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('2. Description of Service')).toBeInTheDocument();
    expect(screen.getByText('3. User Accounts')).toBeInTheDocument();
    expect(screen.getByText('4. Acceptable Use Policy')).toBeInTheDocument();
    expect(screen.getByText('5. Intellectual Property')).toBeInTheDocument();
    expect(screen.getByText('6. Privacy and Data Protection')).toBeInTheDocument();
    expect(screen.getByText('7. AI Services and Limitations')).toBeInTheDocument();
    expect(screen.getByText('8. Disclaimers and Limitations')).toBeInTheDocument();
    expect(screen.getByText('9. Modifications to Terms')).toBeInTheDocument();
    expect(screen.getByText('10. Termination')).toBeInTheDocument();
    expect(screen.getByText('11. Governing Law')).toBeInTheDocument();
    expect(screen.getByText('12. Contact Information')).toBeInTheDocument();
  });

  it('should display introduction text', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/Welcome to AI Square!/)).toBeInTheDocument();
  });

  it('should show service features', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText('AI literacy education content and assessments')).toBeInTheDocument();
    expect(screen.getByText('Problem-Based Learning (PBL) scenarios')).toBeInTheDocument();
    expect(screen.getByText('AI-powered tutoring and feedback')).toBeInTheDocument();
    expect(screen.getByText('Progress tracking and analytics')).toBeInTheDocument();
    expect(screen.getByText('Multi-language support (9 languages)')).toBeInTheDocument();
  });

  it('should show account types', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText('Student: Access to learning content and assessments')).toBeInTheDocument();
    expect(screen.getByText('Teacher: Additional class management features')).toBeInTheDocument();
    expect(screen.getByText('Administrator: Platform management capabilities')).toBeInTheDocument();
  });

  it('should show acceptable use policy', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText('Use the platform for educational purposes')).toBeInTheDocument();
    expect(screen.getByText('Misuse or attempt to manipulate the AI systems')).toBeInTheDocument();
  });

  it('should display contact email', () => {
    render(<TermsOfServicePage />);
    const emailLink = screen.getByRole('link', { name: /support@junyiacademy.org/i });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:support@junyiacademy.org');
  });

  it('should have back to home link', () => {
    render(<TermsOfServicePage />);
    const homeLink = screen.getByText('Back to Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should display agreement notice', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/By using AI Square, you acknowledge that you have read and agree to these Terms of Service/)).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<TermsOfServicePage />);
    const mainDiv = container.firstElementChild;
    expect(mainDiv).toHaveClass('min-h-screen');
    expect(mainDiv).toHaveClass('bg-gradient-to-br');
  });

  it('should render all sections with proper structure', () => {
    const { container } = render(<TermsOfServicePage />);
    const sections = container.querySelectorAll('section');
    expect(sections.length).toBeGreaterThan(10);
  });
});
