/**
 * NextAuth mocks for testing
 */

export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
};

export const mockUseSession = jest.fn(() => ({
  data: mockSession,
  status: 'authenticated',
  update: jest.fn(),
}));

export const mockSignIn = jest.fn();
export const mockSignOut = jest.fn();
export const mockGetServerSession = jest.fn(() => Promise.resolve(mockSession));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: mockUseSession,
  signIn: mockSignIn,
  signOut: mockSignOut,
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  getSession: jest.fn(() => Promise.resolve(mockSession)),
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

export const clearAuthMocks = () => {
  mockUseSession.mockClear();
  mockSignIn.mockClear();
  mockSignOut.mockClear();
};

export const setUnauthenticated = () => {
  mockUseSession.mockReturnValue({
    data: null as any,
    status: 'unauthenticated',
    update: jest.fn(),
  });
};
