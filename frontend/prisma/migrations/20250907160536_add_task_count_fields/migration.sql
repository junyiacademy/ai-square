-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "completed_task_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_task_count" INTEGER NOT NULL DEFAULT 0;
