/**
 * Mock for next-auth
 */

export const getServerSession = jest.fn(() => Promise.resolve(null));
export const getCsrfToken = jest.fn(() => Promise.resolve('mock-csrf-token'));
export const getProviders = jest.fn(() => Promise.resolve({}));
export const getSession = jest.fn(() => Promise.resolve(null));
export const signIn = jest.fn(() => Promise.resolve({ ok: true }));
export const signOut = jest.fn(() => Promise.resolve(undefined));
export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
  update: jest.fn(),
}));

const nextAuth = jest.fn();
export default nextAuth;