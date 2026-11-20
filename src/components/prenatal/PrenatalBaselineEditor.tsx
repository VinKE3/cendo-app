"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  calculateNaegeleFPP,
  DIRECT_RELATIVES_OPTIONS,
  MINSA_FAMILY_HISTORY_COL1,
  MINSA_FAMILY_HISTORY_COL2,
  MINSA_PERSONAL_HISTORY_COL1,
  MINSA_PERSONAL_HISTORY_COL2,
  MINSA_PERSONAL_HISTORY_COL3,
  type PrenatalBaselineData,
} from "@/features/prenatal/prenatal.schema";
import { cn, formatPeruDateDisplay, getPeruDateString } from "@/lib/utils";

interface PrenatalBaselineEditorProps {
  patient: PatientDirectoryItem;
  baseline: PrenatalBaselineData;
  onChange: (next: PrenatalBaselineData) => void;
  clinicEstablishment: string;
  onClinicEstablishmentChange: (val: string) => void;
  firstObstetricEcho: UltrasoundReportItem | null;
}

type SectionKey =
  | "filiacion"
  | "obstetricos"
  | "gestacionAnt"
  | "familiares"
  | "personales"
  | "vacunasPesoSangre"
  | "embarazoActual"
  | "examenFisico"
  | "laboratorio";

