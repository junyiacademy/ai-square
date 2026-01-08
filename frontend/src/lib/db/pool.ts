/**
 * Pool module for database connections
 * Re-exports from get-pool for backward compatibility
 */

export * from "./get-pool";
import { getPool } from "./get-pool";
export { getPool };

// Add query function for backward compatibility
export async function query(text: string, params?: unknown[]) {
  const pool = getPool();
  return pool.query(text, params);
}
