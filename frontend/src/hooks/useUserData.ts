/**
 * useUserData Hook - V2 with GCS
 * 
 * This is now a wrapper around useUserDataV2 for backward compatibility
 * All new code should use useUserDataV2 directly
 */

export { useUserDataV2 as useUserData } from './useUserDataV2';
export type { 
  UserData, 
  AssessmentResults, 
  WorkspaceSession, 
  SavedPathData, 
  UserAchievements,
  AssessmentSession,
  TaskAnswer,
  DynamicTask 
} from '@/lib/services/user-data-service';