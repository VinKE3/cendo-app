CREATE TABLE "clinical_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" varchar(40) NOT NULL,
	"sub_type" varchar(40),
	"code" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "google_maps_url" text;--> statement-breakpoint
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_clinical_templates_tenant_scope_code" ON "clinical_templates" USING btree ("tenant_id","scope",LOWER(TRIM("code"))) WHERE "clinical_templates"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_clinical_templates_tenant_scope_order" ON "clinical_templates" USING btree ("tenant_id","scope","sort_order");