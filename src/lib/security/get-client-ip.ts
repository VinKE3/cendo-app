import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const headerStore = await headers();

  // 1. Cloudflare (inyectado en el borde, no falsificable por cliente)
  const cfIp = headerStore.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // 2. Vercel Edge
  const vercelIp = headerStore.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  // 3. Proxy inverso confiable (Nginx / Traefik)
  const realIp = headerStore.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 4. Fallback: última IP agregada por el proxy confiable en x-forwarded-for
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }

  return "127.0.0.1";
}
