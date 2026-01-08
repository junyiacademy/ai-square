/**
 * User type with password for authentication
 * This extends the base User type to include passwordHash
 * Only used in authentication contexts
 */

import { User } from "./index";

export interface UserWithPassword extends User {
  passwordHash: string;
}
