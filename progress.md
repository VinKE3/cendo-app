# Estado del Proyecto: Fase 0 Completada → Listo para Fase 1

## 1. Objetivo General
Plataforma médica oficial de producción (**cendo-app**) para el Centro de Endometriosis y Ginecología Especializada **CENDO** (Sede Miraflores, Lima - Perú), liderado por el Director Médico **Dr. Patrick José Jacinto Gomero** (CMP 61693 | RNE 38657).

## 2. Decisiones Técnicas Clave
- **Framework:** Next.js 16.4.6 (App Router) + React 19 + TypeScript estricto + Tailwind CSS v4 (`@theme inline` en `globals.css`) + shadcn/ui + Sonner.
- **Base de Datos:** PostgreSQL en Supabase con Drizzle ORM (`prepare: false` para Transaction Pooler) y aislamiento multi-sede (`tenant_id`).
- **Autenticación y Seguridad (Opción A - Zero Trust):** Hash PBKDF2-SHA256 en `profiles` (`src/lib/security/password.ts`), cookie HttpOnly `session_token` firmada con HMAC-SHA256 (`crypto.ts`), `guardedAction`, Zod `.strict()` y Rate Limiting.
- **Storage Clínico:** Buckets privados en Supabase Storage (`clinical-images`, `lab-reports`) accesibles únicamente vía servidor (`src/lib/supabase/storage.ts` con `SUPABASE_SECRET_KEY`).
- **Estética:** Inspirada en Linear / Supabase (Bento Grids asimétricos, tablas densas, `font-mono` para IDs, CMP/RNE, DNI y fechas, tokens semánticos exclusivos).

## 3. Estado de Módulos
- [x] Inicialización del entorno, Tailwind v4 y tokens semánticos institucionales CENDO (`#0A4D68` + Ámbar, modo claro/oscuro con `next-themes`)
- [x] Suite de componentes shadcn instalada
- [x] Motor de seguridad inyectado (`crypto.ts`, `action-guard.ts`, `proxy.ts`, `password.ts`)
- [x] Credenciales `.env.local` y validación `src/env.ts` (PostgreSQL + Supabase Storage)
- [x] Esquemas completos Drizzle ORM en `src/db/schema/` (20 tablas con `relations.ts`, enums, índices B-Tree, `$onUpdate`, `clinical_audit_logs` y trazabilidad `appointment_id`/`consultation_id`)
- [x] Migraciones SQL versionadas (`npm run db:generate` + `npm run db:migrate`) con RLS activo en las 20 tablas de `public`
- [x] Seed inicial (`src/db/seed.ts`): Sede Miraflores, 3 médicos oficiales y 5 plantillas de laboratorio
- [x] Módulo Auth (`src/features/auth/`, `/login` split-screen con `BrandLogo`, `ForgotPasswordDialog`, `rememberMe` y `?redirect=`, `/dashboard`, `logoutAction`)
- [ ] Fase 1: Shell Clínico `(dashboard)` + Catálogos Maestros (`usuarios`, `vademecum`, `tarifario`, `CIE-10`)
- [ ] Fase 2: Directorio de Pacientes y Antecedentes Gineco-Obstétricos
- [ ] Fase 3: Acto Médico Transaccional (`agenda`, `consultas`, `recetas`, `laboratorio`, `cotizaciones`)
- [ ] Fase 4: Alta Especialidad (`colposcopia`, `ecografias`, `procedimientos`, `prenatal`, `chequeos`)
- [ ] Fase 5: Documentos, Impresión A4, WhatsApp y Exportación Excel

## 4. Tarea Actual
- Iniciar **Fase 1**: Shell Clínico `(dashboard)` (Sidebar, Header, búsqueda `Ctrl+K`) y migración de los catálogos maestros (`usuarios`, `vademecum`, `tarifario`, `cie10Catalog`).

## 5. Bloqueos / Notas
- Nota de despliegue: Si el proyecto escala en entorno Serverless multi-instancia (Vercel), migrar `rate-limit.ts` a `@upstash/ratelimit`.
