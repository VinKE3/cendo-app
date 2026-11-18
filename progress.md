# Estado del Proyecto: Fase 1 Completada → Listo para Fase 2

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
- [ ] Fase 2: Directorio de Pacientes (`/pacientes`, `/pacientes/[id]`) y Antecedentes Gineco-Obstétricos
- [ ] Fase 3: Acto Médico Transaccional (`agenda`, `consultas`, `recetas`, `laboratorio`, `cotizaciones`)
- [ ] Fase 4: Alta Especialidad dentro de la ficha (`colposcopia`, `ecografias`, `procedimientos`, `prenatal` y unión de estudios en 1 PDF)
- [ ] Fase 5: Documentos externos, Impresión A4 oficial CENDO, WhatsApp y Excel clínico (59 cols)

## 4. Tarea Actual
- Iniciar **Fase 2**: Directorio de Pacientes (`/pacientes`) + Ficha Clínica Unificada (`/pacientes/[id]`) + Antecedentes Gineco-Obstétricos (`patient_backgrounds`).

## 5. Bloqueos / Notas
- Nota de despliegue: Si el proyecto escala en entorno Serverless multi-instancia (Vercel), migrar `rate-limit.ts` a `@upstash/ratelimit`.
