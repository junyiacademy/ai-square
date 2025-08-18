-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'student',
    "name" VARCHAR(255),
    "avatar_url" VARCHAR(255),
    "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "learning_preferences" JSONB,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "reset_password_token" VARCHAR(255),
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "source_type" VARCHAR(50),
    "source_path" TEXT,
    "source_id" VARCHAR(255),
    "source_metadata" JSONB,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "objectives" JSONB,
    "task_templates" JSONB,
    "sequence_data" JSONB,
    "pbl_data" JSONB,
    "discovery_data" JSONB,
    "assessment_data" JSONB,
    "difficulty" VARCHAR(50),
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" VARCHAR(50) NOT NULL,
    "scenario_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" VARCHAR(50) NOT NULL,
    "program_id" UUID NOT NULL,
    "scenario_id" UUID NOT NULL,
    "task_index" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mode" VARCHAR(50) NOT NULL,
    "task_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "evaluation_type" VARCHAR(50) NOT NULL,
    "score" DECIMAL(10,2),
    "max_score" DECIMAL(10,2),
    "feedback" JSONB,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "criteria" JSONB,
    "rubric" JSONB,
    "metadata" JSONB,
    "ai_model" VARCHAR(100),
    "ai_config" JSONB,
    "ai_response" JSONB,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scenarios_mode_idx" ON "scenarios"("mode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scenarios_status_idx" ON "scenarios"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "programs_user_id_idx" ON "programs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "programs_scenario_id_idx" ON "programs"("scenario_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "programs_status_idx" ON "programs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_program_id_idx" ON "tasks"("program_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "evaluations_task_id_idx" ON "evaluations"("task_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "evaluations_user_id_idx" ON "evaluations"("user_id");

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;