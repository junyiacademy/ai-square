import { Storage } from "@google-cloud/storage";
import {
  UserDataInput,
  UserDataResponse,
} from "@/lib/repositories/interfaces";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

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
    const data = JSON.parse(contents.toString("utf-8")) as UserDataResponse;
    return data;
  }

  async saveUserData(
    userEmail: string,
    data: UserDataInput,
  ): Promise<UserDataResponse> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(this.getObjectPath(userEmail));

    const payload = JSON.stringify(data);
    await file.save(payload, {
      contentType: "application/json",
    });

    return {
      ...data,
      version: "gcs",
    } as UserDataResponse;
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
