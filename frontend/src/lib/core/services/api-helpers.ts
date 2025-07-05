/**
 * API Route Helpers
 * Helper functions for API routes using the unified architecture
 */

import { initializeServices, getServices, defaultConfig } from './service-factory';
import type { ServiceContainer } from './service-factory';

/**
 * Ensures services are initialized and returns the service container
 * This is useful for API routes that need to use the unified architecture
 */
export async function ensureServices(): Promise<ServiceContainer> {
  try {
    // Try to get existing services first
    return getServices();
  } catch (error) {
    // If not initialized, initialize with default config
    await initializeServices(defaultConfig);
    return getServices();
  }
}

/**
 * Gets user email from request cookies
 */
export function getUserEmailFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  
  try {
    const user = JSON.parse(cookieValue);
    return user.email || null;
  } catch {
    return null;
  }
}