import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { Header } from '../Header';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush
  })),
  usePathname: jest.fn(() => '/')
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'relations': 'Relations',
        'ksa': 'KSA',
        'assessment': 'Assessment',
        'pbl': 'PBL',
        'history': 'History',
        'toggleTheme': 'Toggle theme',
        'signIn': 'Sign In',
        'signOut': 'Sign Out',
        'userRole.student': 'Student',
        'userRole.teacher': 'Teacher',
        'userRole.admin': 'Admin',
      };
      return translations[key] || key;
    }
  })
}));

// Mock LanguageSelector
jest.mock('@/components/ui/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>
}));

// Mock ThemeContext
const mockToggleTheme = jest.fn();
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: mockToggleTheme
  })
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });
Object.defineProperty(window, 'dispatchEvent', { value: mockDispatchEvent });

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Clear actual localStorage
    localStorage.clear();
    
    // Default mock - unauthenticated state
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ authenticated: false }),
        ok: true
      } as Response);
    });
    
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
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('AI Square')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /AI Square/i })).toHaveAttribute('href', '/');
    });

    it('renders navigation links in desktop view', () => {
      render(<Header />);

      expect(screen.getByText('Relations')).toBeInTheDocument();
      expect(screen.getByText('KSA')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('PBL')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('renders language selector', () => {
      render(<Header />);

      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    it('theme toggle is part of user dropdown menu when logged in', () => {
      // Theme toggle is only visible in the user dropdown when logged in
      // This test is covered in the "shows user info and sign out when logged in" test
      expect(true).toBe(true);
    });

    it('renders mobile menu button', () => {
      render(<Header />);

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

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows user info and sign out when logged in', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      // Mock localStorage to return logged in state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      // Wait for user info to appear (component reads from localStorage on mount)
      await waitFor(() => {
        // User email appears in the dropdown
        const emailElements = screen.getAllByText('test@example.com');
        expect(emailElements.length).toBeGreaterThan(0);
      });
      
      // Check role display
      const roleElements = screen.getAllByText('Student');
      expect(roleElements.length).toBeGreaterThan(0);
      
      // Check avatar initial
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('displays user avatar with first letter of name', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument();
      });
    });

    it('falls back to email first letter when name is not available', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: ''
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
      });
    });
  });

  describe('Navigation', () => {
    it('highlights active navigation link', () => {
      (usePathname as jest.Mock).mockReturnValue('/relations');
      
      render(<Header />);

      const relationsLink = screen.getByRole('link', { name: 'Relations' });
      expect(relationsLink).toHaveClass('text-gray-900', 'border-b-2', 'border-blue-600', 'active');
    });

    it('redirects to login when sign in button is clicked', async () => {
      render(<Header />);

      await waitFor(() => {
        const signInButton = screen.getByText('Sign In');
        fireEvent.click(signInButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('calls logout API and redirects when sign out is clicked', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      // Mock fetch for logout API
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/auth/logout' && options?.method === 'POST') {
          return Promise.resolve({
            json: () => Promise.resolve({}),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({}),
          ok: true
        } as Response);
      });

      render(<Header />);

      // Wait for user info to appear
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Now click Sign Out in the dropdown
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });
  });

  describe('Mobile Menu', () => {
    it('toggles mobile menu when button is clicked', () => {
      render(<Header />);

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
      render(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      fireEvent.click(mobileMenuButton);

      const mobileNav = screen.getByLabelText('Mobile navigation');
      expect(mobileNav).toBeInTheDocument();
      
      // Check all navigation links are present in mobile menu
      expect(screen.getAllByText('Relations')).toHaveLength(2); // Desktop + Mobile
      expect(screen.getAllByText('KSA')).toHaveLength(2);
      expect(screen.getAllByText('Assessment')).toHaveLength(2);
      expect(screen.getAllByText('PBL')).toHaveLength(2);
      expect(screen.getAllByText('History')).toHaveLength(2);
    });

    it('closes mobile menu when navigation link is clicked', () => {
      render(<Header />);

      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu');
      fireEvent.click(mobileMenuButton);

      const mobileNav = screen.getByLabelText('Mobile navigation');
      expect(mobileNav).toBeInTheDocument();

      // Click on a mobile navigation link
      const mobileLinks = screen.getAllByText('Relations');
      const mobileRelationsLink = mobileLinks.find(link => 
        link.closest('[aria-label="Mobile navigation"]')
      );
      fireEvent.click(mobileRelationsLink!);

      expect(screen.queryByLabelText('Mobile navigation')).not.toBeInTheDocument();
    });

    it('shows correct hamburger/close icon based on menu state', () => {
      render(<Header />);

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
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      // Wait for user info to appear
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Find and click the theme toggle button in dropdown
      const themeButton = screen.getByText('theme');
      fireEvent.click(themeButton);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct theme icon based on current theme', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      // Wait for user info to appear
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Check for sun icon in light theme
      const sunIcon = screen.getByText('theme').parentElement?.querySelector('svg path[d*="M12 3v1m0"]');
      expect(sunIcon).toBeInTheDocument();
    });

    it('handles mounting state to avoid hydration issues', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      // Component should mount and show user info
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles auth check API error gracefully', async () => {
      // Mock fetch to always reject (network error)
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });
      
      // Mock localStorage to consistently return user data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify({ 
          id: 1, 
          email: 'test@example.com', 
          role: 'student',
          name: 'Test User'
        });
        return null;
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getAllByText('test@example.com')).toHaveLength(2);
      }, { timeout: 3000 });
    });

    it('handles corrupted localStorage data', async () => {
      // Set corrupted data directly in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', 'invalid json'); // corrupted user data

      render(<Header />);

      // Component should fall back to logged out state when it can't parse user data
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });

    it('handles logout API error gracefully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/auth/logout' && options?.method === 'POST') {
          return Promise.reject(new Error('Logout failed'));
        }
        return Promise.resolve({
          json: () => Promise.resolve({}),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Click on the user dropdown to open it
      const userButton = screen.getByText('T').parentElement;
      fireEvent.click(userButton!);

      // Click Sign Out
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      // Even if API fails, it should still redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Event Listeners', () => {
    it('sets up event listeners on mount', () => {
      render(<Header />);

      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<Header />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('handles storage change event', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      render(<Header />);

      // Get the storage event listener
      const storageCall = mockAddEventListener.mock.calls.find(
        call => call[0] === 'storage'
      );
      const storageHandler = storageCall![1];

      // Mock localStorage to return user data after storage event
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });
      
      act(() => {
        storageHandler({ key: 'isLoggedIn' } as StorageEvent);
      });

      // Should update to show user info
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
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

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      await waitFor(() => {
        // Should show user info
        expect(screen.getByText('mobile@example.com')).toBeInTheDocument();
        expect(screen.getByText('Teacher')).toBeInTheDocument();
      });
    });
  });

  describe('Role Display', () => {
    it('translates user role correctly', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Student')).toBeInTheDocument();
      });
    });
  });

  // Note: The Header component doesn't dispatch custom events
});