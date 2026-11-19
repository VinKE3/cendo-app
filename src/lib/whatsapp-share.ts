import {
  generateGoogleCalendarUrl,
  type CalendarClinicInfo,
  type CalendarExportAppointment,
} from "@/lib/calendar-export";
import { formatPeruDateDisplay } from "@/lib/utils";

const DEFAULT_CLINIC_ADDRESS =
  "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima";
const DEFAULT_CLINIC_PHONE = "985 945 697";

const APPOINTMENT_TYPE_TEXT: Record<string, string> = {
  CONSULTA_PRIMERA_VEZ: "Consulta Ginecológica (Primera Vez)",
  CONTROL_GINECOLOGICO: "Control Ginecológico Especializado",
  CHEQUEO_INTEGRAL: "Chequeo Preventivo Integral CENDO",
  CONTROL_PRENATAL: "Control Prenatal (MINSA/CLAP)",
  COLPOSCOPIA: "Colposcopía Especializada Digital",
  ECOGRAFIA: "Ecografía Especializada",
  PROCEDIMIENTO_MENOR: "Procedimiento Menor en Consultorio",
};

/**
 * Normaliza un número telefónico peruano para enlaces https://wa.me/.
 */
export function cleanPhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9 && cleaned.startsWith("9")) {
    return `51${cleaned}`;
  }
  return cleaned;
}

export function generateAppointmentReminderWhatsAppUrl(
  appt: CalendarExportAppointment,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(appt.patientPhone);
  const formattedDate = formatPeruDateDisplay(appt.appointmentDate);
  const timeText = appt.appointmentTime.slice(0, 5);
  const duration = appt.durationMinutes || 30;
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;

  const reasonLabel =
    appt.reason?.trim() ||
    APPOINTMENT_TYPE_TEXT[appt.appointmentType] ||
    appt.appointmentType ||
    "Consulta Ginecológica Especializada";

  const shortCalendarUrl = generateGoogleCalendarUrl(appt, clinicInfo, {
    compact: true,
  });
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  const message = [
    `👋 *Recordatorio de Cita Médica • CENDO*`,
    ``,
    `Estimada *${appt.patientName}*, le recordamos su próxima cita con *${appt.doctorName}*:`,
    ``,
    `🗓 *Fecha:* *${formattedDate}*`,
    `⏰ *Hora:* *${timeText}* (Duración aprox: ${duration} min)`,
    `🩺 *Motivo:* ${reasonLabel}`,
    ``,
    `📍 *Dirección de Atención:*`,
    `${address}`,
    `🗺️ *Ver ubicación en Google Maps:*`,
    mapsUrl,
    ``,
    `📅 *Añadir a Google Calendar:*`,
    shortCalendarUrl,
    ``,
    `💡 *Recomendaciones para su atención:*`,
    `• Llegar con 10 minutos de anticipación.`,
    `• Portar documento de identidad físico y exámenes previos si dispone de ellos.`,
    `• Si no puede asistir, por favor avisar con 24h de anticipación.`,
    ``,
    `📞 *Consultas o reprogramación:* ${phone}`,
    ``,
    `_¡Le esperamos en CENDO para brindarle una atención médica de excelencia!_`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface ConsultationWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  consultationDate: string;
  doctorName: string;
  doctorCmp?: string | null;
  diagnosis: string;
  cie10Code?: string | null;
  treatmentPlan: string;
  auxiliaryExams?: string | null;
  prescriptionNotes?: string | null;
  nextAppointmentDate?: string | null;
}

export function generateConsultationWhatsAppUrl(
  consultation: ConsultationWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(consultation.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(consultation.consultationDate);
  const nextApptFormatted = consultation.nextAppointmentDate
    ? formatPeruDateDisplay(consultation.nextAppointmentDate)
    : null;

  const message = [
    `🩺 *Resumen de Consulta Ginecológica • CENDO*`,
    ``,
    `Estimada *${consultation.patientName}*, le compartimos el resumen de su atención médica:`,
    ``,
    `🗓 *Fecha de atención:* ${formattedDate}`,
    `👩‍⚕️ *Médico tratante:* ${consultation.doctorName}${
      consultation.doctorCmp ? ` (CMP ${consultation.doctorCmp})` : ""
    }`,
    `📋 *Diagnóstico:* ${consultation.diagnosis}${
      consultation.cie10Code ? ` [CIE-10: ${consultation.cie10Code}]` : ""
    }`,
    ``,
    `📌 *Plan / Indicaciones:*`,
    consultation.treatmentPlan.trim(),
    consultation.prescriptionNotes?.trim()
      ? `\n💊 *Medicación (Rp/):*\n${consultation.prescriptionNotes.trim()}`
      : "",
    consultation.auxiliaryExams?.trim()
      ? `\n🧪 *Exámenes Auxiliares:*\n${consultation.auxiliaryExams.trim()}`
      : "",
    nextApptFormatted ? `\n📅 *Próximo control sugerido:* ${nextApptFormatted}` : "",
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Central de Citas:* ${phone}`,
    ``,
    `_Ante cualquier síntoma de alarma comunicarse con nuestra central médica._`,
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
