import { Storage } from "@google-cloud/storage";
import {
  UserDataInput,
  UserDataResponse,
  UserBadge,
} from "@/lib/repositories/interfaces";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

type StoredAssessmentSession = UserDataResponse["assessmentSessions"][number] & {
  results?: UserDataInput["assessmentSessions"][number]["results"];
};

type StoredUserBadge = UserBadge & {
  metadata?: Record<string, unknown>;
};

function normalizeAssessmentSession(
  session:
    | UserDataInput["assessmentSessions"][number]
    | UserDataResponse["assessmentSessions"][number],
): StoredAssessmentSession {
  if ("sessionKey" in session) {
    const results = (
      session as { results?: UserDataInput["assessmentSessions"][number]["results"] }
    ).results ?? {
      tech: session.techScore,
      creative: session.creativeScore,
      business: session.businessScore,
    };
    return { ...session, results };
  }

  return {
    id: session.id,
    userId: "gcs",
    sessionKey: session.id,
    techScore: session.results.tech,
    creativeScore: session.results.creative,
    businessScore: session.results.business,
    answers: session.answers ?? {},
    generatedPaths: session.generatedPaths ?? [],
    createdAt: new Date(session.createdAt),
    results: session.results,
  };
}

function normalizeUserBadge(
  badge:
    | UserDataInput["achievements"]["badges"][number]
    | UserBadge,
): StoredUserBadge {
  if ("badgeId" in badge) {
    return badge;
  }

  return {
    id: badge.id,
    userId: "gcs",
    badgeId: badge.id,
    name: badge.name,
    description: badge.description,
    imageUrl: badge.imageUrl,
    category: badge.category,
    xpReward: badge.xpReward,
    unlockedAt: new Date(badge.unlockedAt),
  };
}

function normalizeUserData(
  data: UserDataInput | UserDataResponse,
): UserDataResponse {
  return {
    assessmentResults: data.assessmentResults ?? null,
    achievements: {
      badges: (data.achievements?.badges ?? []).map(normalizeUserBadge),
      totalXp: data.achievements?.totalXp ?? 0,
      level: data.achievements?.level ?? 1,
      completedTasks: data.achievements?.completedTasks ?? [],
      achievements: data.achievements?.achievements ?? [],
    },
    assessmentSessions: (data.assessmentSessions ?? []).map(
      normalizeAssessmentSession,
    ),
    currentView: data.currentView,
    lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    version: data.version ?? "gcs",
  };
}

export interface UserDataStorage {
  getUserData(userEmail: string): Promise<UserDataResponse | null>;
  saveUserData(
    userEmail: string,
    data: UserDataInput,
  ): Promise<UserDataResponse>;
  deleteUserData(userEmail: string): Promise<boolean>;
}

class DatabaseUserDataStorage implements UserDataStorage {
  async getUserData(userEmail: string): Promise<UserDataResponse | null> {
    const userRepo = repositoryFactory.getUserRepository();
    return userRepo.getUserData(userEmail);
  }

  async saveUserData(
    userEmail: string,
    data: UserDataInput,
  ): Promise<UserDataResponse> {
    const userRepo = repositoryFactory.getUserRepository();
    return userRepo.saveUserData(userEmail, data);
  }

  async deleteUserData(userEmail: string): Promise<boolean> {
    const userRepo = repositoryFactory.getUserRepository();
    return userRepo.deleteUserData(userEmail);
  }
}

class GCSUserDataStorage implements UserDataStorage {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    const config: Record<string, unknown> = {};

    if (process.env.GCS_SERVICE_ACCOUNT_JSON) {
      try {
        config.credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_JSON);
      } catch (error) {
        console.error("[GCS] Failed to parse GCS_SERVICE_ACCOUNT_JSON:", error);
      }
    }

    this.storage = new Storage(config);
  }

  private getObjectPath(userEmail: string): string {
    const sanitizedEmail = userEmail.replace(/[@.]/g, "_");
    return `user-data/${sanitizedEmail}.json`;
  }

  async getUserData(userEmail: string): Promise<UserDataResponse | null> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(this.getObjectPath(userEmail));
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    const [contents] = await file.download();
    const rawData = JSON.parse(contents.toString("utf-8")) as
      | UserDataInput
      | UserDataResponse;
    return normalizeUserData(rawData);
  }

  async saveUserData(
    userEmail: string,
    data: UserDataInput,
  ): Promise<UserDataResponse> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(this.getObjectPath(userEmail));

    const normalized = normalizeUserData(data);
    const payload = JSON.stringify(normalized);
    await file.save(payload, {
      contentType: "application/json",
    });

    return normalized;
  }

  async deleteUserData(userEmail: string): Promise<boolean> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(this.getObjectPath(userEmail));
    const [exists] = await file.exists();
    if (!exists) {
      return false;
    }
    await file.delete();
    return true;
  }
}

export function createUserDataStorage(): UserDataStorage {
  const backend = process.env.USER_DATA_STORAGE_BACKEND;
  const bucket = process.env.GCS_USER_DATA_BUCKET;

  if (backend === "gcs" && bucket) {
    return new GCSUserDataStorage(bucket);
  }

  return new DatabaseUserDataStorage();
}
