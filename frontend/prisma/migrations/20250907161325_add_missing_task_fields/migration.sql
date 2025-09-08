-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "ai_config" JSONB,
ADD COLUMN     "allowed_attempts" INTEGER,
ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scenario_task_index" INTEGER;
