/**
 * NextAuth Mock
 * 統一的認證 mock，避免在每個測試中重複定義
 */

// Define Session type locally to avoid next-auth dependency
export interface Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

// 預設的 mock session
export const mockSession: Session = {
  user: {
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Mock getServerSession
export const mockGetServerSession = jest.fn().mockResolvedValue(mockSession);

// Mock useSession hook
export const mockUseSession = jest.fn(() => ({
  data: mockSession as Session | null,
  status: 'authenticated' as 'authenticated' | 'unauthenticated' | 'loading',
  update: jest.fn(),
}));

// 設定 session 狀態的輔助函數
export const setMockSession = (session: Session | null) => {
  mockGetServerSession.mockResolvedValue(session);
  mockUseSession.mockReturnValue({
    data: session,
    status: (session ? 'authenticated' : 'unauthenticated') as 'authenticated' | 'unauthenticated' | 'loading',
    update: jest.fn(),
  });
};

// 設定 loading 狀態
export const setMockSessionLoading = () => {
  mockUseSession.mockReturnValue({
    data: null as Session | null,
    status: 'loading' as 'authenticated' | 'unauthenticated' | 'loading',
    update: jest.fn(),
  });
};

// Mock next-auth/react module
jest.mock('next-auth/react', () => ({
  useSession: mockUseSession,
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCsrfToken: jest.fn().mockResolvedValue('mock-csrf-token'),
  getProviders: jest.fn().mockResolvedValue({
    google: { id: 'google', name: 'Google' },
    github: { id: 'github', name: 'GitHub' },
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @/lib/auth/session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: mockGetServerSession,
}));