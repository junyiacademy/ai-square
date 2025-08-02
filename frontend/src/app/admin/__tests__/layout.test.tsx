/**
 * Admin Layout Tests
 * 提升覆蓋率從 0% 到 100%
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../layout';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('AdminLayout', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Clear localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('should show loading spinner initially', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin' })
    );

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should redirect to login if no user data', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
    });
  });

  it('should redirect to home if user is not admin', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'student', email: 'test@example.com' })
    );

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should render layout and children for admin user', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin', email: 'admin@example.com' })
    );

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin CMS')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  it('should render navigation links', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin', email: 'admin@example.com' })
    );

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Back to Site')).toBeInTheDocument();
    });
  });

  it('should have correct href attributes for navigation links', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin', email: 'admin@example.com' })
    );

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/admin');
      expect(screen.getByText('Content').closest('a')).toHaveAttribute('href', '/admin/content');
      expect(screen.getByText('History').closest('a')).toHaveAttribute('href', '/admin/history');
      expect(screen.getByText('Back to Site').closest('a')).toHaveAttribute('href', '/');
    });
  });

  it('should not render content when not loading but not admin', async () => {
    // First call returns user data to trigger redirect
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(
      JSON.stringify({ role: 'student', email: 'test@example.com' })
    );

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    // After redirect, component returns null
    expect(container.firstChild).toBeNull();
  });

  it('should apply correct CSS classes', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin', email: 'admin@example.com' })
    );

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin CMS')).toBeInTheDocument();
    });

    // Check main container
    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-gray-50');

    // Check header
    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200');

    // Check main content area
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-7xl', 'mx-auto', 'py-6', 'sm:px-6', 'lg:px-8');
  });

  it('should handle JSON parse error gracefully', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid-json');
    
    // Silence console error for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should render loading state with correct classes', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ role: 'admin' })
    );

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const loadingContainer = container.firstChild;
    expect(loadingContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('rounded-full', 'h-12', 'w-12', 'border-b-2', 'border-blue-600');
  });
});