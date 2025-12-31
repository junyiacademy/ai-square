/**
 * User Data Services - Central Export
 *
 * This file provides a central location for importing user data services
 */

// Types
export type {
  UserData,
  AssessmentResults,
  UserAchievements,
  AssessmentSession,
  Badge,
  Achievement,
  UserDataOperations,
  EvaluationOperations,
  EvaluationData,
} from "@/lib/types/user-data";

// Interfaces
export type {
  IUserDataService,
  UserDataServiceConfig,
  UserDataServiceFactory,
} from "./user-data-service.interface";

// LocalStorage Implementation
export {
  UserDataService,
  createUserDataService,
  userDataService,
} from "./user-data-service";

// GCS Implementation removed - now using PostgreSQL

// Client Implementation (for browser/API communication)
export {
  UserDataServiceClient,
  createUserDataServiceClient,
} from "./user-data-service-client";
