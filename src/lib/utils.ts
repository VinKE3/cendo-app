import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retorna la fecha actual en Perú (America/Lima, UTC-5) en formato YYYY-MM-DD.
 */
export function getPeruDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Retorna la hora actual en Perú (America/Lima) en formato HH:mm (24 horas).
 */
export function getPeruTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Desplaza una fecha YYYY-MM-DD en días dentro de la zona horaria de Perú.
 */
export function shiftPeruDate(dateStr: string, days: number): string {
  if (!dateStr) return getPeruDateString();
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formatea una fecha YYYY-MM-DD en texto formal español (ej. "miércoles, 18 de noviembre de 2026").
 */
export function formatPeruDateText(dateStr: string, includeDayOfWeek = true): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Lima",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (includeDayOfWeek) {
    options.weekday = "long";
  }
  return new Intl.DateTimeFormat("es-PE", options).format(d);
}

/**
 * Convierte una fecha YYYY-MM-DD a formato peruano DD/MM/AAAA.
 */
export function formatPeruDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

/**
 * Formatea valores numéricos a moneda Soles (S/ #,##0.00).
 */
export function formatCurrency(amount: number | string): string {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

/**
 * Calcula la edad exacta en años cumplidos evaluado en America/Lima.
 */
export function calculateAge(birthDateString?: string | null): number {
  if (!birthDateString) return 0;
  const parts = birthDateString.split("-");
  if (parts.length < 3) return 0;
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);
  if (Number.isNaN(birthYear) || Number.isNaN(birthMonth) || Number.isNaN(birthDay)) {
    return 0;
  }

  const todayPeruStr = getPeruDateString();
  const [todayYear, todayMonth, todayDay] = todayPeruStr.split("-").map(Number);

  let age = todayYear - birthYear;
  const monthDiff = todayMonth - 1 - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
    age--;
  }
  return age > 0 ? age : 0;
}
