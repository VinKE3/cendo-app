import { getDefaultInstructionsForTemplateType } from "@/features/laboratorio/laboratorio.schema";
import {
  type CalendarClinicInfo,
  type CalendarExportAppointment,
} from "@/lib/calendar-export";
import { formatCurrency, formatPeruDateDisplay } from "@/lib/utils";

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

  const customShortMaps = clinicInfo?.googleMapsUrl?.trim();
  const mapsUrl =
    customShortMaps && /^https?:\/\//i.test(customShortMaps)
      ? customShortMaps
      : `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  const message = [
    `👋 *Recordatorio de Cita Médica • CENDO*`,
    ``,
    `Estimada *${appt.patientName}*, le confirmamos su cita con *${appt.doctorName}*:`,
    ``,
    `🗓 *Fecha:* *${formattedDate}*`,
    `⏰ *Hora:* *${timeText}* (${duration} min)`,
    `🩺 *Motivo:* ${reasonLabel}`,
    ``,
    `📍 *Dirección:* ${address}`,
    `🗺️ *Ubicación Maps:* ${mapsUrl}`,
    ``,
    `💡 Por favor llegar 10 minutos antes con su documento de identidad.`,
    `📞 *Consultas:* ${phone}`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface TariffWhatsAppItem {
  code: string;
  name: string;
  category: string;
  price: number;
  description?: string | null;
}

export function generateTariffWhatsAppUrl(
  items: TariffWhatsAppItem[],
  clinicInfo?: CalendarClinicInfo | null,
  patientPhone?: string | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const customShortMaps = clinicInfo?.googleMapsUrl?.trim();
  const mapsUrl =
    customShortMaps && /^https?:\/\//i.test(customShortMaps)
      ? customShortMaps
      : `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  const lines = items.map(
    (item, idx) =>
      `• *${idx + 1}. ${item.name}* [${item.code}]: *${formatCurrency(item.price)}*${
        item.description?.trim() ? `\n  _${item.description.trim()}_` : ""
      }`
  );

  const totalReferencial = items.reduce((acc, item) => acc + Number(item.price || 0), 0);

  const message = [
    `🏥 *Tarifario de Atención • CENDO Miraflores*`,
    ``,
    `Compartimos la información de tarifas solicitada:`,
    ``,
    ...lines,
    items.length > 1
      ? `\n💰 *Total referencial (${items.length} prestaciones):* *${formatCurrency(totalReferencial)}*`
      : "",
    ``,
    `📍 *Dirección:* ${address}`,
    `🗺️ *Ubicación:* ${mapsUrl}`,
    `📞 *Central de Citas:* ${phone}`,
    ``,
    `_Tarifas sujetas a vigencia del tarifario institucional CENDO._`,
  ]
    .filter(Boolean)
    .join("\n");

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

export interface PrescriptionWhatsAppItem {
  medicationName: string;
  presentation: string;
  route: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: string;
}

export interface PrescriptionWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  prescriptionDate: string;
  doctorName: string;
  doctorCmp?: string | null;
  diagnosis: string;
  cie10Code?: string | null;
  items: PrescriptionWhatsAppItem[];
  generalIndications?: string | null;
  nextAppointmentDate?: string | null;
}

