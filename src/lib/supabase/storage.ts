import { env } from "@/env";

export type CendoStorageBucket = "clinical-images" | "lab-reports";

function getStorageConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "Supabase Storage no configurado: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY."
    );
  }
  return {
    baseUrl: env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""),
    secretKey: env.SUPABASE_SECRET_KEY,
  };
}

function buildAuthHeaders(secretKey: string, extra?: Record<string, string>) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    ...extra,
  };
}

/**
 * Crea un bucket privado en Supabase Storage si aún no existe (solo servidor).
 */
export async function ensurePrivateBucket(bucket: CendoStorageBucket): Promise<void> {
  const { baseUrl, secretKey } = getStorageConfig();

  const checkRes = await fetch(`${baseUrl}/storage/v1/bucket/${bucket}`, {
    method: "GET",
    headers: buildAuthHeaders(secretKey),
    cache: "no-store",
  });

  if (checkRes.ok) return;

  const createRes = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: buildAuthHeaders(secretKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
    }),
  });

  if (!createRes.ok && createRes.status !== 409) {
    const errText = await createRes.text();
    throw new Error(`Error al inicializar bucket ${bucket}: ${errText}`);
  }
}

/**
 * Sube un archivo binario a un bucket privado de Supabase Storage y retorna su ruta interna.
 */
export async function uploadPrivateStorageObject(params: {
  bucket: CendoStorageBucket;
  path: string;
  body: ArrayBuffer | Uint8Array | Blob;
  contentType: string;
}): Promise<{ storagePath: string }> {
  const { baseUrl, secretKey } = getStorageConfig();
  await ensurePrivateBucket(params.bucket);

  const normalizedPath = params.path.replace(/^\/+/, "");
  const payload: BodyInit =
    params.body instanceof Uint8Array
      ? new Blob([params.body as Uint8Array<ArrayBuffer>], { type: params.contentType })
      : params.body instanceof ArrayBuffer
        ? new Blob([params.body], { type: params.contentType })
        : params.body;

  const res = await fetch(`${baseUrl}/storage/v1/object/${params.bucket}/${normalizedPath}`, {
    method: "POST",
    headers: buildAuthHeaders(secretKey, {
      "Content-Type": params.contentType,
      "x-upsert": "true",
    }),
    body: payload,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error subiendo archivo a ${params.bucket}: ${errText}`);
  }

  return { storagePath: normalizedPath };
}

/**
 * Genera una URL firmada temporal (solo servidor) para previsualización o descarga segura.
 */
export async function createSignedStorageUrl(params: {
  bucket: CendoStorageBucket;
  path: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { baseUrl, secretKey } = getStorageConfig();
  const normalizedPath = params.path.replace(/^\/+/, "");
  const expiresIn = params.expiresInSeconds ?? 300;

  const res = await fetch(
    `${baseUrl}/storage/v1/object/sign/${params.bucket}/${normalizedPath}`,
    {
      method: "POST",
      headers: buildAuthHeaders(secretKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`No se pudo firmar URL de descarga: ${errText}`);
  }

  const data = (await res.json()) as { signedURL?: string };
  if (!data.signedURL) {
    throw new Error("Respuesta inválida de Supabase Storage al firmar URL.");
  }

  return data.signedURL.startsWith("http")
    ? data.signedURL
    : `${baseUrl}/storage/v1${data.signedURL}`;
}

/**
 * Descarga un objeto binario desde un bucket privado de Supabase Storage (solo servidor).
 */
export async function downloadPrivateStorageObject(params: {
  bucket: CendoStorageBucket;
  path: string;
}): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const { baseUrl, secretKey } = getStorageConfig();
  const normalizedPath = params.path.replace(/^\/+/, "");

  const res = await fetch(`${baseUrl}/storage/v1/object/${params.bucket}/${normalizedPath}`, {
    method: "GET",
    headers: buildAuthHeaders(secretKey),
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (res.status === 400) {
    const errText = await res.text();
    if (errText.toLowerCase().includes("not found") || errText.toLowerCase().includes("object")) {
      return null;
    }
    throw new Error(`Error descargando archivo en ${params.bucket}: ${errText}`);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error descargando archivo en ${params.bucket}: ${errText}`);
  }

  return {
    buffer: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") || "image/png",
  };
}

/**
 * Elimina un objeto privado de Supabase Storage.
 */
export async function deletePrivateStorageObject(params: {
  bucket: CendoStorageBucket;
  path: string;
}): Promise<void> {
  const { baseUrl, secretKey } = getStorageConfig();
  const normalizedPath = params.path.replace(/^\/+/, "");

  const res = await fetch(`${baseUrl}/storage/v1/object/${params.bucket}`, {
    method: "DELETE",
    headers: buildAuthHeaders(secretKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [normalizedPath] }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error eliminando archivo en ${params.bucket}: ${errText}`);
  }
}
