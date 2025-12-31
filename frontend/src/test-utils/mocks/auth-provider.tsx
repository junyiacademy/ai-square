import React from "react";

// Mock AuthContext and Provider for testing
export const mockAuthValue = {
  user: null,
  loading: false,
  error: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};

export const AuthContext = React.createContext(mockAuthValue);

export const MockAuthProvider = ({
  children,
  value = mockAuthValue,
}: {
  children: React.ReactNode;
  value?: any;
}) => {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Mock useAuth hook
export const useAuth = jest.fn(() => mockAuthValue);
