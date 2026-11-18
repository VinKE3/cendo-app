import { relations } from "drizzle-orm";
import { clinicalAuditLogs, clinics, profiles } from "./clinics";
import { labOrderTemplates, medicationsVademecum, proceduresTariff } from "./catalogs";
import { medicalAppointments, patientBackgrounds, patients } from "./patients";
import {
  clinicalCheckups,
  labOrders,
  medicalConsultations,
  medicalPrescriptions,
  procedureQuotes,
} from "./clinical";
import {
  colposcopyReports,
  minorProcedures,
  prenatalCards,
  ultrasoundReports,
} from "./specialty";
import { patientDocuments, wordHistoryDocuments } from "./documents";

export const clinicsRelations = relations(clinics, ({ many }) => ({
  profiles: many(profiles),
  patients: many(patients),
  proceduresTariff: many(proceduresTariff),
  medicationsVademecum: many(medicationsVademecum),
  labOrderTemplates: many(labOrderTemplates),
  auditLogs: many(clinicalAuditLogs),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [profiles.tenantId],
    references: [clinics.id],
  }),
  appointments: many(medicalAppointments),
  consultations: many(medicalConsultations),
  prescriptions: many(medicalPrescriptions),
  labOrders: many(labOrders),
  colposcopyReports: many(colposcopyReports),
  ultrasoundReports: many(ultrasoundReports),
  minorProcedures: many(minorProcedures),
  prenatalCards: many(prenatalCards),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.tenantId],
    references: [clinics.id],
  }),
  background: one(patientBackgrounds, {
    fields: [patients.id],
    references: [patientBackgrounds.patientId],
  }),
  prenatalCard: one(prenatalCards, {
    fields: [patients.id],
    references: [prenatalCards.patientId],
  }),
  appointments: many(medicalAppointments),
  consultations: many(medicalConsultations),
  checkups: many(clinicalCheckups),
  prescriptions: many(medicalPrescriptions),
  labOrders: many(labOrders),
  quotes: many(procedureQuotes),
  colposcopyReports: many(colposcopyReports),
  ultrasoundReports: many(ultrasoundReports),
  minorProcedures: many(minorProcedures),
  documents: many(patientDocuments),
  wordHistories: many(wordHistoryDocuments),
}));

export const patientBackgroundsRelations = relations(patientBackgrounds, ({ one }) => ({
  patient: one(patients, {
    fields: [patientBackgrounds.patientId],
    references: [patients.id],
  }),
}));

export const medicalAppointmentsRelations = relations(medicalAppointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medicalAppointments.patientId],
    references: [patients.id],
  }),
  doctor: one(profiles, {
    fields: [medicalAppointments.doctorId],
    references: [profiles.id],
  }),
  consultations: many(medicalConsultations),
}));

export const medicalConsultationsRelations = relations(
  medicalConsultations,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [medicalConsultations.patientId],
      references: [patients.id],
    }),
    appointment: one(medicalAppointments, {
      fields: [medicalConsultations.appointmentId],
      references: [medicalAppointments.id],
    }),
    doctor: one(profiles, {
      fields: [medicalConsultations.doctorId],
      references: [profiles.id],
    }),
    prescriptions: many(medicalPrescriptions),
    labOrders: many(labOrders),
    quotes: many(procedureQuotes),
    checkups: many(clinicalCheckups),
    colposcopyReports: many(colposcopyReports),
    ultrasoundReports: many(ultrasoundReports),
    minorProcedures: many(minorProcedures),
  })
);

export const clinicalCheckupsRelations = relations(clinicalCheckups, ({ one }) => ({
  patient: one(patients, {
    fields: [clinicalCheckups.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [clinicalCheckups.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const medicalPrescriptionsRelations = relations(medicalPrescriptions, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalPrescriptions.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [medicalPrescriptions.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const labOrdersRelations = relations(labOrders, ({ one }) => ({
  patient: one(patients, {
    fields: [labOrders.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [labOrders.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const procedureQuotesRelations = relations(procedureQuotes, ({ one }) => ({
  patient: one(patients, {
    fields: [procedureQuotes.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [procedureQuotes.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const colposcopyReportsRelations = relations(colposcopyReports, ({ one }) => ({
  patient: one(patients, {
    fields: [colposcopyReports.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [colposcopyReports.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const ultrasoundReportsRelations = relations(ultrasoundReports, ({ one }) => ({
  patient: one(patients, {
    fields: [ultrasoundReports.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [ultrasoundReports.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const minorProceduresRelations = relations(minorProcedures, ({ one }) => ({
  patient: one(patients, {
    fields: [minorProcedures.patientId],
    references: [patients.id],
  }),
  consultation: one(medicalConsultations, {
    fields: [minorProcedures.consultationId],
    references: [medicalConsultations.id],
  }),
}));

export const prenatalCardsRelations = relations(prenatalCards, ({ one }) => ({
  patient: one(patients, {
    fields: [prenatalCards.patientId],
    references: [patients.id],
  }),
  attendingDoctor: one(profiles, {
    fields: [prenatalCards.attendingDoctorId],
    references: [profiles.id],
  }),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
  patient: one(patients, {
    fields: [patientDocuments.patientId],
    references: [patients.id],
  }),
}));

export const wordHistoryDocumentsRelations = relations(wordHistoryDocuments, ({ one }) => ({
  patient: one(patients, {
    fields: [wordHistoryDocuments.patientId],
    references: [patients.id],
  }),
}));
