-- Add progress commentary for critical action items

CREATE TABLE "project_action_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "action_item_id" uuid NOT NULL REFERENCES "project_action_items"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "comment" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_action_comments_action_created_idx" ON "project_action_comments"("action_item_id", "created_at");

