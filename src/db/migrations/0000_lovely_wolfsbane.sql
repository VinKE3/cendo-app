CREATE TYPE "public"."lab_urgency" AS ENUM('Rutina', 'Prioritario', 'Urgente');--> statement-breakpoint
CREATE TYPE "public"."clinical_role" AS ENUM('director', 'doctor', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'moderator', 'user');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDIENTE', 'CONFIRMADA', 'EN_ESPERA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO');--> statement-breakpoint
CREATE TABLE "lab_order_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"template_type" varchar(30) DEFAULT 'CUSTOM' NOT NULL,
	"sample_type" text DEFAULT '' NOT NULL,
	"fixative_transport" text DEFAULT '' NOT NULL,
	"suggested_diagnosis" text DEFAULT '' NOT NULL,
	"cie10_code" varchar(15),
	"default_tests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clinical_notes" text,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medications_vademecum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"generic_name" text NOT NULL,
	"atc_code" varchar(20),
	"therapeutic_group" text NOT NULL,
	"commercial_brands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"indications" text,
	"contraindications" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "procedures_tariff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clinical_checkups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"checkup_date" date NOT NULL,
	"reason_for_consultation" text,
	"breast_ultrasound_findings" text,
	"breast_ultrasound_birads" text DEFAULT 'BI-RADS 1',
	"breast_lesion_measurements" text,
	"transvaginal_ultrasound_findings" text,
	"uterus_measurements" text,
	"endometrium_thickness_mm" numeric(5, 2),
	"ovaries_findings" text,
	"colposcopy_findings" text,
	"colposcopy_result" text,
	"pap_result" text,
	"vph_result" text,
	"conclusions" text,
	"cie10_code" varchar(15),
	"medical_prescription" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"order_date" date NOT NULL,
	"diagnosis" text NOT NULL,
	"cie10_code" varchar(15),
	"urgency" "lab_urgency" DEFAULT 'Rutina' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_tests" text,
	"patient_instructions" text,
	"template_type" varchar(30) DEFAULT 'GENERAL',
	"template_title" text,
	"specimen_details" jsonb,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medical_consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"consultation_date" date NOT NULL,
	"reason_for_visit" text NOT NULL,
	"illness_time" text,
	"symptoms" text,
	"vital_signs" jsonb NOT NULL,
	"physical_exam" jsonb NOT NULL,
	"diagnosis" text NOT NULL,
	"cie10_code" varchar(15),
	"treatment_plan" text NOT NULL,
	"auxiliary_exams" text,
	"prescription_notes" text,
	"next_appointment_date" date,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medical_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"prescription_date" date NOT NULL,
	"diagnosis" text NOT NULL,
	"cie10_code" varchar(15),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"general_indications" text,
	"next_appointment_date" date,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "procedure_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"quote_date" date NOT NULL,
	"validity_days" integer DEFAULT 30 NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"discount_total" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"payment_terms" text DEFAULT 'Efectivo, Transferencia BCP/BBVA o Tarjeta de Crédito/Débito' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clinical_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"action" varchar(30) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" text NOT NULL,
	"changes_summary" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"doctor_title" varchar(16) DEFAULT 'Dr.' NOT NULL,
	"specialty" text DEFAULT 'Ginecología y Obstetricia' NOT NULL,
	"cmp" varchar(20) NOT NULL,
	"rne" varchar(20) DEFAULT '' NOT NULL,
	"role" "user_role" DEFAULT 'moderator' NOT NULL,
	"clinical_role" "clinical_role" DEFAULT 'doctor' NOT NULL,
	"clinic_name" text DEFAULT 'CENDO - Centro de Endometriosis y Ginecología' NOT NULL,
	"clinic_address" text DEFAULT 'Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima' NOT NULL,
	"phone" text DEFAULT '985 945 697' NOT NULL,
	"contact_email" text DEFAULT 'cendoperu@gmail.com' NOT NULL,
	"avatar_url" text,
	"signature_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"document_type" varchar(40) DEFAULT 'LABORATORIO' NOT NULL,
	"title" text NOT NULL,
	"document_date" date,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"notes" text,
	"uploaded_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "word_history_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"storage_path" text NOT NULL,
	"extracted_text" text,
	"notes" text,
	"uploaded_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medical_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" time NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"appointment_type" text NOT NULL,
	"reason" text NOT NULL,
	"status" "appointment_status" DEFAULT 'CONFIRMADA' NOT NULL,
	"notes" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_backgrounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"menarche" integer,
	"sexual_debut_age" integer,
	"sexual_partners_count" integer,
	"catamenial_regimen" text,
	"sti_history" text,
	"obstetric_formula" varchar(30) DEFAULT 'G0 P0000',
	"contraceptive_method" text,
	"last_menstrual_period" date,
	"pap_history" text,
	"vph_test_history" text,
	"has_diabetes" text DEFAULT 'Niega',
	"has_hypertension" text DEFAULT 'Niega',
	"has_asthma" text DEFAULT 'Niega',
	"medical_allergies" text,
	"surgeries_history" text,
	"family_history" text,
	"other_pathologies" text,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(20) DEFAULT 'DNI' NOT NULL,
	"document_number" varchar(20) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" date,
	"phone" text,
	"email" text,
	"address" text,
	"district" text DEFAULT 'Miraflores',
	"civil_status" text DEFAULT 'Soltera',
	"occupation" text,
	"education_level" text,
	"birth_place" text,
	"religion" text,
	"insurance_info" text DEFAULT 'Particular',
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "colposcopy_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"report_date" date NOT NULL,
	"adequate_colposcopy" boolean DEFAULT true NOT NULL,
	"squamocolumnar_junction_visible" text DEFAULT 'Visible' NOT NULL,
	"transformation_zone_type" text DEFAULT 'Tipo 1' NOT NULL,
	"mature_squamous_epithelium" boolean DEFAULT true NOT NULL,
	"ectopy" boolean DEFAULT false NOT NULL,
	"thin_acetowhite_epithelium" boolean DEFAULT false NOT NULL,
	"dense_acetowhite_epithelium" boolean DEFAULT false NOT NULL,
	"irregular_border" boolean DEFAULT false NOT NULL,
	"fine_mosaic" boolean DEFAULT false NOT NULL,
	"coarse_mosaic" boolean DEFAULT false NOT NULL,
	"fine_punctation" boolean DEFAULT false NOT NULL,
	"coarse_punctation" boolean DEFAULT false NOT NULL,
	"atypical_vessels" boolean DEFAULT false NOT NULL,
	"extended_findings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schiller_test" text DEFAULT 'Negativo' NOT NULL,
	"cervical_biopsy_taken" boolean DEFAULT false NOT NULL,
	"biopsy_clock_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diagnosis" text NOT NULL,
	"plan_recommendations" text NOT NULL,
	"cie10_code" varchar(15) DEFAULT 'Z01.4' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "minor_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"procedure_date" date NOT NULL,
	"procedure_type" varchar(50) NOT NULL,
	"pre_op_diagnosis" text NOT NULL,
	"post_op_diagnosis" text NOT NULL,
	"cie10_code" varchar(15),
	"anesthesia_type" text DEFAULT 'Local (Lidocaína 2%)' NOT NULL,
	"procedure_details" jsonb NOT NULL,
	"post_op_indications" text NOT NULL,
	"medications_prescribed" text,
	"next_control_date" date,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prenatal_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinic_establishment" text DEFAULT 'CENDO - Centro de Endometriosis & Ginecología Especializada' NOT NULL,
	"attending_doctor_id" uuid,
	"attending_doctor_name" text NOT NULL,
	"baseline" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maternal_pathologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ultrasound_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"doctor_id" uuid,
	"doctor_name" text NOT NULL,
	"doctor_cmp" varchar(20) NOT NULL,
	"doctor_rne" varchar(20),
	"report_date" date NOT NULL,
	"ultrasound_type" varchar(40) NOT NULL,
	"indication" text NOT NULL,
	"findings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conclusion" text NOT NULL,
	"recommendations" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "lab_order_templates" ADD CONSTRAINT "lab_order_templates_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_order_templates" ADD CONSTRAINT "lab_order_templates_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_order_templates" ADD CONSTRAINT "lab_order_templates_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications_vademecum" ADD CONSTRAINT "medications_vademecum_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications_vademecum" ADD CONSTRAINT "medications_vademecum_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications_vademecum" ADD CONSTRAINT "medications_vademecum_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures_tariff" ADD CONSTRAINT "procedures_tariff_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures_tariff" ADD CONSTRAINT "procedures_tariff_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures_tariff" ADD CONSTRAINT "procedures_tariff_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_checkups" ADD CONSTRAINT "clinical_checkups_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_appointment_id_medical_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."medical_appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_prescriptions" ADD CONSTRAINT "medical_prescriptions_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_quotes" ADD CONSTRAINT "procedure_quotes_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_audit_logs" ADD CONSTRAINT "clinical_audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_history_documents" ADD CONSTRAINT "word_history_documents_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_history_documents" ADD CONSTRAINT "word_history_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_history_documents" ADD CONSTRAINT "word_history_documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_history_documents" ADD CONSTRAINT "word_history_documents_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_appointments" ADD CONSTRAINT "medical_appointments_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_appointments" ADD CONSTRAINT "medical_appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_appointments" ADD CONSTRAINT "medical_appointments_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_appointments" ADD CONSTRAINT "medical_appointments_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_appointments" ADD CONSTRAINT "medical_appointments_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_backgrounds" ADD CONSTRAINT "patient_backgrounds_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_backgrounds" ADD CONSTRAINT "patient_backgrounds_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_backgrounds" ADD CONSTRAINT "patient_backgrounds_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_backgrounds" ADD CONSTRAINT "patient_backgrounds_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colposcopy_reports" ADD CONSTRAINT "colposcopy_reports_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minor_procedures" ADD CONSTRAINT "minor_procedures_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prenatal_cards" ADD CONSTRAINT "prenatal_cards_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prenatal_cards" ADD CONSTRAINT "prenatal_cards_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prenatal_cards" ADD CONSTRAINT "prenatal_cards_attending_doctor_id_profiles_id_fk" FOREIGN KEY ("attending_doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prenatal_cards" ADD CONSTRAINT "prenatal_cards_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prenatal_cards" ADD CONSTRAINT "prenatal_cards_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_tenant_id_clinics_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_consultation_id_medical_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."medical_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_doctor_id_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultrasound_reports" ADD CONSTRAINT "ultrasound_reports_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_lab_templates_tenant_code" ON "lab_order_templates" USING btree ("tenant_id",LOWER(TRIM("code"))) WHERE "lab_order_templates"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_lab_templates_tenant_category" ON "lab_order_templates" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vademecum_tenant_generic_name" ON "medications_vademecum" USING btree ("tenant_id",LOWER(TRIM("generic_name"))) WHERE "medications_vademecum"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_vademecum_tenant_group" ON "medications_vademecum" USING btree ("tenant_id","therapeutic_group");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_procedures_tariff_tenant_code" ON "procedures_tariff" USING btree ("tenant_id",UPPER(TRIM("code"))) WHERE "procedures_tariff"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_procedures_tariff_tenant_name" ON "procedures_tariff" USING btree ("tenant_id",LOWER(TRIM("name"))) WHERE "procedures_tariff"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_procedures_tariff_tenant_category" ON "procedures_tariff" USING btree ("tenant_id","category","active");--> statement-breakpoint
