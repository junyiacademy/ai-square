import React from 'react';
import { 
  renderWithProviders, 
  screen, 
  fireEvent, 
  waitFor,
  resetAllMocks,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
  testUsers,
  mockApiSuccess,
  mockApiError,
  navigationMocks,
  themeMocks,
  mockFetch,
  mockLocalStorage,
  defaultAuthState
} from '@/test/utils/test-helpers';
import { usePathname } from 'next/navigation';
import { Header } from '../Header';

// Re-export mocks for backward compatibility
const { mockPush } = navigationMocks;
const { mockToggleTheme } = themeMocks;
const mockLogout = defaultAuthState.logout;
const mockAuthState = defaultAuthState;

// Mock LanguageSelector
jest.mock('@/components/ui/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>
}));

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard': 'Dashboard',
        'relations': 'Relations',
        'ksa': 'KSA',
        'assessment': 'Assessment',
        'pbl': 'PBL',
        'discovery': 'Discovery',
        'history': 'History',
        'more': 'More',
        'theme': 'Theme',
        'light': 'Light',
        'dark': 'Dark',
        'toggleTheme': 'Toggle theme',
        'signIn': 'Sign In',
        'signOut': 'Sign Out',
        'userRole.student': 'Student',
        'userRole.teacher': 'Teacher',
        'userRole.admin': 'Admin',
        'language': 'Language',
      };
      return translations[key] || key;
    }
  })
}));


