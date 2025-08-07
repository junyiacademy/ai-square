export default jest.fn();
export const getServerSession = jest.fn(() => Promise.resolve(null));
export const getCsrfToken = jest.fn();
export const getProviders = jest.fn();
export const getSession = jest.fn();
export const signIn = jest.fn();
export const signOut = jest.fn();
export const useSession = jest.fn();