/**
 * Next.js Router Mock
 * Comprehensive mock for Next.js 15 app router hooks
 */

export const createMockRouter = (overrides: Partial<ReturnType<typeof useRouter>> = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  ...overrides
});

export const createMockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
};

export const createMockPathname = (pathname = '/') => pathname;

/**
 * Standard Next.js navigation mock
 * Use this in most test files that use Next.js routing
 */
export const mockNextNavigation = (options: {
  router?: Partial<ReturnType<typeof useRouter>>;
  pathname?: string;
  searchParams?: Record<string, string>;
} = {}) => {
  const mockRouter = createMockRouter(options.router);
  const mockPathname = createMockPathname(options.pathname);
  const mockSearchParams = createMockSearchParams(options.searchParams);

  return {
    useRouter: () => mockRouter,
    usePathname: () => mockPathname,
    useSearchParams: () => mockSearchParams,
    useParams: () => ({}),
    redirect: jest.fn(),
    permanentRedirect: jest.fn(),
    notFound: jest.fn(),
  };
};

/**
 * Helper to setup Next.js navigation mocks in tests
 */
export function setupNextNavigationMocks(options?: Parameters<typeof mockNextNavigation>[0]) {
  return jest.mock('next/navigation', () => mockNextNavigation(options));
}

// Re-export useRouter type for convenience
import type { useRouter } from 'next/navigation';
export type MockRouter = ReturnType<typeof createMockRouter>;
export type UseRouter = typeof useRouter;
