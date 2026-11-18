import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./_helpers";

export const userRoleEnum = pgEnum("user_role", ["admin", "moderator", "user"]);
export const clinicalRoleEnum = pgEnum("clinical_role", [
  "director",
  "doctor",
  "assistant",
]);

export const clinics = pgTable("clinics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    doctorTitle: varchar("doctor_title", { length: 16 }).default("Dr.").notNull(),
    specialty: text("specialty").default("Ginecología y Obstetricia").notNull(),
    cmp: varchar("cmp", { length: 20 }).notNull(),
    rne: varchar("rne", { length: 20 }).default("").notNull(),
    /** Rol de autorización Zero Trust (admin | moderator | user) */
    role: userRoleEnum("role").default("moderator").notNull(),
    /** Rol clínico institucional (director | doctor | assistant) */
    clinicalRole: clinicalRoleEnum("clinical_role").default("doctor").notNull(),
    clinicName: text("clinic_name")
      .default("CENDO - Centro de Endometriosis y Ginecología")
      .notNull(),
    clinicAddress: text("clinic_address")
      .default("Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima")
      .notNull(),
    phone: text("phone").default("985 945 697").notNull(),
    contactEmail: text("contact_email").default("cendoperu@gmail.com").notNull(),
    avatarUrl: text("avatar_url"),
    signatureUrl: text("signature_url"),
    isActive: boolean("is_active").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_profiles_unique_email").on(sql`LOWER(TRIM(${table.email}))`),
    uniqueIndex("idx_profiles_tenant_cmp")
      .on(table.tenantId, sql`TRIM(${table.cmp})`)
      .where(sql`TRIM(${table.cmp}) <> '' AND ${table.deletedAt} IS NULL`),
    index("idx_profiles_tenant_active").on(table.tenantId, table.isActive),
  ]
);

export const clinicalAuditLogs = pgTable(
  "clinical_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    actorRole: varchar("actor_role", { length: 20 }).notNull(),
    action: varchar("action", { length: 30 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: text("entity_id").notNull(),
    changesSummary: jsonb("changes_summary").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_tenant_created").on(table.tenantId, table.createdAt),
    index("idx_audit_logs_entity").on(table.tenantId, table.entityType, table.entityId),
  ]
);
