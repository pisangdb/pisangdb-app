ALTER TABLE "sandboxes"
DROP CONSTRAINT IF EXISTS "sandboxes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sandboxes"
ADD CONSTRAINT "sandboxes_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_logs"
DROP CONSTRAINT IF EXISTS "ai_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_logs"
ADD CONSTRAINT "ai_logs_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_logs"
DROP CONSTRAINT IF EXISTS "ai_logs_sandbox_id_sandboxes_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_logs"
ADD CONSTRAINT "ai_logs_sandbox_id_sandboxes_id_fk"
FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "query_history"
DROP CONSTRAINT IF EXISTS "query_history_sandbox_id_sandboxes_id_fk";
--> statement-breakpoint
ALTER TABLE "query_history"
ADD CONSTRAINT "query_history_sandbox_id_sandboxes_id_fk"
FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "templates"
DROP CONSTRAINT IF EXISTS "templates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "templates"
ADD CONSTRAINT "templates_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
