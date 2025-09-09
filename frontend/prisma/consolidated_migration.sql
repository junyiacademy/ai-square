-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "name" TEXT,
    "avatar_url" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "learning_preferences" JSONB,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "email_verification_token" TEXT,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "last_login_at" TIMESTAMP(3),
    "last_active_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenarios" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "source_type" TEXT,
    "source_path" TEXT,
    "source_id" TEXT,
    "source_metadata" JSONB,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "objectives" JSONB,
    "task_templates" JSONB,
    "sequence_data" JSONB,
    "pbl_data" JSONB,
    "discovery_data" JSONB,
    "assessment_data" JSONB,
    "difficulty" TEXT,
    "estimated_time" INTEGER,
    "estimated_minutes" INTEGER,
    "prerequisites" TEXT[],
    "tags" TEXT[],
    "ai_modules" JSONB,
    "resources" JSONB,
    "media" JSONB NOT NULL DEFAULT '{}',
    "image_url" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "xp_rewards" JSONB NOT NULL DEFAULT '{}',
    "ksa_codes" TEXT[],
    "unlock_requirements" JSONB NOT NULL DEFAULT '{}',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_enrollments" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."programs" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "scenario_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_task_index" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB,
    "state" JSONB,
    "pbl_data" JSONB,
    "discovery_data" JSONB,
    "assessment_data" JSONB,
    "total_score" DECIMAL(10,2),
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "completion_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "program_id" UUID NOT NULL,
    "scenario_id" UUID NOT NULL,
    "task_index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" JSONB,
    "description" JSONB,
    "instructions" JSONB,
    "content" JSONB,
    "context" JSONB,
    "metadata" JSONB,
    "interactions" JSONB NOT NULL DEFAULT '[]',
    "ai_feedback" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER,
    "score" DECIMAL(10,2),
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "task_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "score" DECIMAL(10,2),
    "max_score" DECIMAL(10,2),
    "feedback" JSONB,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "criteria" JSONB,
    "rubric" JSONB,
    "metadata" JSONB,
    "ai_model" TEXT,
    "ai_config" JSONB,
    "ai_response" JSONB,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "scenarios_mode_idx" ON "public"."scenarios"("mode");

-- CreateIndex
CREATE INDEX "scenarios_status_idx" ON "public"."scenarios"("status");

-- CreateIndex
CREATE INDEX "programs_user_id_idx" ON "public"."programs"("user_id");

-- CreateIndex
CREATE INDEX "programs_scenario_id_idx" ON "public"."programs"("scenario_id");

-- CreateIndex
CREATE INDEX "programs_status_idx" ON "public"."programs"("status");

-- CreateIndex
CREATE INDEX "tasks_program_id_idx" ON "public"."tasks"("program_id");

-- CreateIndex
CREATE INDEX "evaluations_task_id_idx" ON "public"."evaluations"("task_id");

-- CreateIndex
CREATE INDEX "evaluations_user_id_idx" ON "public"."evaluations"("user_id");

-- AddForeignKey
ALTER TABLE "public"."scenarios" ADD CONSTRAINT "scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenarios" ADD CONSTRAINT "scenarios_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "completed_task_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_task_count" INTEGER NOT NULL DEFAULT 0;
-- AlterTable
ALTER TABLE "public"."evaluations" ADD COLUMN     "domain_scores" JSONB;

-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "domain_scores" JSONB;
-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "badges_earned" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "xp_earned" INTEGER NOT NULL DEFAULT 0;
-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "metadata" JSONB;
-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "ai_config" JSONB,
ADD COLUMN     "allowed_attempts" INTEGER,
ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scenario_task_index" INTEGER;