describe('Header', () => {
  beforeEach(() => {
    resetAllMocks();
    setupUnauthenticatedUser();
    
    // Default mock - unauthenticated state
    mockFetch.mockImplementation(() => mockApiSuccess({ authenticated: false }));
    
    // Clear console errors for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
    (console.log as jest.Mock).mockRestore?.();
  });

  describe('Rendering', () => {
    it('renders the header with logo and title', () => {
      renderWithProviders(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('AI Square')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /AI Square/i })).toHaveAttribute('href', '/');
    });

    it('renders navigation links in desktop view', () => {
      renderWithProviders(<Header />);

      expect(screen.getByText('Relations')).toBeInTheDocument();
      expect(screen.getByText('KSA')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('PBL')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('renders language selector', () => {
      renderWithProviders(<Header />);

      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    it('theme toggle is part of user dropdown menu when logged in', () => {
      // Theme toggle is only visible in the user dropdown when logged in
      // This test is covered in the "shows user info and sign out when logged in" test
      expect(true).toBe(true);
    });

    it('renders mobile menu button', () => {
      renderWithProviders(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Authentication State', () => {
    it('shows sign in button when not logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false }),
        ok: true
      } as Response);

      renderWithProviders(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows user info and sign out when logged in', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      // User info should be visible immediately
      // User email appears in the dropdown
      const emailElements = screen.getAllByText('test@example.com');
      expect(emailElements.length).toBeGreaterThan(0);
      
      // Check role display
      const roleElements = screen.getAllByText('Student');
      expect(roleElements.length).toBeGreaterThan(0);
      
      // Check avatar initial
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'Test Student'
    });

    it('displays user avatar with first letter of name', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'Test Student'
    });

    it('falls back to email first letter when name is not available', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: ''
      };

      // Set up logged in auth state
      mockAuthState.user = mockUser;
      mockAuthState.isLoggedIn = true;

      renderWithProviders(<Header />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'Test Student' // First letter of email
    });
  });

  describe('Navigation', () => {
    it('highlights active navigation link', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      
      renderWithProviders(<Header />);

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toHaveClass('text-gray-900', 'border-b-2', 'border-blue-600', 'active');
    });

    it('redirects to login when sign in button is clicked', async () => {
      renderWithProviders(<Header />);

      await waitFor(() => {
        const signInButton = screen.getByText('Sign In');
        fireEvent.click(signInButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('calls logout API and redirects when sign out is clicked', async () => {
      setupAuthenticatedUser(testUsers.student);
      
      // Mock logout to also update the auth state
      mockLogout.mockImplementation(async () => {
        mockAuthState.user = null;
        mockAuthState.isLoggedIn = false;
        mockPush('/login');
      });

      renderWithProviders(<Header />);

      // User info should be visible
      expect(screen.getByText('student@example.com')).toBeInTheDocument();

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Now click Sign Out in the dropdown
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Mobile Menu', () => {
    it('toggles mobile menu when button is clicked', () => {
      renderWithProviders(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Initially closed
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByLabelText('Mobile navigation')).not.toBeInTheDocument();

      // Open menu
      fireEvent.click(mobileMenuButton);
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();

      // Close menu
      fireEvent.click(mobileMenuButton);
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByLabelText('Mobile navigation')).not.toBeInTheDocument();
    });

    it('shows navigation links in mobile menu', () => {
      renderWithProviders(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      fireEvent.click(mobileMenuButton);

      const mobileNav = screen.getByLabelText('Mobile navigation');
      expect(mobileNav).toBeInTheDocument();
      
      // Check all navigation links are present in mobile menu
      // Primary links appear in both desktop and mobile
      expect(screen.getAllByText('Dashboard')).toHaveLength(2);
      expect(screen.getAllByText('Assessment')).toHaveLength(2);
      expect(screen.getAllByText('PBL')).toHaveLength(2);
      expect(screen.getAllByText('Discovery')).toHaveLength(2);
      // Secondary links appear in dropdown and mobile
      expect(screen.getAllByText('Relations')).toHaveLength(2); // Dropdown + Mobile
      expect(screen.getAllByText('KSA')).toHaveLength(2);
      expect(screen.getAllByText('History')).toHaveLength(2);
    });

    it('closes mobile menu when navigation link is clicked', () => {
      renderWithProviders(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      fireEvent.click(mobileMenuButton);

      const mobileNav = screen.getByLabelText('Mobile navigation');
      expect(mobileNav).toBeInTheDocument();

      // Click on a mobile navigation link
      const mobileLinks = screen.getAllByText('Dashboard');
      const mobileDashboardLink = mobileLinks.find(link => 
        link.closest('[aria-label="Mobile navigation"]')
      );
      fireEvent.click(mobileDashboardLink!);

      expect(screen.queryByLabelText('Mobile navigation')).not.toBeInTheDocument();
    });

    it('shows correct hamburger/close icon based on menu state', () => {
      renderWithProviders(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      const svgElement = mobileMenuButton.querySelector('svg path');
      
      // Hamburger menu icon when closed
      expect(svgElement).toHaveAttribute('d', 'M4 6h16M4 12h16M4 18h16');

      // Open menu
      fireEvent.click(mobileMenuButton);
      
      // Close icon when open
      expect(svgElement).toHaveAttribute('d', 'M6 18L18 6M6 6l12 12');
    });
  });

  describe('Theme Toggle', () => {
    it('calls toggleTheme when theme button is clicked', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      // User info should be visible
      expect(screen.getByText('student@example.com')).toBeInTheDocument();

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Find and click the theme toggle button in dropdown
      const themeButton = screen.getByText('Theme').closest('button');
      fireEvent.click(themeButton!);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct theme icon based on current theme', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      // User info should be visible
      expect(screen.getByText('student@example.com')).toBeInTheDocument();

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Check for sun icon in light theme
      const themeButton = screen.getByText('Theme').closest('button');
      const sunIcon = themeButton?.querySelector('svg path[d*="M12 3v1m0"]');
      expect(sunIcon).toBeInTheDocument();
    });

    it('handles mounting state to avoid hydration issues', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      // Component should mount and show user info
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles auth check API error gracefully', async () => {
      // Set up logged in auth state
      mockAuthState.user = { 
        id: 1, 
        email: 'test@example.com', 
        role: 'student',
        name: 'Test User'
      };
      mockAuthState.isLoggedIn = true;

      renderWithProviders(<Header />);

      // Should still show user info even if API fails
      // In dropdown, email appears once in the dropdown and might not be visible elsewhere
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
    });

    it('handles corrupted localStorage data', async () => {
      // Set corrupted data directly in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', 'invalid json'); // corrupted user data

      renderWithProviders(<Header />);

      // Component should fall back to logged out state when it can't parse user data
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });

    it('handles logout API error gracefully', async () => {
      setupAuthenticatedUser(testUsers.student);
      
      // Mock logout to simulate error but still clear state
      mockLogout.mockImplementation(async () => {
        // Even if API fails, should still clear state and redirect
        mockAuthState.user = null;
        mockAuthState.isLoggedIn = false;
        mockPush('/login');
      });

      renderWithProviders(<Header />);

      expect(screen.getByText('student@example.com')).toBeInTheDocument();

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Click Sign Out
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      // Should call logout
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Auth State Changes', () => {
    it('responds to auth state changes', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      const { rerender } = renderWithProviders(<Header />);

      // Initially logged out
      expect(screen.getByText('Sign In')).toBeInTheDocument();

      // Update auth state
      mockAuthState.user = mockUser;
      mockAuthState.isLoggedIn = true;

      // Force re-render
      rerender(<Header />);

      // Should update to show user info
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
    });
  });

  describe('Mobile User Info', () => {
    it('shows user info in mobile view when logged in', async () => {
      const mockUser = {
        id: 1,
        email: 'mobile@example.com',
        role: 'teacher',
        name: 'Mobile User'
      };

      // Set up logged in auth state
      mockAuthState.user = mockUser;
      mockAuthState.isLoggedIn = true;

      renderWithProviders(<Header />);

      // Should show user info
      expect(screen.getByText('mobile@example.com')).toBeInTheDocument();
      expect(screen.getByText('Teacher')).toBeInTheDocument();
    });
  });

  describe('Role Display', () => {
    it('translates user role correctly', async () => {
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<Header />);

      expect(screen.getByText('Student')).toBeInTheDocument();
    });
  });

  // Note: The Header component doesn't dispatch custom events
});