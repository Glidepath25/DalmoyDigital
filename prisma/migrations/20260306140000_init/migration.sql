-- Dalmoy Digital - Phase 1 initial schema
-- This migration is intentionally explicit SQL so it can be reviewed easily.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "name" text,
  "password_hash" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "is_system" boolean NOT NULL DEFAULT true
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "description" text
);

CREATE TABLE "user_roles" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "clients_active_sort_idx" ON "clients"("is_active", "sort_order");
CREATE INDEX "clients_archived_idx" ON "clients"("archived_at");

CREATE TABLE "project_statuses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "project_statuses_active_sort_idx" ON "project_statuses"("is_active", "sort_order");
CREATE INDEX "project_statuses_archived_idx" ON "project_statuses"("archived_at");

CREATE TABLE "lookup_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "lookup_types_active_sort_idx" ON "lookup_types"("is_active", "sort_order");

CREATE TABLE "lookup_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lookup_type_id" uuid NOT NULL REFERENCES "lookup_types"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "value" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "lookup_options_type_value_uq" ON "lookup_options"("lookup_type_id", "value");
CREATE INDEX "lookup_options_type_active_sort_idx" ON "lookup_options"("lookup_type_id", "is_active", "sort_order");

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "notes" text,
  "due_date" timestamptz,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
  "status_id" uuid NOT NULL REFERENCES "project_statuses"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "projects_client_idx" ON "projects"("client_id");
CREATE INDEX "projects_status_idx" ON "projects"("status_id");
CREATE INDEX "projects_due_date_idx" ON "projects"("due_date");

