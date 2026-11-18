import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignedPayload, type SessionPayload } from "@/lib/security/crypto";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/api/public"];
const ADMIN_ROUTES = ["/admin", "/api/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp)$/)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("session_token")?.value;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  const session = sessionCookie
    ? await verifySignedPayload<SessionPayload>(sessionCookie)
    : { valid: false, data: undefined };

  // 1. Bloquear acceso sin sesión válida a rutas privadas
  if (!session.valid && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (sessionCookie) response.cookies.delete("session_token");
    return response;
  }

  // 2. Redirigir usuarios autenticados fuera de páginas públicas de auth
  if (session.valid && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Verificar rol extraído del payload firmado criptográficamente
  if (isAdminRoute && session.data?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado: permisos insuficientes" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