export function generatePrescriptionWhatsAppUrl(
  prescription: PrescriptionWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(prescription.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(prescription.prescriptionDate);
  const nextApptFormatted = prescription.nextAppointmentDate
    ? formatPeruDateDisplay(prescription.nextAppointmentDate)
    : null;

  const itemsText = prescription.items
    .map((item, idx) =>
      [
        `💊 *${idx + 1}. ${item.medicationName}* (${item.presentation})`,
        `   • *Dosis:* ${item.dosage} — ${item.route}`,
        `   • *Frecuencia:* ${item.frequency}`,
        `   • *Duración:* ${item.duration}`,
        item.instructions ? `   • *Indicación:* ${item.instructions}` : "",
        item.quantity ? `   • *Cantidad:* ${item.quantity}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const message = [
    `💊 *Receta Médica Oficial • CENDO*`,
    ``,
    `Estimada *${prescription.patientName}*, le enviamos su prescripción médica:`,
    ``,
    `🗓 *Fecha:* ${formattedDate}`,
    `👩‍⚕️ *Médico:* ${prescription.doctorName}${
      prescription.doctorCmp ? ` (CMP ${prescription.doctorCmp})` : ""
    }`,
    `🩺 *Diagnóstico:* ${prescription.diagnosis}${
      prescription.cie10Code ? ` [CIE-10: ${prescription.cie10Code}]` : ""
    }`,
    ``,
    itemsText,
    prescription.generalIndications?.trim()
      ? `\n📌 *Indicaciones Generales:*\n${prescription.generalIndications.trim()}`
      : "",
    nextApptFormatted ? `\n📅 *Próximo control:* ${nextApptFormatted}` : "",
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Central de Citas:* ${phone}`,
    ``,
    `_Conserve esta receta para su dispensación y seguimiento médico._`,
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface LabOrderWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  orderDate: string;
  doctorName: string;
  doctorCmp?: string | null;
  diagnosis: string;
  cie10Code?: string | null;
  urgency: string;
  templateType: string;
  items: Array<{ testName: string; sampleType?: string }>;
  customTests?: string | null;
  patientInstructions?: string | null;
}

export function generateLabOrderWhatsAppUrl(
  order: LabOrderWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(order.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(order.orderDate);
  const instructions =
    order.patientInstructions?.trim() ||
    getDefaultInstructionsForTemplateType(order.templateType);

  const testsText = [
    ...order.items.map(
      (it, idx) =>
        `🔹 *${idx + 1}. ${it.testName}*${it.sampleType ? ` (${it.sampleType})` : ""}`
    ),
    order.customTests?.trim() ? `🔹 *Adicionales:* ${order.customTests.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const headerTitle =
    order.templateType === "GENERAL"
      ? "Orden de Laboratorio Clínico"
      : "Remisión a Laboratorio / Patología";

  const message = [
    `🧪 *${headerTitle} • CENDO*`,
    ``,
    `Estimada *${order.patientName}*, le compartimos el detalle de su orden médica:`,
    ``,
    `🗓 *Fecha:* ${formattedDate}`,
    `👩‍⚕️ *Médico:* ${order.doctorName}${order.doctorCmp ? ` (CMP ${order.doctorCmp})` : ""}`,
    `⚡ *Prioridad:* ${order.urgency}`,
    `🩺 *Indicación:* ${order.diagnosis}${order.cie10Code ? ` [CIE-10: ${order.cie10Code}]` : ""}`,
    ``,
    `*Estudios solicitados:*`,
    testsText,
    ``,
    `📌 *Indicaciones:*`,
    instructions,
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Central de Citas:* ${phone}`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface QuoteWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  quoteDate: string;
  validUntilDate: string;
  validityDays: number;
  doctorName: string;
  items: Array<{
    name: string;
    regularPrice: number;
    discountPercent?: number;
    finalPrice: number;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentTerms?: string | null;
}

export function generateQuoteWhatsAppUrl(
  quote: QuoteWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(quote.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(quote.quoteDate);
  const validUntilFormatted = formatPeruDateDisplay(quote.validUntilDate);

  const itemsText = quote.items
    .map(
      (it, idx) =>
        `• *${idx + 1}. ${it.name}*: *${formatCurrency(it.finalPrice)}*${
          it.discountPercent && it.discountPercent > 0
            ? ` (_Tarifa reg. ${formatCurrency(it.regularPrice)} • ${it.discountPercent}% desc._)`
            : ""
        }`
    )
    .join("\n");

  const message = [
    `💼 *Presupuesto Médico Oficial • CENDO*`,
    ``,
    `Estimada *${quote.patientName}*, le enviamos la cotización detallada para su atención:`,
    ``,
    `🗓 *Fecha de emisión:* ${formattedDate}`,
    `⏳ *Válido hasta:* ${validUntilFormatted} (${quote.validityDays} días)`,
    `👩‍⚕️ *Especialista:* ${quote.doctorName}`,
    ``,
    itemsText,
    ``,
    quote.discountTotal > 0
      ? `Subtotal: ${formatCurrency(quote.subtotal)}\nDescuento CENDO: - ${formatCurrency(quote.discountTotal)}\n💰 *TOTAL A PAGAR: ${formatCurrency(quote.total)}*`
      : `💰 *TOTAL A PAGAR: ${formatCurrency(quote.total)}*`,
    quote.paymentTerms?.trim()
      ? `\n💳 *Condiciones:* ${quote.paymentTerms.trim()}`
      : "",
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Consultas y programación:* ${phone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface UltrasoundWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  reportDate: string;
  doctorName: string;
  doctorCmp?: string | null;
  ultrasoundTypeLabel: string;
  indication: string;
  conclusion: string;
  recommendations?: string | null;
  biradsCategory?: string | null;
}

export function generateUltrasoundWhatsAppUrl(
  report: UltrasoundWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(report.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(report.reportDate);

  const message = [
    `🩺 *Informe de Ecografía Especializada • CENDO*`,
    ``,
    `Estimada *${report.patientName}*, compartimos el resumen de su estudio ecográfico:`,
    ``,
    `🗓 *Fecha:* ${formattedDate}`,
    `👩‍⚕️ *Especialista:* ${report.doctorName}${report.doctorCmp ? ` (CMP ${report.doctorCmp})` : ""}`,
    `🔬 *Estudio:* ${report.ultrasoundTypeLabel}`,
    `📋 *Indicación:* ${report.indication}`,
    report.biradsCategory ? `🏷 *Categoría:* *${report.biradsCategory}*` : "",
    ``,
    `*Conclusión Diagnóstica:*`,
    report.conclusion,
    report.recommendations?.trim()
      ? `\n📌 *Sugerencias:* ${report.recommendations.trim()}`
      : "",
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Central de Citas:* ${phone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface ColposcopyWhatsAppPayload {
  patientName: string;
  patientPhone?: string | null;
  reportDate: string;
  doctorName: string;
  doctorCmp?: string | null;
  classificationLabel: string;
  transformationZoneType: string;
  schillerTest: string;
  cervicalBiopsyTaken: boolean;
  biopsyClockHours: string[];
  diagnosis: string;
  cie10Code: string;
  planRecommendations: string;
}

export function generateColposcopyWhatsAppUrl(
  report: ColposcopyWhatsAppPayload,
  clinicInfo?: CalendarClinicInfo | null
): string {
  const targetPhone = cleanPhoneForWhatsApp(report.patientPhone);
  const address = clinicInfo?.clinicAddress?.trim() || DEFAULT_CLINIC_ADDRESS;
  const phone = clinicInfo?.phone?.trim() || DEFAULT_CLINIC_PHONE;
  const formattedDate = formatPeruDateDisplay(report.reportDate);

  const biopsyLine = report.cervicalBiopsyTaken
    ? report.biopsyClockHours.length > 0
      ? `Sí (Horas: ${report.biopsyClockHours.map((h) => `${h}h`).join(", ")})`
      : "Sí (Biopsia dirigida)"
    : "No requerida";

  const message = [
    `🔬 *Informe de Colposcopía Digital IFCPC • CENDO*`,
    ``,
    `Estimada *${report.patientName}*, compartimos el resumen de su evaluación colposcópica:`,
    ``,
    `🗓 *Fecha:* ${formattedDate}`,
    `👩‍⚕️ *Especialista:* ${report.doctorName}${report.doctorCmp ? ` (CMP ${report.doctorCmp})` : ""}`,
    `🏷 *Clasificación:* ${report.classificationLabel}`,
    `🔎 *Zona Transformación:* ${report.transformationZoneType} • *Schiller:* ${report.schillerTest}`,
    `🧪 *Biopsia Cervical:* ${biopsyLine}`,
    ``,
    `🩺 *Diagnóstico:* ${report.diagnosis}${report.cie10Code ? ` [CIE-10: ${report.cie10Code}]` : ""}`,
    ``,
    `📌 *Indicaciones y Seguimiento:*`,
    report.planRecommendations,
    ``,
    `🏥 *Sede:* ${address}`,
    `📞 *Central de Citas:* ${phone}`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
