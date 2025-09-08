-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "badges_earned" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "xp_earned" INTEGER NOT NULL DEFAULT 0;
