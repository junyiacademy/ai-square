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
  value: mockLocalStorage
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

    it('renders theme toggle button', () => {
      render(<Header />);

      const themeButton = screen.getByLabelText('Toggle theme');
      expect(themeButton).toBeInTheDocument();
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

      // Mock the specific fetch call for auth check
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      // Wait for user email to appear
      await waitFor(() => {
        expect(screen.getAllByText('test@example.com')).toHaveLength(2); // Desktop + Mobile
      }, { timeout: 3000 });
      
      // Check other elements are present
      expect(screen.getAllByText('Student')).toHaveLength(2); // Desktop + Mobile
      expect(screen.getAllByText('Sign Out')).toHaveLength(2); // Desktop + Mobile
    });

    it('displays user avatar with first letter of name', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('falls back to email first letter when name is not available', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: ''
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
      }, { timeout: 3000 });
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

      let callCount = 0;
      mockFetch.mockImplementation((url, options) => {
        callCount++;
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        if (url === '/api/auth/logout' && options?.method === 'POST') {
          return Promise.resolve({
            json: () => Promise.resolve({}),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getAllByText('test@example.com')).toHaveLength(2);
      }, { timeout: 3000 });

      const signOutButtons = screen.getAllByText('Sign Out');
      fireEvent.click(signOutButtons[0]); // Click first sign out button

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
    it('calls toggleTheme when theme button is clicked', () => {
      render(<Header />);

      const themeButton = screen.getByLabelText('Toggle theme');
      fireEvent.click(themeButton);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct theme icon based on current theme', () => {
      // Test light theme (should show moon icon)
      render(<Header />);

      const themeButton = screen.getByLabelText('Toggle theme');
      const moonPath = themeButton.querySelector('path[d*="20.354"]');
      expect(moonPath).toBeInTheDocument();
    });

    it('handles mounting state to avoid hydration issues', () => {
      render(<Header />);

      // Initially shows empty div during mounting
      const themeButton = screen.getByLabelText('Toggle theme');
      const emptyDiv = themeButton.querySelector('div');
      
      // The component should either show an icon or a placeholder div
      expect(themeButton.children.length).toBeGreaterThan(0);
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
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockLocalStorage.getItem
        .mockReturnValueOnce('true') // isLoggedIn
        .mockReturnValueOnce('invalid json'); // corrupted user data

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('isLoggedIn');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('handles logout API error gracefully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        if (url === '/api/auth/logout' && options?.method === 'POST') {
          return Promise.reject(new Error('Logout failed'));
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getAllByText('test@example.com')).toHaveLength(2);
      }, { timeout: 3000 });

      const signOutButtons = screen.getAllByText('Sign Out');
      fireEvent.click(signOutButtons[0]);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Event Listeners', () => {
    it('sets up event listeners on mount', () => {
      render(<Header />);

      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('auth-changed', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('auth:expired', expect.any(Function));
    });

    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<Header />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('auth-changed', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('auth:expired', expect.any(Function));
    });

    it('handles auth expired event', async () => {
      render(<Header />);

      // Get the auth:expired event listener
      const authExpiredCall = mockAddEventListener.mock.calls.find(
        call => call[0] === 'auth:expired'
      );
      const authExpiredHandler = authExpiredCall![1];

      // Simulate auth expired event
      act(() => {
        authExpiredHandler();
      });

      expect(mockPush).toHaveBeenCalledWith('/login?expired=true');
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

      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        // Should show user info in mobile section (sm:hidden)
        const emailElements = screen.getAllByText('mobile@example.com');
        const roleElements = screen.getAllByText('Teacher');
        
        expect(emailElements.length).toBeGreaterThan(1); // Desktop + Mobile
        expect(roleElements.length).toBeGreaterThan(1); // Desktop + Mobile
      }, { timeout: 3000 });
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

      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getAllByText('Student')).toHaveLength(2);
      }, { timeout: 3000 });
    });
  });

  describe('Custom Events', () => {
    it('dispatches auth-changed event when clearing auth state', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            json: () => Promise.resolve({ 
              authenticated: true, 
              user: mockUser 
            }),
            ok: true
          } as Response);
        }
        if (url === '/api/auth/logout' && options?.method === 'POST') {
          return Promise.resolve({
            json: () => Promise.resolve({}),
            ok: true
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({ authenticated: false }),
          ok: true
        } as Response);
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getAllByText('test@example.com')).toHaveLength(2);
      }, { timeout: 3000 });

      const signOutButtons = screen.getAllByText('Sign Out');
      fireEvent.click(signOutButtons[0]);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth-changed'
        })
      );
    });
  });
});