/**
 * Environment variable utilities and configuration
 */

// Export all environment variables
export const env = process.env;

/**
 * Get an environment variable with optional default value
 */
export function getEnvVar(
  key: string,
  defaultValue?: string,
): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get a required environment variable (throws if not set)
 */
export function requireEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

// Common environment variables with defaults
export const config = {
  // Database
  dbHost: getEnvVar("DB_HOST", "localhost"),
  dbPort: parseInt(getEnvVar("DB_PORT", "5432") || "5432"),
  dbName: getEnvVar("DB_NAME", "ai_square_db"),
  dbUser: getEnvVar("DB_USER", "postgres"),

  // API
  apiUrl: getEnvVar("NEXT_PUBLIC_API_URL", "/api"),

  // Google Cloud
  gcpProject: getEnvVar("GOOGLE_CLOUD_PROJECT"),
  gcsBucket: getEnvVar("GCS_BUCKET_NAME", "ai-square-db-v2"),

  // Feature flags
  usePostgres: getEnvVar("USE_POSTGRES", "true") === "true",

  // Environment
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  isProduction: isProduction(),
  isDevelopment: isDevelopment(),
  isTest: isTest(),
};