CREATE INDEX "idx_checkups_tenant_patient_date" ON "clinical_checkups" USING btree ("tenant_id","patient_id","checkup_date");--> statement-breakpoint
CREATE INDEX "idx_lab_orders_tenant_patient_date" ON "lab_orders" USING btree ("tenant_id","patient_id","order_date");--> statement-breakpoint
CREATE INDEX "idx_consultations_tenant_patient_date" ON "medical_consultations" USING btree ("tenant_id","patient_id","consultation_date");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_tenant_patient_date" ON "medical_prescriptions" USING btree ("tenant_id","patient_id","prescription_date");--> statement-breakpoint
CREATE INDEX "idx_quotes_tenant_patient_date" ON "procedure_quotes" USING btree ("tenant_id","patient_id","quote_date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant_created" ON "clinical_audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "clinical_audit_logs" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profiles_unique_email" ON "profiles" USING btree (LOWER(TRIM("email")));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profiles_tenant_cmp" ON "profiles" USING btree ("tenant_id",TRIM("cmp")) WHERE TRIM("profiles"."cmp") <> '' AND "profiles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_profiles_tenant_active" ON "profiles" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_patient_docs_tenant_patient_created" ON "patient_documents" USING btree ("tenant_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_word_docs_tenant_patient_created" ON "word_history_documents" USING btree ("tenant_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_tenant_date_doctor" ON "medical_appointments" USING btree ("tenant_id","appointment_date","doctor_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_tenant_patient_date" ON "medical_appointments" USING btree ("tenant_id","patient_id","appointment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patient_backgrounds_patient_id" ON "patient_backgrounds" USING btree ("tenant_id","patient_id") WHERE "patient_backgrounds"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_patients_tenant_doc" ON "patients" USING btree ("tenant_id","document_type",TRIM("document_number")) WHERE "patients"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_patients_tenant_doc_num" ON "patients" USING btree ("tenant_id","document_number");--> statement-breakpoint
CREATE INDEX "idx_patients_tenant_fullname" ON "patients" USING btree ("tenant_id","full_name");--> statement-breakpoint
CREATE INDEX "idx_colposcopy_tenant_patient_date" ON "colposcopy_reports" USING btree ("tenant_id","patient_id","report_date");--> statement-breakpoint
CREATE INDEX "idx_procedures_tenant_patient_date" ON "minor_procedures" USING btree ("tenant_id","patient_id","procedure_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_prenatal_cards_tenant_patient" ON "prenatal_cards" USING btree ("tenant_id","patient_id") WHERE "prenatal_cards"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_ultrasound_tenant_patient_date" ON "ultrasound_reports" USING btree ("tenant_id","patient_id","report_date");