export function PrenatalBaselineEditor({
  patient,
  baseline,
  onChange,
  clinicEstablishment,
  onClinicEstablishmentChange,
  firstObstetricEcho,
}: PrenatalBaselineEditorProps) {
  const todayStr = getPeruDateString();

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    filiacion: true,
    obstetricos: true,
    gestacionAnt: false,
    familiares: false,
    personales: false,
    vacunasPesoSangre: false,
    embarazoActual: true,
    examenFisico: false,
    laboratorio: true,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = (open: boolean) => {
    setOpenSections({
      filiacion: open,
      obstetricos: open,
      gestacionAnt: open,
      familiares: open,
      personales: open,
      vacunasPesoSangre: open,
      embarazoActual: open,
      examenFisico: open,
      laboratorio: open,
    });
  };

  const patchBaseline = (patch: Partial<PrenatalBaselineData>) => {
    onChange({ ...baseline, ...patch });
  };

  const handleToggleFamilyItem = (id: string) => {
    if (id === "Ninguno") {
      patchBaseline({
        familyHistory: ["Ninguno"],
        familyHistoryDetails: {},
        familyHistoryOther: "",
      });
      return;
    }

    const current = baseline.familyHistory.filter((x) => x !== "Ninguno");
    const details = { ...baseline.familyHistoryDetails };

    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      delete details[id];
      patchBaseline({
        familyHistory: next.length > 0 ? next : ["Ninguno"],
        familyHistoryDetails: details,
      });
    } else {
      const next = [...current, id];
      if (!details[id]) details[id] = "Madre";
      patchBaseline({
        familyHistory: next,
        familyHistoryDetails: details,
      });
    }
  };

  const handleTogglePersonalItem = (id: string) => {
    if (id === "Ninguno") {
      patchBaseline({
        personalHistory: ["Ninguno"],
        personalHistoryDetails: {},
        personalHistoryOther: "",
      });
      return;
    }

    const current = baseline.personalHistory.filter((x) => x !== "Ninguno");
    const details = { ...baseline.personalHistoryDetails };

    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      delete details[id];
      patchBaseline({
        personalHistory: next.length > 0 ? next : ["Ninguno"],
        personalHistoryDetails: details,
      });
    } else {
      const next = [...current, id];
      if (id === "Cirugía Pélv.-uterina" && !details[id]) {
        details[id] = "Cesárea previa";
      }
      patchBaseline({
        personalHistory: next,
        personalHistoryDetails: details,
      });
    }
  };

  const handleFillNormalLabs = () => {
    patchBaseline({
      hemoglobin1: baseline.hemoglobin1 ?? 12.4,
      hemoglobin1Date: baseline.hemoglobin1Date || todayStr,
      hemoglobin1NotDone: false,
      glucose1Result: "Normal",
      glucose1Value: baseline.glucose1Value ?? 84,
      glucose1Date: baseline.glucose1Date || todayStr,
      vdrlRpr1Result: "No reactivo",
      vdrlRpr1Date: baseline.vdrlRpr1Date || todayStr,
      rapidSyphilisResult: "No reactivo",
      rapidSyphilisDate: baseline.rapidSyphilisDate || todayStr,
      hivRapid1Result: "No reactivo",
      hivRapid1Date: baseline.hivRapid1Date || todayStr,
      completeUrineExamResult: "Negativo",
      completeUrineExamDate: baseline.completeUrineExamDate || todayStr,
      leukocyturiaResult: "Negativo",
      leukocyturiaDate: baseline.leukocyturiaDate || todayStr,
      nitritesResult: "Negativo",
      nitritesDate: baseline.nitritesDate || todayStr,
      urineCultureResult: "Negativo",
      urineCultureDate: baseline.urineCultureDate || todayStr,
      hepatitisBResult: "Negativo",
      hepatitisBDate: baseline.hepatitisBDate || todayStr,
      papTestResult: "Normal",
      papTestDate: baseline.papTestDate || todayStr,
    });
  };

  const totalPartos =
    (baseline.partosVaginales || 0) + (baseline.cesareas || 0);

  return (
    <div className="space-y-3">
      {/* Barra de control rápido de secciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-foreground">
            Anverso Oficial MINSA / CLAP (9 Secciones Basales)
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
            🟨 = ALERTA
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-red-600 bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            🟥 = Seguimiento continuo
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => expandAll(true)}
          >
            Expandir Todo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => expandAll(false)}
          >
            Contraer Todo
          </Button>
        </div>
      </div>

      {/* SECCIÓN 1: FILIACIÓN & UBIGEO */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("filiacion")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>1. FILIACIÓN DE LA GESTANTE, SEGURO & UBIGEO</span>
          {openSections.filiacion ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.filiacion ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 text-xs sm:grid-cols-4">
            <div className="sm:col-span-2">
              <span className="mb-1 block font-semibold">Establecimiento</span>
              <Input
                value={clinicEstablishment}
                onChange={(e) => onClinicEstablishmentChange(e.target.value)}
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">No. HC</span>
              <Input
                value={baseline.hcNumber || patient.documentNumber}
                onChange={(e) => patchBaseline({ hcNumber: e.target.value })}
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">Establ. Origen</span>
              <Input
                value={baseline.establishmentOrigin}
                onChange={(e) =>
                  patchBaseline({ establishmentOrigin: e.target.value })
                }
              />
            </div>

            <div>
              <span className="mb-1 block font-semibold">Tipo Seguro</span>
              <select
                value={baseline.insuranceType}
                onChange={(e) =>
                  patchBaseline({
                    insuranceType: e.target
                      .value as PrenatalBaselineData["insuranceType"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="PRIVADO">PRIVADO</option>
                <option value="SIS">SIS</option>
                <option value="ESSALUD">ESSALUD</option>
                <option value="No Aplica">No Aplica</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Código Afiliación Seguro
              </span>
              <Input
                value={baseline.insuranceAffiliationCode}
                onChange={(e) =>
                  patchBaseline({ insuranceAffiliationCode: e.target.value })
                }
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Estudios (Analfabeta = 🟨)
              </span>
              <select
                value={baseline.educationLevel}
                onChange={(e) =>
                  patchBaseline({
                    educationLevel: e.target
                      .value as PrenatalBaselineData["educationLevel"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="Analfabeta">Analfabeta (🟨 Alerta)</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
                <option value="Superior">Superior</option>
                <option value="Superior No Univ">Superior No Univ.</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Estado Civil (Soltera = 🟨)
              </span>
              <select
                value={baseline.civilStatus}
                onChange={(e) =>
                  patchBaseline({
                    civilStatus: e.target
                      .value as PrenatalBaselineData["civilStatus"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="Casada">Casada</option>
                <option value="Conviviente">Conviviente</option>
                <option value="Soltera">Soltera (🟨 Alerta)</option>
                <option value="Otro">Otro (🟨 Alerta)</option>
              </select>
            </div>

            <div>
              <span className="mb-1 block font-semibold">
                Padre del RN (Opcional)
              </span>
              <Input
                value={baseline.fatherName}
                onChange={(e) => patchBaseline({ fatherName: e.target.value })}
                placeholder="Nombres y apellidos..."
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">Distrito</span>
              <Input
                value={baseline.district}
                onChange={(e) => patchBaseline({ district: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block font-semibold">Domicilio Actual</span>
              <Input
                value={baseline.patientAddress}
                onChange={(e) =>
                  patchBaseline({ patientAddress: e.target.value })
                }
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 2: ANTECEDENTES OBSTÉTRICOS (ÁRBOL DE PARIDAD) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("obstetricos")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            2. ANTECEDENTES OBSTÉTRICOS (G{baseline.gestas} P{totalPartos}
            {baseline.abortos}
            {baseline.nacidosVivos} • Cesáreas: {baseline.cesareas})
          </span>
          {openSections.obstetricos ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.obstetricos ? (
          <div className="space-y-3 border-t border-border p-4 text-xs">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <span className="mb-1 block font-semibold">Gestas</span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.gestas}
                  onChange={(e) =>
                    patchBaseline({
                      gestas: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold">Abortos 🟨</span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.abortos}
                  onChange={(e) =>
                    patchBaseline({
                      abortos: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold">
                  Partos Vaginales
                </span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.partosVaginales}
                  onChange={(e) =>
                    patchBaseline({
                      partosVaginales: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold text-destructive">
                  Cesáreas 🟥 (Auto-marca Cirugía Pélv.)
                </span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.cesareas}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    const nextPersonal = baseline.personalHistory.filter(
                      (x) => x !== "Ninguno"
                    );
                    const nextDetails = { ...baseline.personalHistoryDetails };
                    if (
                      val > 0 &&
                      !nextPersonal.includes("Cirugía Pélv.-uterina")
                    ) {
                      nextPersonal.push("Cirugía Pélv.-uterina");
                      nextDetails["Cirugía Pélv.-uterina"] = "Cesárea previa";
                    }
                    patchBaseline({
                      cesareas: val,
                      personalHistory:
                        nextPersonal.length > 0 ? nextPersonal : ["Ninguno"],
                      personalHistoryDetails: nextDetails,
                    });
                  }}
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold">
                  RN de mayor peso (gramos)
                </span>
                <Input
                  type="number"
                  step={50}
                  min={0}
                  value={baseline.rnMayorPesoGramos || ""}
                  onChange={(e) =>
                    patchBaseline({
                      rnMayorPesoGramos: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="Ej. 3450"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block font-semibold">Nacidos Vivos</span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.nacidosVivos}
                  onChange={(e) =>
                    patchBaseline({
                      nacidosVivos: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold">
                  Nacidos Muertos 🟨
                </span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.nacidosMuertos}
                  onChange={(e) =>
                    patchBaseline({
                      nacidosMuertos: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block font-semibold">Viven</span>
                <Input
                  type="number"
                  min={0}
                  value={baseline.viven}
                  onChange={(e) =>
                    patchBaseline({
                      viven: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={baseline.lowWeightHistory}
                    onChange={(e) =>
                      patchBaseline({ lowWeightHistory: e.target.checked })
                    }
                  />
                  <span>&lt; 2500 g 🟨</span>
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={baseline.multipleHistory}
                    onChange={(e) =>
                      patchBaseline({ multipleHistory: e.target.checked })
                    }
                  />
                  <span>Múltiple 🟨</span>
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={baseline.pretermHistory}
                    onChange={(e) =>
                      patchBaseline({ pretermHistory: e.target.checked })
                    }
                  />
                  <span>&lt; 37 sem. 🟨</span>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 3: GESTACIÓN ANTERIOR */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("gestacionAnt")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            3. GESTACIÓN ANTERIOR & CAPTACIÓN ({baseline.previousDeliveryType})
          </span>
          {openSections.gestacionAnt ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.gestacionAnt ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="mb-1 block font-semibold">
                Fecha Terminación Previa
              </span>
              <Input
                type="date"
                value={baseline.previousDeliveryDate}
                onChange={(e) =>
                  patchBaseline({ previousDeliveryDate: e.target.value })
                }
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Terminación (No Aplica = primigesta)
              </span>
              <select
                value={baseline.previousDeliveryType}
                onChange={(e) =>
                  patchBaseline({
                    previousDeliveryType: e.target
                      .value as PrenatalBaselineData["previousDeliveryType"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="No Aplica">No Aplica (Primigesta)</option>
                <option value="Parto Vaginal">Parto Vaginal</option>
                <option value="Cesárea">Cesárea (🟨)</option>
                <option value="Aborto">Aborto (🟨)</option>
                <option value="Ectópico">Ectópico (🟨)</option>
                <option value="Aborto molar">Aborto molar (🟨)</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Si fue aborto: Tipo (Incompleto = quedó restos)
              </span>
              <select
                value={baseline.previousAbortionType}
                onChange={(e) =>
                  patchBaseline({
                    previousAbortionType: e.target
                      .value as PrenatalBaselineData["previousAbortionType"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="No Aplica">No Aplica</option>
                <option value="Incompleto">
                  Incompleto (cuando quedó restos 🟨)
                </option>
                <option value="Completo">Completo (🟨)</option>
                <option value="Frustro/Retenido">Frustro / Retenido (🟨)</option>
                <option value="Séptico">Séptico (🟨)</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                Lactancia Materna Previa
              </span>
              <select
                value={baseline.breastfeedingMonths}
                onChange={(e) =>
                  patchBaseline({
                    breastfeedingMonths: e.target
                      .value as PrenatalBaselineData["breastfeedingMonths"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="No aplica">No aplica</option>
                <option value="6 meses o más">6 meses o más</option>
                <option value="< 6 meses">&lt; 6 meses (🟨)</option>
                <option value="no hubo">no hubo (🟥)</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 4: ANTECEDENTES FAMILIARES (LOS 13 ÍTEMS OFICIALES + QUÉ FAMILIAR) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("familiares")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            4. ANTECEDENTES FAMILIARES (13 Ítems Oficiales MINSA • Al costado
            indicar qué familiar directo)
          </span>
          {openSections.familiares ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.familiares ? (
          <div className="space-y-3 border-t border-border p-4 text-xs">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[...MINSA_FAMILY_HISTORY_COL1, ...MINSA_FAMILY_HISTORY_COL2].map(
                (item) => {
                  const checked = baseline.familyHistory.includes(item.id);
                  const relative = baseline.familyHistoryDetails?.[item.id] || "Madre";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border p-2.5 transition-colors",
                        checked
                          ? item.isAlert
                            ? "border-amber-500 bg-amber-50/70"
                            : "border-primary bg-primary/5"
                          : "border-border bg-background"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleFamilyItem(item.id)}
                          />
                          <span>{item.label}</span>
                          {item.note ? (
                            <Badge variant="outline" className="text-[10px]">
                              {item.note}
                            </Badge>
                          ) : null}
                        </label>
                        {item.isAlert ? (
                          <span className="text-[10px] font-bold text-amber-800">
                            🟨 ALERTA
                          </span>
                        ) : null}
                      </div>

                      {checked && item.id !== "Ninguno" ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-amber-300/60 pt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-950">
                            <Users className="size-3" />
                            Familiar directo:
                          </span>
                          {DIRECT_RELATIVES_OPTIONS.map((rel) => (
                            <button
                              key={rel}
                              type="button"
                              onClick={() =>
                                patchBaseline({
                                  familyHistoryDetails: {
                                    ...baseline.familyHistoryDetails,
                                    [item.id]: rel,
                                  },
                                })
                              }
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-bold",
                                relative === rel
                                  ? "bg-amber-500 text-slate-950"
                                  : "border border-border bg-white text-slate-700"
                              )}
                            >
                              {rel}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 5: ANTECEDENTES PERSONALES (LOS 27 ÍTEMS OFICIALES EN 3 COLUMNAS) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("personales")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            5. ANTECEDENTES PERSONALES (27 Ítems Oficiales MINSA en 3 Columnas •{" "}
            {baseline.personalHistory.join(", ")})
          </span>
          {openSections.personales ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.personales ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 text-xs sm:grid-cols-3">
            {[
              MINSA_PERSONAL_HISTORY_COL1,
              MINSA_PERSONAL_HISTORY_COL2,
              MINSA_PERSONAL_HISTORY_COL3,
            ].map((col, idx) => (
              <div key={idx} className="space-y-1.5">
                {col.map((item) => {
                  const checked = baseline.personalHistory.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border p-2",
                        checked
                          ? item.severity === "continuous"
                            ? "border-red-500 bg-red-50/80"
                            : item.severity === "alert"
                              ? "border-amber-500 bg-amber-50/80"
                              : "border-primary bg-primary/5"
                          : "border-border bg-background"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <label className="flex cursor-pointer items-center gap-1.5 font-semibold">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePersonalItem(item.id)}
                          />
                          <span>{item.label}</span>
                          {item.eyeWarning ? (
                            <span
                              className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1 py-0.2 text-[10px] font-bold text-red-900"
                              title="Ojo: marcar cuando tiene cesárea previa"
                            >
                              <Eye className="size-3" /> cesárea
                            </span>
                          ) : null}
                        </label>
                        <span>
                          {item.severity === "continuous"
                            ? "🟥"
                            : item.severity === "alert"
                              ? "🟨"
                              : ""}
                        </span>
                      </div>
                      {checked && item.id !== "Ninguno" ? (
                        <Input
                          value={
                            baseline.personalHistoryDetails?.[item.id] || ""
                          }
                          onChange={(e) =>
                            patchBaseline({
                              personalHistoryDetails: {
                                ...baseline.personalHistoryDetails,
                                [item.id]: e.target.value,
                              },
                            })
                          }
                          placeholder="Detalle clínico (ej. Cesárea previa)..."
                          className="mt-1.5 h-7 text-[11px]"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 6: VACUNAS PREVIAS, PESO/TALLA PREGESTACIONAL, ANTITETÁNICA, SANGRE & HÁBITOS */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("vacunasPesoSangre")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            6. VACUNAS PREVIAS, PESO ANTES DEL EMBARAZO ({baseline.usualWeightKg}{" "}
            kg), ANTITETÁNICA & SANGRE ({baseline.bloodGroup} {baseline.rhFactor})
          </span>
          {openSections.vacunasPesoSangre ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.vacunasPesoSangre ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="mb-1 block font-semibold">
                Peso Habitual (Antes del embarazo - kg)
              </span>
              <Input
                type="number"
                step="0.1"
                value={baseline.usualWeightKg}
                onChange={(e) =>
                  patchBaseline({
                    usualWeightKg: parseFloat(e.target.value) || 58,
                  })
                }
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">Talla (cm)</span>
              <Input
                type="number"
                value={baseline.heightCm}
                onChange={(e) =>
                  patchBaseline({
                    heightCm: parseInt(e.target.value, 10) || 160,
                  })
                }
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">Grupo Sanguíneo</span>
              <select
                value={baseline.bloodGroup}
                onChange={(e) =>
                  patchBaseline({
                    bloodGroup: e.target
                      .value as PrenatalBaselineData["bloodGroup"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="O">Grupo O</option>
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
                <option value="AB">Grupo AB</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">Factor Rh</span>
              <select
                value={baseline.rhFactor}
                onChange={(e) =>
                  patchBaseline({
                    rhFactor: e.target.value as PrenatalBaselineData["rhFactor"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="Rh (+)">Rh (+)</option>
                <option value="Rh (-) No Sensibilizada">
                  Rh (-) No Sensibilizada (🟨)
                </option>
                <option value="Rh (-) Desconocida">
                  Rh (-) Desconocida (🟨)
                </option>
                <option value="Rh (-) Sensibilizada">
                  Rh (-) Sensibilizada (🟥)
                </option>
              </select>
            </div>

            <div>
              <span className="mb-1 block font-semibold">
                Antitetánica (Estado)
              </span>
              <select
                value={baseline.antitetanicaStatus}
                onChange={(e) =>
                  patchBaseline({
                    antitetanicaStatus: e.target
                      .value as PrenatalBaselineData["antitetanicaStatus"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="Vacunada">Vacunada</option>
                <option value="Sin dosis">Sin dosis (🟨 Alerta)</option>
                <option value="No Aplica">No Aplica</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                N° Dosis Antitetánica Previa
              </span>
              <Input
                type="number"
                min={0}
                value={baseline.antitetanicaPrevDoses}
                onChange={(e) =>
                  patchBaseline({
                    antitetanicaPrevDoses: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
            <div>
              <span className="mb-1 block font-semibold">
                1ra / 2da Dosis (Mes gestación)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={baseline.antitetanica1stDoseMonth}
                  onChange={(e) =>
                    patchBaseline({ antitetanica1stDoseMonth: e.target.value })
                  }
                  placeholder="1ra (ej. 5°m)"
                />
                <Input
                  value={baseline.antitetanica2ndDoseMonth}
                  onChange={(e) =>
                    patchBaseline({ antitetanica2ndDoseMonth: e.target.value })
                  }
                  placeholder="2da (ej. 6°m)"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="block font-semibold">Vacunas Previas</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["rubella", "Rubeola"],
                    ["hepatitisB", "Hep. B"],
                    ["hpv", "VPH"],
                    ["yellowFever", "F. Amarilla"],
                  ] as const
                ).map(([k, lbl]) => (
                  <label key={k} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={baseline.previousVaccines[k]}
                      onChange={(e) =>
                        patchBaseline({
                          previousVaccines: {
                            ...baseline.previousVaccines,
                            [k]: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 7: FUM, 1.ª ECOGRAFÍA, FPP NAEGELE, HOSPITALIZACIÓN, EMERGENCIA & VIOLENCIA */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("embarazoActual")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            7. EMBARAZO ACTUAL: FUM ({baseline.fum || "—"}), FPP NAEGELE (
            {baseline.fpp || "—"}), 1.ª ECOGRAFÍA, HOSPITALIZACIÓN & VIOLENCIA
          </span>
          {openSections.embarazoActual ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.embarazoActual ? (
          <div className="space-y-3 border-t border-border p-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block font-semibold">
                  FUM (Fecha Última Menstruación) *
                </span>
                <Input
                  type="date"
                  value={baseline.fum}
                  onChange={(e) => {
                    const nextFum = e.target.value;
                    patchBaseline({
                      fum: nextFum,
                      fpp: calculateNaegeleFPP(nextFum),
                    });
                  }}
                />
              </div>

              <div>
                <span className="mb-1 block font-semibold text-primary">
                  Fecha Probable de Parto (FPP Naegele)
                </span>
                <Input
                  type="date"
                  value={baseline.fpp}
                  onChange={(e) => patchBaseline({ fpp: e.target.value })}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">
                    EG. (La Primera Ecografía - Sem)
                  </span>
                  {firstObstetricEcho ? (
                    <button
                      type="button"
                      onClick={() => {
                        const rawGa =
                          firstObstetricEcho.findings.gestationalAgeByEcho || "";
                        const m = rawGa.match(/(\d+)/);
                        patchBaseline({
                          ultrasoundGestationalAgeWeeks: m
                            ? parseInt(m[1], 10)
                            : 8,
                          ultrasoundDate: firstObstetricEcho.reportDate,
                          ultrasoundNoApplies: false,
                        });
                      }}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:underline"
                    >
                      <Sparkles className="size-3" />
                      Jalar 1.ª Eco ({formatPeruDateDisplay(firstObstetricEcho.reportDate)})
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={42}
                    value={baseline.ultrasoundGestationalAgeWeeks || ""}
                    onChange={(e) =>
                      patchBaseline({
                        ultrasoundGestationalAgeWeeks:
                          parseInt(e.target.value, 10) || 0,
                        ultrasoundNoApplies: false,
                      })
                    }
                    placeholder="Sem."
                  />
                  <Input
                    type="date"
                    value={baseline.ultrasoundDate}
                    onChange={(e) =>
                      patchBaseline({ ultrasoundDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center gap-1.5 pt-2">
                <label className="inline-flex items-center gap-1.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={baseline.fumDoubt}
                    onChange={(e) =>
                      patchBaseline({ fumDoubt: e.target.checked })
                    }
                  />
                  <span>Duda de FUM (🟨 Alerta)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={
                      baseline.violenceScreening?.violenceDetected === true
                    }
                    onChange={(e) =>
                      patchBaseline({
                        violenceScreening: {
                          ...baseline.violenceScreening,
                          screeningDone: true,
                          violenceDetected: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Tamizaje Violencia Positivo (🟨)</span>
                </label>
              </div>
            </div>

            {/* Hospitalización y Emergencia */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2.5">
                <label className="flex items-center justify-between font-bold">
                  <span>Hospitalización en embarazo actual (🟨)</span>
                  <input
                    type="checkbox"
                    checked={baseline.hospitalized}
                    onChange={(e) =>
                      patchBaseline({ hospitalized: e.target.checked })
                    }
                  />
                </label>
                {baseline.hospitalized ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    <Input
                      type="date"
                      value={baseline.hospitalizationHistory.date}
                      onChange={(e) =>
                        patchBaseline({
                          hospitalizationHistory: {
                            ...baseline.hospitalizationHistory,
                            date: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      value={baseline.hospitalizationHistory.diagnosis}
                      onChange={(e) =>
                        patchBaseline({
                          hospitalizationHistory: {
                            ...baseline.hospitalizationHistory,
                            diagnosis: e.target.value,
                          },
                        })
                      }
                      placeholder="Diagnóstico..."
                    />
                    <Input
                      value={baseline.hospitalizationHistory.cie10}
                      onChange={(e) =>
                        patchBaseline({
                          hospitalizationHistory: {
                            ...baseline.hospitalizationHistory,
                            cie10: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      placeholder="CIE-10"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2.5">
                <label className="flex items-center justify-between font-bold">
                  <span>Ingreso por Emergencia en embarazo actual (🟨)</span>
                  <input
                    type="checkbox"
                    checked={baseline.hadEmergency}
                    onChange={(e) =>
                      patchBaseline({ hadEmergency: e.target.checked })
                    }
                  />
                </label>
                {baseline.hadEmergency ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    <Input
                      type="date"
                      value={baseline.emergencyHistory.date}
                      onChange={(e) =>
                        patchBaseline({
                          emergencyHistory: {
                            ...baseline.emergencyHistory,
                            date: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      value={baseline.emergencyHistory.diagnosis}
                      onChange={(e) =>
                        patchBaseline({
                          emergencyHistory: {
                            ...baseline.emergencyHistory,
                            diagnosis: e.target.value,
                          },
                        })
                      }
                      placeholder="Diagnóstico..."
                    />
                    <Input
                      value={baseline.emergencyHistory.cie10}
                      onChange={(e) =>
                        patchBaseline({
                          emergencyHistory: {
                            ...baseline.emergencyHistory,
                            cie10: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      placeholder="CIE-10"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 8: EXAMEN FÍSICO BASAL (5 ÁREAS) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("examenFisico")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            8. EXAMEN FÍSICO BASAL (Clínico, Mamas, Cuello Uterino, Pelvis &
            Odontológico)
          </span>
          {openSections.examenFisico ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.examenFisico ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 text-xs sm:grid-cols-5">
            {(
              [
                ["clinicalExam", "Clínico General"],
                ["breastsExam", "Mamas"],
                ["cervixExam", "Cuello Uterino"],
                ["pelvisExam", "Pelvis"],
                ["dentalExam", "Odontológico"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <span className="mb-1 block font-semibold">{label}</span>
                <select
                  value={baseline[key]}
                  onChange={(e) =>
                    patchBaseline({
                      [key]: e.target.value as
                        | "Sin Examen"
                        | "Normal"
                        | "Patológico",
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="Normal">Normal [✓]</option>
                  <option value="Sin Examen">Sin Examen (🟨)</option>
                  <option value="Patológico">Patológico (🟨)</option>
                </select>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 9: EXÁMENES DE LABORATORIO (LOS 3 TRIMESTRES CON SUS 3 FECHAS + ESPECIALES) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => toggleSection("laboratorio")}
          className="flex w-full items-center justify-between bg-muted/40 px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/60"
        >
          <span>
            9. EXÁMENES DE LABORATORIO (3 Fechas por Trimestre: 1°T, 2°T, 3°T +
            Tamizaje Especial MINSA)
          </span>
          {openSections.laboratorio ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {openSections.laboratorio ? (
          <div className="space-y-4 border-t border-border p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground">
                Registre los resultados y sus 3 fechas independientes (1°
                Trimestre, 2° Trimestre y 3° Trimestre). Todo saldrá visible al
                imprimir.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillNormalLabs}
              >
                <Check className="size-3.5 text-primary" />✓ Marcar Panel Basal
                1° Trimestre Normal
              </Button>
            </div>

            {/* 9.1 Hemoglobina (3 Trimestres + Alta con sus fechas) */}
            <div className="rounded-lg border border-border bg-muted/15 p-3">
              <span className="mb-2 block font-bold text-foreground">
                A. Hemoglobina Seriada (g/dL) — 3 Trimestres + Alta (&lt; 11.0
                g/dL = 🟨 Anemia)
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {(
                  [
                    [
                      "1° Trimestre",
                      "hemoglobin1",
                      "hemoglobin1Date",
                      "hemoglobin1NotDone",
                    ],
                    [
                      "2° Trimestre",
                      "hemoglobin2",
                      "hemoglobin2Date",
                      "hemoglobin2NotDone",
                    ],
                    [
                      "3° Trimestre",
                      "hemoglobin3",
                      "hemoglobin3Date",
                      "hemoglobin3NotDone",
                    ],
                    [
                      "Al Alta",
                      "hemoglobinDischarge",
                      "hemoglobinDischargeDate",
                      "hemoglobinDischargeNotDone",
                    ],
                  ] as const
                ).map(([lbl, valKey, dateKey, notDoneKey]) => (
                  <div
                    key={lbl}
                    className="space-y-1.5 rounded border border-border bg-background p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{lbl}</span>
                      <label className="inline-flex items-center gap-1 text-[10px]">
                        <input
                          type="checkbox"
                          checked={Boolean(baseline[notDoneKey])}
                          onChange={(e) =>
                            patchBaseline({ [notDoneKey]: e.target.checked })
                          }
                        />
                        <span>No se hizo</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        disabled={Boolean(baseline[notDoneKey])}
                        value={baseline[valKey] ?? ""}
                        onChange={(e) =>
                          patchBaseline({
                            [valKey]: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                            [notDoneKey]: false,
                          })
                        }
                        placeholder="g/dL"
                      />
                      <Input
                        type="date"
                        value={baseline[dateKey]}
                        onChange={(e) =>
                          patchBaseline({ [dateKey]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9.2 Glicemia (3 Trimestres + Tolerancia con sus fechas) */}
            <div className="rounded-lg border border-border bg-muted/15 p-3">
              <span className="mb-2 block font-bold text-foreground">
                B. Glicemia en Ayunas & Tolerancia a la Glucosa — 3 Fechas
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {(
                  [
                    [
                      "Glicemia 1 (1°T)",
                      "glucose1Result",
                      "glucose1Value",
                      "glucose1Date",
                    ],
                    [
                      "Glicemia 2 (2°T)",
                      "glucose2Result",
                      "glucose2Value",
                      "glucose2Date",
                    ],
                    [
                      "Glicemia 3 (3°T)",
                      "glucose3Result",
                      "glucose3Value",
                      "glucose3Date",
                    ],
                    [
                      "Tolerancia Glucosa",
                      "glucoseToleranceResult",
                      "glucoseToleranceValue",
                      "glucoseToleranceDate",
                    ],
                  ] as const
                ).map(([lbl, resKey, valKey, dateKey]) => (
                  <div
                    key={lbl}
                    className="space-y-1.5 rounded border border-border bg-background p-2"
                  >
                    <span className="block font-bold">{lbl}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={baseline[resKey]}
                        onChange={(e) =>
                          patchBaseline({
                            [resKey]: e.target.value as
                              | "Normal"
                              | "Anormal"
                              | "No se Hizo"
                              | "No Aplica",
                          })
                        }
                        className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Anormal">Anormal (🟨)</option>
                        <option value="No se Hizo">No se Hizo (🟨)</option>
                        <option value="No Aplica">No Aplica</option>
                      </select>
                      <Input
                        type="number"
                        value={baseline[valKey] ?? ""}
                        onChange={(e) =>
                          patchBaseline({
                            [valKey]: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="mg/dL"
                      />
                    </div>
                    <Input
                      type="date"
                      value={baseline[dateKey]}
                      onChange={(e) =>
                        patchBaseline({ [dateKey]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 9.3 Sífilis (VDRL/RPR 1, 2, 3 + P. Rápida) & VIH (1, 2, 3 + ELISA) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                <span className="block font-bold text-foreground">
                  C. Sífilis (VDRL/RPR 1°T, 2°T, 3°T & Prueba Rápida)
                </span>
                {(
                  [
                    ["VDRL/RPR 1 (1°T)", "vdrlRpr1Result", "vdrlRpr1Date"],
                    ["VDRL/RPR 2 (2°T)", "vdrlRpr2Result", "vdrlRpr2Date"],
                    ["VDRL/RPR 3 (3°T)", "vdrlRpr3Result", "vdrlRpr3Date"],
                    [
                      "Prueba Ráp. Sífilis",
                      "rapidSyphilisResult",
                      "rapidSyphilisDate",
                    ],
                  ] as const
                ).map(([lbl, resKey, dateKey]) => (
                  <div
                    key={lbl}
                    className="grid grid-cols-12 items-center gap-2"
                  >
                    <span className="col-span-4 font-semibold">{lbl}</span>
                    <select
                      value={baseline[resKey]}
                      onChange={(e) =>
                        patchBaseline({
                          [resKey]: e.target.value as
                            | "No reactivo"
                            | "Reactivo"
                            | "No se Hizo"
                            | "No Aplica",
                        })
                      }
                      className="col-span-4 h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="No reactivo">No reactivo</option>
                      <option value="Reactivo">Reactivo (🟨)</option>
                      <option value="No se Hizo">No se Hizo</option>
                      <option value="No Aplica">No Aplica</option>
                    </select>
                    <Input
                      type="date"
                      value={baseline[dateKey]}
                      onChange={(e) =>
                        patchBaseline({ [dateKey]: e.target.value })
                      }
                      className="col-span-4 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                <span className="block font-bold text-foreground">
                  D. Tamizaje VIH (Prueba Rápida 1°T, 2°T, 3°T & ELISA)
                </span>
                {(
                  [
                    ["VIH P. Rápida 1 (1°T)", "hivRapid1Result", "hivRapid1Date"],
                    ["VIH P. Rápida 2 (2°T)", "hivRapid2Result", "hivRapid2Date"],
                    ["VIH P. Rápida 3 (3°T)", "hivRapid3Result", "hivRapid3Date"],
                    ["VIH ELISA", "hivElisaResult", "hivElisaDate"],
                  ] as const
                ).map(([lbl, resKey, dateKey]) => (
                  <div
                    key={lbl}
                    className="grid grid-cols-12 items-center gap-2"
                  >
                    <span className="col-span-4 font-semibold">{lbl}</span>
                    <select
                      value={baseline[resKey]}
                      onChange={(e) =>
                        patchBaseline({
                          [resKey]: e.target.value as
                            | "No reactivo"
                            | "Reactivo"
                            | "No se Hizo"
                            | "No Aplica",
                        })
                      }
                      className="col-span-4 h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="No reactivo">No reactivo</option>
                      <option value="Reactivo">Reactivo (🟨)</option>
                      <option value="No se Hizo">No se Hizo</option>
                      <option value="No Aplica">No Aplica</option>
                    </select>
                    <Input
                      type="date"
                      value={baseline[dateKey]}
                      onChange={(e) =>
                        patchBaseline({ [dateKey]: e.target.value })
                      }
                      className="col-span-4 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 9.4 Orina (1, 2, 3), Urocultivo (1, 2, 3), Hepatitis B, TORCH, PAP/Colpo */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                <span className="block font-bold text-foreground">
                  E. Examen Completo de Orina & Urocultivo (3 Trimestres)
                </span>
                {(
                  [
                    [
                      "Ex. Orina 1 (1°T)",
                      "completeUrineExamResult",
                      "completeUrineExamDate",
                    ],
                    [
                      "Ex. Orina 2 (2°T)",
                      "completeUrineExam2Result",
                      "completeUrineExam2Date",
                    ],
                    [
                      "Ex. Orina 3 (3°T)",
                      "completeUrineExam3Result",
                      "completeUrineExam3Date",
                    ],
                    [
                      "Urocultivo 1 (1°T)",
                      "urineCultureResult",
                      "urineCultureDate",
                    ],
                    [
                      "Urocultivo 2 (2°T)",
                      "urineCulture2Result",
                      "urineCulture2Date",
                    ],
                    [
                      "Urocultivo 3 (3°T)",
                      "urineCulture3Result",
                      "urineCulture3Date",
                    ],
                  ] as const
                ).map(([lbl, resKey, dateKey]) => (
                  <div
                    key={lbl}
                    className="grid grid-cols-12 items-center gap-2"
                  >
                    <span className="col-span-4 font-semibold">{lbl}</span>
                    <select
                      value={baseline[resKey]}
                      onChange={(e) =>
                        patchBaseline({
                          [resKey]: e.target.value as
                            | "Negativo"
                            | "Positivo"
                            | "No se Hizo"
                            | "No Aplica",
                        })
                      }
                      className="col-span-4 h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="Negativo">Negativo / Normal</option>
                      <option value="Positivo">Positivo / Patol. (🟨)</option>
                      <option value="No se Hizo">No se Hizo</option>
                      <option value="No Aplica">No Aplica</option>
                    </select>
                    <Input
                      type="date"
                      value={baseline[dateKey]}
                      onChange={(e) =>
                        patchBaseline({ [dateKey]: e.target.value })
                      }
                      className="col-span-4 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                <span className="block font-bold text-foreground">
                  F. Hepatitis B, TORCH, HTLV-1 & Tamizaje Cervical (PAP /
                  Colposcopía)
                </span>
                {(
                  [
                    [
                      "Hepatitis B (HBsAg)",
                      "hepatitisBResult",
                      "hepatitisBDate",
                      ["Negativo", "Positivo", "No se Hizo", "No Aplica"],
                    ],
                    [
                      "TORCH",
                      "torchResult",
                      "torchDate",
                      ["Negativo", "Positivo", "No se Hizo", "No Aplica"],
                    ],
                    [
                      "HTLV 1",
                      "htlv1Result",
                      "htlv1Date",
                      ["Negativo", "Positivo", "No se Hizo", "No Aplica"],
                    ],
                    [
                      "PAP Cervical",
                      "papTestResult",
                      "papTestDate",
                      ["Normal", "Anormal", "No se Hizo", "No Aplica"],
                    ],
                    [
                      "IVAA Cervical",
                      "ivaaResult",
                      "ivaaDate",
                      ["Normal", "Anormal", "No se Hizo", "No Aplica"],
                    ],
                    [
                      "Colposcopia",
                      "colposcopyResult",
                      "colposcopyDate",
                      ["Normal", "Anormal", "No se Hizo", "No Aplica"],
                    ],
                  ] as const
                ).map(([lbl, resKey, dateKey, opts]) => (
                  <div
                    key={lbl}
                    className="grid grid-cols-12 items-center gap-2"
                  >
                    <span className="col-span-4 font-semibold">{lbl}</span>
                    <select
                      value={baseline[resKey]}
                      onChange={(e) =>
                        patchBaseline({ [resKey]: e.target.value as never })
                      }
                      className="col-span-4 h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={baseline[dateKey]}
                      onChange={(e) =>
                        patchBaseline({ [dateKey]: e.target.value })
                      }
                      className="col-span-4 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
