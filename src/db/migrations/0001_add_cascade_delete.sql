-- Fix FK constraints to use ON DELETE CASCADE
-- This allows automatic deletion of child records when parent is deleted

-- Fix sandboxes.user_id -> users.id
ALTER TABLE "sandboxes" DROP CONSTRAINT IF EXISTS "sandboxes_user_id_users_id_fk";
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;

-- Fix ai_logs.user_id -> users.id
ALTER TABLE "ai_logs" DROP CONSTRAINT IF EXISTS "ai_logs_user_id_users_id_fk";
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;

-- Fix ai_logs.sandbox_id -> sandboxes.id
ALTER TABLE "ai_logs" DROP CONSTRAINT IF EXISTS "ai_logs_sandbox_id_sandboxes_id_fk";
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_sandbox_id_sandboxes_id_fk"
  FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade;

-- Fix query_history.sandbox_id -> sandboxes.id
ALTER TABLE "query_history" DROP CONSTRAINT IF EXISTS "query_history_sandbox_id_sandboxes_id_fk";
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_sandbox_id_sandboxes_id_fk"
  FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade;

-- Fix templates.user_id -> users.id (already has cascade in schema, but not in migration)
ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_user_id_users_id_fk";
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
