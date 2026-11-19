export interface CalendarClinicInfo {
  clinicAddress?: string | null;
  phone?: string | null;
}

export interface CalendarExportAppointment {
  id?: string;
  patientName: string;
  patientDocument?: string;
  patientPhone?: string;
  doctorName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  durationMinutes?: number;
  appointmentType: string;
  reason: string;
  notes?: string | null;
}

const DEFAULT_CLINIC_ADDRESS =
  "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima";
const DEFAULT_CLINIC_PHONE = "985 945 697";

function normalizeTimeHHmm(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{2}):(\d{2})/);
  if (!match) return "09:00";
  return `${match[1]}:${match[2]}`;
}

/**
 * Formatea fecha YYYY-MM-DD y hora HH:mm en YYYYMMDDTHHmmSS sin desfase de zona horaria.
 */
function formatToCompactDateTime(
  dateStr: string,
  timeStr: string,
  addMinutes = 0
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = normalizeTimeHHmm(timeStr).split(":").map(Number);

  const utcDate = new Date(
    Date.UTC(year, (month || 1) - 1, day || 1, hours || 0, (minutes || 0) + addMinutes, 0)
  );

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(
    utcDate.getUTCDate()
  )}T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}00`;
}

export function generateGoogleCalendarUrl(
  appointment: CalendarExportAppointment,
  clinicInfo?: CalendarClinicInfo | null,
  options?: { compact?: boolean }
): string {
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const duration = appointment.durationMinutes || 30;

  const startIso = formatToCompactDateTime(
    appointment.appointmentDate,
    appointment.appointmentTime,
    0
  );
  const endIso = formatToCompactDateTime(
    appointment.appointmentDate,
    appointment.appointmentTime,
    duration
  );

  const title = encodeURIComponent(`Cita CENDO: ${appointment.patientName}`);

  const detailsText = options?.compact
    ? `Cita médica con ${appointment.doctorName} en CENDO. Central: ${phone}`
    : [
        `🩺 CITA MÉDICA GINECOLÓGICA - CENDO`,
        ``,
        `👤 Paciente: ${appointment.patientName}`,
        appointment.patientDocument ? `🆔 Doc: ${appointment.patientDocument}` : "",
        appointment.patientPhone ? `📞 Celular: ${appointment.patientPhone}` : "",
        `👨‍⚕️ Médico Tratante: ${appointment.doctorName}`,
        `📋 Motivo: ${appointment.reason}`,
        appointment.notes ? `📝 Notas: ${appointment.notes}` : "",
        ``,
        `🏥 Sede: ${address}`,
        `📞 Central de Citas: ${phone}`,
        ``,
        `💡 Llegar con 10 minutos de anticipación y portar documento de identidad.`,
      ]
        .filter(Boolean)
        .join("\n");

  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(address);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}&ctz=America/Lima`;
}

export function generateIcsContent(
  appointment: CalendarExportAppointment,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const duration = appointment.durationMinutes || 30;

  const startCompact = formatToCompactDateTime(
    appointment.appointmentDate,
    appointment.appointmentTime,
    0
  );
  const endCompact = formatToCompactDateTime(
    appointment.appointmentDate,
    appointment.appointmentTime,
    duration
  );

  const nowIso = new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
  const cleanType = appointment.appointmentType.replace(/_/g, " ");
  const summary = `Cita CENDO: ${appointment.patientName} (${cleanType})`;
  const description = [
    `Paciente: ${appointment.patientName}`,
    appointment.patientDocument ? `Doc: ${appointment.patientDocument}` : "",
    appointment.patientPhone ? `Tel: ${appointment.patientPhone}` : "",
    `Médico: ${appointment.doctorName}`,
    `Motivo: ${appointment.reason}`,
    appointment.notes ? `Notas: ${appointment.notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const location = address.replace(/,/g, "\\,");
  const uid = appointment.id || `temp-${Date.now()}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CENDO//Centro de Endometriosis y Ginecologia//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:America/Lima",
    "X-LIC-LOCATION:America/Lima",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:PET",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:cendo-appt-${uid}@cendo.pe`,
    `DTSTAMP:${nowIso}Z`,
    `DTSTART;TZID=America/Lima:${startCompact}`,
    `DTEND;TZID=America/Lima:${endCompact}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Recordatorio de Cita Médica CENDO con ${appointment.patientName}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsForAppleCalendar(
  appointment: CalendarExportAppointment,
  clinicInfo?: CalendarClinicInfo | null
): void {
  const ics = generateIcsContent(appointment, clinicInfo);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);

  const cleanName = appointment.patientName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const fileName = `Cita_CENDO_${cleanName || "Paciente"}_${appointment.appointmentDate}.ics`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
