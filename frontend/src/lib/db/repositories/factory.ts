/**
 * Database Repository Factory Export
 * Re-exports the repository factory from the correct location
 * This file provides a convenient import path that matches the migration pattern
 */

export { repositoryFactory, RepositoryFactory } from '@/lib/repositories/base/repository-factory';

// Export a function to match the pattern used in migrated files
export function createRepositoryFactory() {
  return repositoryFactory;
}