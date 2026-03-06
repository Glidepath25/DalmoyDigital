-- Dalmoy Digital - Project workspace modules (phase 2 foundations)
-- Adds project overview fields + new module tables for correspondence, programme, actions, finance, attachments, and inspections.

ALTER TABLE "projects"
  ADD COLUMN "rag_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  ADD COLUMN "senior_manager_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "site_manager_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "contract_manager_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX "projects_rag_option_idx" ON "projects"("rag_option_id");
CREATE INDEX "projects_senior_manager_idx" ON "projects"("senior_manager_user_id");
CREATE INDEX "projects_site_manager_idx" ON "projects"("site_manager_user_id");
CREATE INDEX "projects_contract_manager_idx" ON "projects"("contract_manager_user_id");

CREATE TABLE "stored_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "storage_provider" text NOT NULL,
  "storage_key" text NOT NULL UNIQUE,
  "original_name" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer,
  "uploaded_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "project_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "file_id" uuid NOT NULL REFERENCES "stored_files"("id") ON DELETE CASCADE,
  "category_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "uploaded_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_attachments_project_idx" ON "project_attachments"("project_id");
CREATE INDEX "project_attachments_category_idx" ON "project_attachments"("category_option_id");

CREATE TABLE "project_correspondence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "from_address" text NOT NULL,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "body_text" text,
  "ai_summary" text,
  "occurred_at" timestamptz NOT NULL,
  "source_type" text NOT NULL,
  "external_message_id" text,
  "external_thread_id" text,
  "provider" text,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_correspondence_project_date_idx" ON "project_correspondence"("project_id", "occurred_at");

CREATE TABLE "project_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "milestone_key" text NOT NULL,
  "milestone_name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "rag_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "program_start" timestamptz,
  "forecast_start" timestamptz,
  "program_finish" timestamptz,
  "forecast_finish" timestamptz,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "project_milestones_project_key_uq" UNIQUE ("project_id", "milestone_key")
);

CREATE INDEX "project_milestones_project_sort_idx" ON "project_milestones"("project_id", "sort_order");

CREATE TABLE "project_action_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "status_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "priority_option_id" uuid REFERENCES "lookup_options"("id") ON DELETE SET NULL,
  "owner_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "required_closure_date" timestamptz,
  "actual_closure_date" timestamptz,
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_action_items_project_idx" ON "project_action_items"("project_id");
CREATE INDEX "project_action_items_status_idx" ON "project_action_items"("status_option_id");
CREATE INDEX "project_action_items_priority_idx" ON "project_action_items"("priority_option_id");

CREATE TABLE "project_finance_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "item" text NOT NULL,
  "supplier" text,
  "tendered_cost" numeric(14,2),
  "qty" numeric(14,2),
  "actual_cost" numeric(14,2),
  "invoiced_cost" numeric(14,2),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "project_finance_lines_project_idx" ON "project_finance_lines"("project_id");

CREATE TABLE "site_inspection_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "completed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "inspection_date" timestamptz NOT NULL,
  "project_reference_snapshot" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "site_inspection_reports_project_date_idx" ON "site_inspection_reports"("project_id", "inspection_date");

CREATE TABLE "site_inspection_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id" uuid NOT NULL REFERENCES "site_inspection_reports"("id") ON DELETE CASCADE,
  "item_title" text NOT NULL,
  "comment" text,
  "photo_file_id" uuid REFERENCES "stored_files"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "site_inspection_items_report_idx" ON "site_inspection_items"("report_id");

