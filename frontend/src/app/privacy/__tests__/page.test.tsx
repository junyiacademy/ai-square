import React from 'react';
import { render, screen } from '@testing-library/react';
import PrivacyPolicyPage from '../page';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn()
    }
  })
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('PrivacyPolicyPage', () => {
  it('should render the privacy policy title', () => {
    render(<PrivacyPolicyPage />);
    
    const title = screen.getByText('Privacy Policy');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H1');
  });

  it('should display last updated date', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-30/)).toBeInTheDocument();
  });

  it('should render all major sections', () => {
    render(<PrivacyPolicyPage />);
    
    // Check for section headings
    expect(screen.getByText('1. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('2. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('3. Data Storage and Security')).toBeInTheDocument();
    expect(screen.getByText('4. Data Sharing and Disclosure')).toBeInTheDocument();
    expect(screen.getByText('5. Your Rights')).toBeInTheDocument();
    expect(screen.getByText('6. Cookies and Tracking')).toBeInTheDocument();
    expect(screen.getByText("7. Children's Privacy")).toBeInTheDocument();
    expect(screen.getByText('8. International Data Transfers')).toBeInTheDocument();
    expect(screen.getByText('9. Changes to This Policy')).toBeInTheDocument();
    expect(screen.getByText('10. Contact Us')).toBeInTheDocument();
  });

  it('should render subsections for information collection', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Usage Data')).toBeInTheDocument();
    expect(screen.getByText('Technical Data')).toBeInTheDocument();
  });

  it('should list types of personal information collected', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Name (optional)')).toBeInTheDocument();
    expect(screen.getByText('User role (student, teacher, admin)')).toBeInTheDocument();
    expect(screen.getByText('Language preference')).toBeInTheDocument();
  });

  it('should list usage data collected', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText('Learning progress and assessment results')).toBeInTheDocument();
    expect(screen.getByText('Interactions with AI tutors')).toBeInTheDocument();
    expect(screen.getByText('PBL scenario completion data')).toBeInTheDocument();
    expect(screen.getByText('Platform usage analytics')).toBeInTheDocument();
  });

  it('should list user rights', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText('Access your personal information')).toBeInTheDocument();
    expect(screen.getByText('Correct inaccurate data')).toBeInTheDocument();
    expect(screen.getByText('Request deletion of your data')).toBeInTheDocument();
    expect(screen.getByText('Export your data in a portable format')).toBeInTheDocument();
  });

  it('should include contact information', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText('AI Square')).toBeInTheDocument();
    expect(screen.getByText('support@junyiacademy.org')).toBeInTheDocument();
  });

  it('should have a mailto link for contact email', () => {
    render(<PrivacyPolicyPage />);
    
    const emailLink = screen.getByRole('link', { name: 'support@junyiacademy.org' });
    expect(emailLink).toHaveAttribute('href', 'mailto:support@junyiacademy.org');
  });

  it('should have a back to home link', () => {
    render(<PrivacyPolicyPage />);
    
    const backLink = screen.getByText('Back to Home');
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should have proper styling classes', () => {
    render(<PrivacyPolicyPage />);
    
    const container = screen.getByText('Privacy Policy').closest('div');
    expect(container?.parentElement).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-xl', 'shadow-lg');
  });

  it('should render the introduction text', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText(/AI Square.*is committed to protecting your privacy/)).toBeInTheDocument();
  });

  it('should describe data storage and security', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText(/Your data is stored securely on Google Cloud Platform servers/)).toBeInTheDocument();
    expect(screen.getByText('Data encryption in transit and at rest')).toBeInTheDocument();
    expect(screen.getByText('Restricted access controls')).toBeInTheDocument();
  });

  it('should mention children privacy policy', () => {
    render(<PrivacyPolicyPage />);
    
    expect(screen.getByText(/Our platform is designed for educational use by students of all ages/)).toBeInTheDocument();
  });
});