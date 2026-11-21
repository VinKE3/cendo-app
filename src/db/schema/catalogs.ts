import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./_helpers";
import { clinics, profiles } from "./clinics";

export interface CommercialBrandRecord {
  brandName: string;
  laboratory: string;
  presentation: string;
  referencePricePen: number;
}

export interface TariffProviderCostRecord {
  laboratoryName: string;
  variant?: string;
  cost: number;
}

export const proceduresTariff = pgTable(
  "procedures_tariff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
    providerCosts: jsonb("provider_costs")
      .$type<TariffProviderCostRecord[]>()
      .default([])
      .notNull(),
    active: boolean("active").default(true).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_procedures_tariff_tenant_code")
      .on(table.tenantId, sql`UPPER(TRIM(${table.code}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("idx_procedures_tariff_tenant_name")
      .on(table.tenantId, sql`LOWER(TRIM(${table.name}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_procedures_tariff_tenant_category").on(
      table.tenantId,
      table.category,
      table.active
    ),
  ]
);

export const medicationsVademecum = pgTable(
  "medications_vademecum",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    genericName: text("generic_name").notNull(),
    atcCode: varchar("atc_code", { length: 20 }),
    therapeuticGroup: text("therapeutic_group").notNull(),
    commercialBrands: jsonb("commercial_brands")
      .$type<CommercialBrandRecord[]>()
      .default([])
      .notNull(),
    indications: text("indications"),
    contraindications: text("contraindications"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_vademecum_tenant_generic_name")
      .on(table.tenantId, sql`LOWER(TRIM(${table.genericName}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_vademecum_tenant_group").on(table.tenantId, table.therapeuticGroup),
  ]
);

export const labOrderTemplates = pgTable(
  "lab_order_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    title: text("title").notNull(),
    category: text("category").default("General").notNull(),
    templateType: varchar("template_type", { length: 30 }).default("CUSTOM").notNull(),
    sampleType: text("sample_type").default("").notNull(),
    fixativeTransport: text("fixative_transport").default("").notNull(),
    suggestedDiagnosis: text("suggested_diagnosis").default("").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }),
    defaultTests: jsonb("default_tests").$type<string[]>().default([]).notNull(),
    clinicalNotes: text("clinical_notes"),
    isOfficial: boolean("is_official").default(false).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_lab_templates_tenant_code")
      .on(table.tenantId, sql`LOWER(TRIM(${table.code}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_lab_templates_tenant_category").on(table.tenantId, table.category),
  ]
);

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 30 }).notNull(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_catalog_categories_tenant_scope_name")
      .on(table.tenantId, table.scope, sql`LOWER(TRIM(${table.name}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_catalog_categories_tenant_scope").on(table.tenantId, table.scope),
  ]
);

export const clinicalTemplates = pgTable(
  "clinical_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 40 }).notNull(),
    subType: varchar("sub_type", { length: 40 }),
    code: varchar("code", { length: 64 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    isOfficial: boolean("is_official").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_clinical_templates_tenant_scope_code")
      .on(table.tenantId, table.scope, sql`LOWER(TRIM(${table.code}))`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_clinical_templates_tenant_scope_order").on(
      table.tenantId,
      table.scope,
      table.sortOrder
    ),
  ]
);
