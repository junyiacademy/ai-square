/**
 * Login Page Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/components/auth/LoginForm', () => ({
  LoginForm: ({ onSubmit, loading, error }: any) => (
    <div data-testid="login-form">
      <button 
        onClick={() => onSubmit({ email: 'test@example.com', password: 'password', rememberMe: false })}
        disabled={loading}
      >
        Login
      </button>
      {error && <div>{error}</div>}
      {loading && <div>Loading...</div>}
    </div>
  )
}));

// Create a mutable mock for useAuth
const mockLogin = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: { [key: string]: string } = {
        'loginTitle': 'Sign In',
        'platformSubtitle': 'AI Literacy Platform',
        'dontHaveAccount': "Don't have an account?",
        'createAccount': 'Create one',
        'devNote': 'Development version',
        'error.invalidCredentials': 'Invalid email or password',
        'error.networkError': 'Network error occurred',
        'info.sessionExpired': 'Your session has expired. Please login again.'
      };
      return translations[key] || defaultValue || key;
    }
  })
}));

// Import console mock helper
import { mockConsoleError } from '@/test-utils/helpers/console';

// Mock console methods to reduce noise in tests
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation()
};
const mockConsoleErrorFn = mockConsoleError();

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };
  const mockSearchParams = new URLSearchParams();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
  });

  it('should render login page with correct title and subtitle', () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('AI Literacy Platform')).toBeInTheDocument();
    expect(screen.getByText('Development version')).toBeInTheDocument();
  });

  it('should show session expired message when expired=true in URL', () => {
    const expiredParams = new URLSearchParams({ expired: 'true' });
    (useSearchParams as jest.Mock).mockReturnValue(expiredParams);

    render(<LoginPage />);

    expect(screen.getByText('Your session has expired. Please login again.')).toBeInTheDocument();
  });

  it('should render sign up link without redirect', () => {
    render(<LoginPage />);

    const signUpLink = screen.getByText('Create one');
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  it('should render sign up link with redirect parameter', () => {
    const redirectParams = new URLSearchParams({ redirect: '/dashboard' });
    (useSearchParams as jest.Mock).mockReturnValue(redirectParams);

    render(<LoginPage />);

    const signUpLink = screen.getByText('Create one');
    expect(signUpLink).toHaveAttribute('href', '/register?redirect=%2Fdashboard');
  });

  it('should handle successful login and navigate to dashboard', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: true,
          goalsCompleted: true
        },
        assessmentCompleted: true
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        rememberMe: false
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle successful login with redirect URL', async () => {
    const redirectParams = new URLSearchParams({ redirect: '/pbl' });
    (useSearchParams as jest.Mock).mockReturnValue(redirectParams);

    mockLogin.mockResolvedValue({
      success: true,
      user: {}
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pbl');
    });
  });

  it('should prevent open redirect vulnerabilities', async () => {
    const redirectParams = new URLSearchParams({ redirect: '//evil.com' });
    (useSearchParams as jest.Mock).mockReturnValue(redirectParams);

    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: true,
          goalsCompleted: true
        },
        assessmentCompleted: true
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      // Should navigate to dashboard instead of the malicious URL
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockPush).not.toHaveBeenCalledWith('//evil.com');
    });
  });

  it('should navigate to onboarding welcome if not completed', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: false
        }
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome');
    });
  });

  it('should navigate to onboarding identity if welcome completed but not identity', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: false
        }
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/identity');
    });
  });

  it('should navigate to onboarding goals if identity completed but not goals', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: true,
          goalsCompleted: false
        }
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/goals');
    });
  });

  it('should navigate to assessment if onboarding completed but no assessment', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {
        onboarding: {
          welcomeCompleted: true,
          identityCompleted: true,
          goalsCompleted: true
        },
        assessmentCompleted: false
      }
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/assessment');
    });
  });

  it('should handle login failure with error message', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Invalid credentials'
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('should handle login failure without error message', async () => {
    mockLogin.mockResolvedValue({
      success: false
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('should handle network error during login', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      expect(mockConsoleErrorFn).toHaveBeenCalledWith('Login error:', expect.any(Error));
    });
  });

  it('should show loading state during login', async () => {
    let resolveLogin: ((value: any) => void) | null = null;
    mockLogin.mockImplementation(() => 
      new Promise(resolve => {
        resolveLogin = resolve;
      })
    );

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    // The mock LoginForm shows loading state differently
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    // Resolve the login promise
    if (resolveLogin) {
      (resolveLogin as (value: any) => void)({ success: true, user: {} });
    }

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('should render SVG icon', () => {
    const { container } = render(<LoginPage />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-8 w-8 text-white');
  });

  it('should handle user without onboarding data', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      user: {}  // No onboarding property
    });

    render(<LoginPage />);

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      // Should navigate to welcome as default
      expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome');
    });
  });

  it('should render with Suspense fallback', () => {
    // This is to ensure the Suspense wrapper is rendered
    const { container } = render(<LoginPage />);
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });
});