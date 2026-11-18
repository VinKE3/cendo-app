# Estado del Proyecto: En Planificación

## 1. Objetivo General
Definir el propósito central del sistema.

## 2. Decisiones Técnicas Clave
- Framework: Next.js (App Router) + TypeScript estricto + Tailwind CSS v4.
- Base de Datos: PostgreSQL con Drizzle ORM (`prepare: false` para Supabase Pooler).
- UI: Tokens semánticos centralizados (`globals.css` `@theme inline`) + shadcn/ui + Sonner.
- Seguridad: Web Crypto API HMAC (Edge compatible), sesión firmada con rol embebido, Anti-IP Spoofing, Zero Trust RBAC.
- Estética: Inspirada en Linear / Supabase (Bento Grids asimétricos, tablas densas, sin clichés).

## 3. Estado de Módulos
- [x] Inicialización del entorno, Tailwind v4 y tokens semánticos
- [x] Suite de componentes shadcn instalada
- [x] Motor de seguridad Edge-compatible inyectado (`crypto.ts`, `action-guard.ts`, `middleware.ts`)
- [ ] Configurar credenciales reales en `.env.local`
- [ ] Definir esquemas de datos en `src/db/schema/`
- [ ] Implementar primer feature en `src/features/`

## 4. Tarea Actual
- Configurar `DATABASE_URL` y `AUTH_SECRET` en `.env.local` y crear el primer esquema en `src/db/schema/`.

## 5. Bloqueos / Notas
- Nota de despliegue: Si el proyecto escala en entorno Serverless multi-instancia (Vercel), migrar `rate-limit.ts` a `@upstash/ratelimit`.
