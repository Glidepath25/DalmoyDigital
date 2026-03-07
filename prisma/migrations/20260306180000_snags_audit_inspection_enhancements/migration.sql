-- Dalmoy Digital - Snags + audit trail + inspection enhancements

CREATE TABLE "project_snags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "status_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "priority_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "responsible_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "date_raised" timestamptz NOT NULL DEFAULT now(),
  "target_closure_date" timestamptz,
  "date_rectified" timestamptz,
  "date_closed" timestamptz,
  "internal_close_out_comment" text,
  "additional_work_required_comment" text,
  "raised_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_snags_project_idx" ON "project_snags"("project_id");
CREATE INDEX "project_snags_status_idx" ON "project_snags"("status_option_id");
CREATE INDEX "project_snags_priority_idx" ON "project_snags"("priority_option_id");
CREATE INDEX "project_snags_responsible_idx" ON "project_snags"("responsible_user_id");
CREATE INDEX "project_snags_date_raised_idx" ON "project_snags"("date_raised");

CREATE TABLE "project_snag_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "snag_id" uuid NOT NULL REFERENCES "project_snags"("id") ON DELETE CASCADE,
  "file_id" uuid NOT NULL REFERENCES "stored_files"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_snag_attachments_snag_idx" ON "project_snag_attachments"("snag_id");

CREATE TABLE "project_audit_trail_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "action_type" text NOT NULL,
  "field_name" text,
  "old_value" text,
  "new_value" text,
  "summary" text,
  "performed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "performed_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_audit_trail_project_time_idx" ON "project_audit_trail_entries"("project_id", "performed_at");
CREATE INDEX "project_audit_trail_entity_action_idx" ON "project_audit_trail_entries"("entity_type", "action_type");

ALTER TABLE "project_milestones"
  ADD COLUMN "duration_days" integer;

ALTER TABLE "site_inspection_items"
  ADD COLUMN "status_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  ADD COLUMN "severity_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  ADD COLUMN "is_snag" boolean NOT NULL DEFAULT false,
  ADD COLUMN "snag_id" uuid REFERENCES "project_snags"("id") ON DELETE SET NULL,
  ADD COLUMN "assigned_to_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "action_required" text;

CREATE UNIQUE INDEX "site_inspection_items_snag_uq" ON "site_inspection_items"("snag_id");
CREATE INDEX "site_inspection_items_status_idx" ON "site_inspection_items"("status_option_id");
CREATE INDEX "site_inspection_items_severity_idx" ON "site_inspection_items"("severity_option_id");
CREATE INDEX "site_inspection_items_assigned_idx" ON "site_inspection_items"("assigned_to_user_id");

