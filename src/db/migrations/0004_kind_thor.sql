ALTER TABLE "clinical_checkups" ADD COLUMN "status" varchar(24) DEFAULT 'EN_PROCESO' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD COLUMN "dossier_config" jsonb;