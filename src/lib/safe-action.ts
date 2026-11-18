export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

export async function safeAction<T>(
  action: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado al procesar la solicitud.";
    console.error("[Safe Action Error]:", err);
    return { success: false, error: message };
  }
}
