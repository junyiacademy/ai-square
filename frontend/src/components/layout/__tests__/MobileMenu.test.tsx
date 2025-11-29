import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileMenu } from '../MobileMenu';
import type { NavLink } from '../types';

// Mock usePathname
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock LanguageSelector
jest.mock('@/components/ui/LanguageSelector', () => ({
  LanguageSelector: ({ className }: { className?: string }) => (
    <div data-testid="language-selector" className={className}>
      Language Selector
    </div>
  ),
}));

describe('MobileMenu', () => {
  const allNavLinks: NavLink[] = [
    { href: '/relations', label: 'relations' },
    { href: '/ksa', label: 'ksa' },
    { href: '/pbl/scenarios', label: 'pbl' },
    { href: '/assessment/scenarios', label: 'assessment', disabled: true, tooltip: 'comingSoon' },
    { href: '/dashboard', label: 'dashboard', disabled: true, tooltip: 'comingSoon' },
  ];

  const mockUser = {
    id: 1,
    email: 'mobile@example.com',
    role: 'student',
    name: 'Mobile User',
    isGuest: false,
  };

  const mockGuestUser = {
    id: 2,
    email: 'guest@example.com',
    role: 'guest',
    name: 'Guest User',
    isGuest: true,
  };

  const mockOnClose = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/');
  });

  describe('Menu Button', () => {
    it('renders mobile menu toggle button', () => {
      render(
        <MobileMenu
          isOpen={false}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows hamburger icon when menu is closed', () => {
      render(
        <MobileMenu
          isOpen={false}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      const svg = button.querySelector('svg path');
      expect(svg).toHaveAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    });

    it('shows close icon when menu is open', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      const svg = button.querySelector('svg path');
      expect(svg).toHaveAttribute('d', 'M6 18L18 6M6 6l12 12');
    });

    it('updates aria-expanded when menu opens', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Menu Content', () => {
    it('does not render menu content when closed', () => {
      render(
        <MobileMenu
          isOpen={false}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByLabelText('Mobile navigation')).not.toBeInTheDocument();
    });

    it('renders menu content when open', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();
    });

    it('renders all navigation links', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('relations')).toBeInTheDocument();
      expect(screen.getByText('ksa')).toBeInTheDocument();
      expect(screen.getByText('pbl')).toBeInTheDocument();
      expect(screen.getByText('assessment')).toBeInTheDocument();
      expect(screen.getByText('dashboard')).toBeInTheDocument();
    });

    it('renders language selector', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const languageSelector = screen.getByTestId('language-selector');
      expect(languageSelector).toBeInTheDocument();
      expect(languageSelector).toHaveClass('w-full');
    });
  });

  describe('Navigation Links', () => {
    it('highlights active navigation link', () => {
      mockPathname.mockReturnValue('/pbl/scenarios');

      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const pblLink = screen.getByRole('link', { name: 'pbl' });
      expect(pblLink).toHaveClass('text-gray-900');
      expect(pblLink).toHaveClass('bg-gray-100');
    });

    it('calls onClose when navigation link is clicked', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const relationsLink = screen.getByRole('link', { name: 'relations' });
      fireEvent.click(relationsLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows disabled links with proper styling', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const assessmentLink = screen.getByText('assessment');
      expect(assessmentLink).toHaveClass('text-gray-400');
      expect(assessmentLink).toHaveClass('cursor-not-allowed');
    });

    it('displays tooltip for disabled links', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const assessmentText = screen.getByText('assessment');
      // The tooltip is displayed as text next to the label (multiple instances for different disabled links)
      const tooltips = screen.getAllByText('(comingSoon)');
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  describe('User Info - Regular User', () => {
    it('shows user info when logged in', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('Mobile User')).toBeInTheDocument();
      expect(screen.getByText('mobile@example.com')).toBeInTheDocument();
    });

    it('renders sign out button when logged in', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const signOutButton = screen.getByRole('button', { name: /signOut/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('calls onLogout when sign out is clicked', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const signOutButton = screen.getByRole('button', { name: /signOut/i });
      fireEvent.click(signOutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('does not show user info when logged out', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByText('Mobile User')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /signOut/i })).not.toBeInTheDocument();
    });
  });

  describe('User Info - Guest User', () => {
    it('shows guest indicator emoji', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockGuestUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('displays guest mode indicator', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockGuestUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      // Guest user info is visible with emoji indicator
      expect(screen.getByText('Guest User')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('does not show email separately for guest users', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={mockGuestUser}
          isLoggedIn={true}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByText('guest@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('is only visible on mobile (lg:hidden class)', () => {
      render(
        <MobileMenu
          isOpen={false}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      expect(button).toHaveClass('lg:hidden');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <MobileMenu
          isOpen={true}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument();
    });

    it('button has correct type attribute', () => {
      render(
        <MobileMenu
          isOpen={false}
          allNavLinks={allNavLinks}
          user={null}
          isLoggedIn={false}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
        />
      );

      const button = screen.getByLabelText('Toggle navigation menu');
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});
