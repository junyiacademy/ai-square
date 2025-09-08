-- AlterTable
ALTER TABLE "public"."evaluations" ADD COLUMN     "domain_scores" JSONB;

-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "domain_scores" JSONB;
