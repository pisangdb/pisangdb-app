CREATE INDEX "idx_sandboxes_user_id" ON "sandboxes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sandboxes_engine" ON "sandboxes" USING btree ("engine");--> statement-breakpoint
CREATE INDEX "idx_sandboxes_region" ON "sandboxes" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_sandboxes_status" ON "sandboxes" USING btree ("status");