CREATE TYPE "public"."preparation_stage" AS ENUM('connecting', 'discovering', 'fetching_history', 'ready');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('fresh', 'syncing', 'needs_reconnect', 'failed');--> statement-breakpoint
CREATE TABLE "google_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_sub" text NOT NULL,
	"google_email" text NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text NOT NULL,
	"access_token_expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_connections_user_sub_key" UNIQUE("user_id","google_sub")
);
--> statement-breakpoint
CREATE TABLE "site_sync_state" (
	"site_id" uuid PRIMARY KEY NOT NULL,
	"stage" "preparation_stage" DEFAULT 'connecting' NOT NULL,
	"last_synced_date" date,
	"history_start_date" date,
	"last_success_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_error_code" text
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"gsc_property" text NOT NULL,
	"display_name" text NOT NULL,
	"permission_level" text NOT NULL,
	"status" "site_status" DEFAULT 'syncing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_user_property_key" UNIQUE("user_id","gsc_property")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_sync_state" ADD CONSTRAINT "site_sync_state_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_connection_id_google_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."google_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sites_user_idx" ON "sites" USING btree ("user_id");