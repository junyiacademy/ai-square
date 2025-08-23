-- Add email_verified_at timestamp to users table
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Add comment for documentation
COMMENT ON COLUMN "users"."email_verified_at" IS 'Timestamp when the user email was verified';