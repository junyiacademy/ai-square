import React from "react";

// Mock AuthContext for testing
export const mockAuthValue = {
  user: null,
  loading: false,
  error: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};

export const AuthContext = React.createContext(mockAuthValue);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthContext.Provider value={mockAuthValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = jest.fn(() => mockAuthValue);
