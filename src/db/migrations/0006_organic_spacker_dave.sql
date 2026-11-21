CREATE TABLE "cie10_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(15) NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cie10_codes" ADD CONSTRAINT "cie10_codes_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cie10_codes" ADD CONSTRAINT "cie10_codes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cie10_codes" ADD CONSTRAINT "cie10_codes_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cie10_codes_tenant_code" ON "cie10_codes" USING btree ("tenant_id",UPPER(TRIM("code"))) WHERE "cie10_codes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_cie10_codes_tenant_category" ON "cie10_codes" USING btree ("tenant_id","category","is_favorite");