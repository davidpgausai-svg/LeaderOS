CREATE TABLE "action_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" varchar NOT NULL,
	"title" text NOT NULL,
	"is_completed" text DEFAULT 'false' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "action_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"strategy_id" varchar NOT NULL,
	"project_id" varchar,
	"target_value" text,
	"current_value" text,
	"measurement_unit" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"due_date" timestamp,
	"is_archived" text DEFAULT 'false' NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"user_id" varchar NOT NULL,
	"strategy_id" varchar,
	"project_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"role" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "barriers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_id" varchar,
	"identified_date" timestamp DEFAULT now(),
	"target_resolution_date" timestamp,
	"resolution_date" timestamp,
	"resolution_notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"strategy_id" varchar NOT NULL,
	"selected_project_ids" text NOT NULL,
	"selected_action_ids" text NOT NULL,
	"notes" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_id" varchar,
	"related_entity_type" text,
	"is_read" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"strategy_id" varchar NOT NULL,
	"kpi" text NOT NULL,
	"kpi_tracking" text,
	"accountable_leaders" text NOT NULL,
	"resources_required" text,
	"start_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" text DEFAULT 'NYS' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"is_archived" text DEFAULT 'false' NOT NULL,
	"document_folder_url" text,
	"communication_url" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"goal" text,
	"start_date" timestamp NOT NULL,
	"target_date" timestamp NOT NULL,
	"metrics" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"completion_date" timestamp,
	"color_code" text DEFAULT '#3B82F6' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"case_for_change" text DEFAULT 'To be defined' NOT NULL,
	"vision_statement" text DEFAULT 'To be defined' NOT NULL,
	"success_metrics" text DEFAULT 'To be defined' NOT NULL,
	"stakeholder_map" text DEFAULT 'To be defined' NOT NULL,
	"readiness_rating" text DEFAULT 'To be defined' NOT NULL,
	"risk_exposure_rating" text DEFAULT 'To be defined' NOT NULL,
	"change_champion_assignment" text DEFAULT 'To be defined' NOT NULL,
	"reinforcement_plan" text DEFAULT 'To be defined' NOT NULL,
	"benefits_realization_plan" text DEFAULT 'To be defined' NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_strategy_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"strategy_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "user_strategy_assignments_user_id_strategy_id_unique" UNIQUE("user_id","strategy_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'co_lead' NOT NULL,
	"timezone" varchar DEFAULT 'America/Chicago',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");