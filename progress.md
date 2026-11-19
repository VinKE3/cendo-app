# Estado del Proyecto: Fase 3 (Consultas Médicas & Catálogos Clínicos Completados)

## 1. Objetivo General
Plataforma médica oficial de producción (**cendo-app**) para el Centro de Endometriosis y Ginecología Especializada **CENDO** (Sede Miraflores, Lima - Perú), liderado por el Director Médico **Dr. Patrick José Jacinto Gomero** (CMP 61693 | RNE 38657).

## 2. Decisiones Técnicas Clave
- **Framework:** Next.js 16.4.6 (App Router) + React 19 + TypeScript estricto + Tailwind CSS v4 (`@theme inline` en `globals.css`) + shadcn/ui + Sonner.
- **Base de Datos:** PostgreSQL en Supabase con Drizzle ORM (`prepare: false` para Transaction Pooler) y aislamiento multi-sede (`tenant_id`).
- **Autenticación y Seguridad (Opción A - Zero Trust):** Hash PBKDF2-SHA256 en `profiles` (`src/lib/security/password.ts`), cookie HttpOnly `session_token` firmada con HMAC-SHA256 (`crypto.ts`), `guardedAction` / `handleGuardedApi`, Zod `.strict()`, Rate Limiting y auditoría inmutable (`clinical_audit_logs`).
- **Storage Clínico:** Buckets privados en Supabase Storage (`clinical-images`, `lab-reports`) accesibles únicamente vía servidor (`src/lib/supabase/storage.ts`).
- **Estética y Flujo Clínico:** Estética Linear/Supabase con tokens semánticos CENDO + `BrandLogo` vectorial oficial extraído del membrete real del Dr. Patrick. Colposcopías y Ecografías centradas en la ficha del paciente (`/pacientes/[id]`) sin páginas huérfanas en el Sidebar.

## 3. Estado de Módulos
- [x] Inicialización del entorno, Tailwind v4, `Lora` + `Inter` + `JetBrains Mono` y tokens semánticos institucionales CENDO
- [x] Suite de componentes shadcn instalada (`Dialog`, `Sheet`, `Command`, `Table`, `Sonner`, etc.)
- [x] Motor de seguridad Zero Trust (`crypto.ts`, `action-guard.ts`, `api-guard.ts`, `server-session.ts`, `proxy.ts`, `password.ts`)
- [x] Esquemas completos Drizzle ORM (`src/db/schema/`, 21 tablas incluyendo `catalog_categories`, `relations.ts` y `clinical_audit_logs`) + migraciones SQL versionadas con RLS
- [x] Seed inicial (`src/db/seed.ts`): Sede Miraflores, 3 médicos, 5 plantillas lab, 10 tarifas, 5 fármacos y categorías dinámicas
- [x] Módulo Auth (`src/features/auth/`, `/login` split-screen con `ForgotPasswordDialog`, `rememberMe`, `?redirect=`)
- [x] Fase 1: Shell Clínico `(dashboard)` (`DashboardSidebar` + `Sheet` móvil, `DashboardHeader` + `ThemeToggle`, buscador global `Ctrl + K`)
- [x] Fase 1: Dashboard Bento Grid asimétrico conectado a PostgreSQL real
- [x] Fase 1: Catálogos Maestros (`tarifario`, `vademecum`, `catalog-categories` editable, `usuarios` RBAC admin, `cie-10`) con API routes segregadas por HTTP
- [x] Componentes Transversales CENDO: `TablePagination` + `usePagination` (`[10, 15, 25, 50]`, elipsis, reset automático al filtrar) integrados en Tarifario, Vademécum, CIE-10 y Usuarios; `CendoCoverPage`, `CendoFooterWave`, `CoverPageSwitch` y utilidades PDF/A4 en `src/lib/pdfGenerator.ts` (`printHtmlElement` con `page-break-after: always` y fusión `pdf-lib`)
- [x] Fase 2: Directorio de Pacientes en Tabla Densa (`/pacientes`), Ficha Clínica Unificada (`/pacientes/[id]`) y Antecedentes Gineco-Obstétricos (`patient_backgrounds`), validado end-to-end contra PostgreSQL con 3 pacientes de prueba activos
- [x] Fase 3 (Parte 1): Agenda Médica (`/agenda`) en Tabla Densa con motor anti-cruces en PostgreSQL, Tipos de Atención dinámicos en `catalog_categories` (`ManageCategoriesModal`), registro rápido atómico de paciente, WhatsApp + Google/Apple Calendar (`.ics`), flujo `"Atender y registrar consulta"` hacia `/pacientes/[id]` y 3 citas activas verificadas end-to-end
- [x] Fase 3 (Parte 2 - Consultas): Consultas Médicas Estructuradas (`consultas`, `/api/consultas`, `TabConsultas`, `ConsultationModal`, `ConsultationPrintView` A4 CENDO + WhatsApp), Motivos de Consulta dinámicos editables en cascada (`consultation_reason`), `Cie10Autocomplete` reutilizable, cálculo de IMC y validación fisiológica en servidor, y creación atómica opcional de cita `ATENDIDA` + receta + orden de laboratorio; 3 consultas de prueba verificadas end-to-end (`N80.3`, `Z34.0`, `N87.0`)
- [ ] Fase 3 (Parte 2 - Pendiente): Tabs dedicados de `recetas`, `laboratorio` y `cotizaciones` dentro de `/pacientes/[id]`
- [ ] Fase 4: Alta Especialidad dentro de la ficha (`colposcopia`, `ecografias`, `procedimientos`, `prenatal` y unión de estudios en 1 PDF)
- [ ] Fase 5: Documentos externos, Impresión A4 oficial CENDO, WhatsApp y Excel clínico (59 cols)

## 4. Tarea Actual
- Siguiente paso en **Fase 3 (Parte 2)**: implementar tabs dedicados de `recetas`, `laboratorio` y `cotizaciones` dentro de `/pacientes/[id]`.

## 5. Bloqueos / Notas
- Nota de despliegue: Si el proyecto escala en entorno Serverless multi-instancia (Vercel), migrar `rate-limit.ts` a `@upstash/ratelimit`.
