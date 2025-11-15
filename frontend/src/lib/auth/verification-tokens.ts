// Shared verification token storage
// In production, this should use Redis or database storage

type TokenData = {
  email: string;
  expiresAt: Date;
};

// Global token storage (survives module reloads in development)
const globalTokens = global as typeof globalThis & {
  __verificationTokens?: Map<string, TokenData>;
};

if (!globalTokens.__verificationTokens) {
  globalTokens.__verificationTokens = new Map<string, TokenData>();
}

export const verificationTokens = globalTokens.__verificationTokens;
