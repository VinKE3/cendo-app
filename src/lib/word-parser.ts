import JSZip from "jszip";
import type { UltrasoundFindingsRecord } from "@/db/schema/specialty";
import {
  calculateEllipsoidVolumeCc,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";

export type WordDocKind =
  | "HISTORIA_CLINICA"
  | "ECOGRAFIA"
  | "EMPTY_TEMPLATE"
  | "UNKNOWN";

export interface ParsedWordDateResult {
  iso: string;
  inferredYear: boolean;
}

export interface ParsedWordConsultation {
  consultationDate: string;
  inferredYear: boolean;
  isControl: boolean;
  reasonForVisit: string;
  symptoms: string;
  generalExam: string;
  speculoscopy: string;
  bimanualPalpation: string;
  externalGenitalia: string;
  abdomenExam: string;
  bloodPressure: string;
  weightKg: number | null;
  heightCm: number | null;
  auxiliaryExams: string;
  diagnosis: string;
  cie10Code: string;
  treatmentPlan: string;
  prescriptionNotes: string;
}

export interface ParsedWordBackground {
  obstetricFormula: string;
  catamenialRegimen: string;
  contraceptiveMethod: string;
  lastMenstrualPeriod: string;
  papHistory: string;
  vphTestHistory: string;
  hasDiabetes: string;
  hasHypertension: string;
  hasAsthma: string;
  medicalAllergies: string;
  surgeriesHistory: string;
  familyHistory: string;
  otherPathologies: string;
  stiHistory: string;
  notes: string;
  menarche: number | null;
  sexualDebutAge: number | null;
  sexualPartnersCount: number | null;
}

export interface ParsedWordHistoryResult {
  kind: "HISTORIA_CLINICA" | "EMPTY_TEMPLATE";
  fileName: string;
  styleLabel: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  ageFromDoc: number | null;
  phone: string;
  civilStatus: string;
  educationLevel: string;
  occupation: string;
  birthPlace: string;
  address: string;
  religion: string;
  background: ParsedWordBackground;
  consultations: ParsedWordConsultation[];
  warnings: string[];
  extractedText: string;
}

export interface ParsedWordUltrasoundResult {
  kind: "ECOGRAFIA" | "EMPTY_TEMPLATE";
  fileName: string;
  patientDocumentNumber: string;
  patientFullName: string;
  reportDate: string;
  inferredYear: boolean;
  ultrasoundType: UltrasoundType;
  indication: string;
  findings: UltrasoundFindingsRecord;
  conclusion: string;
  recommendations: string;
  warnings: string[];
  extractedText: string;
}

export interface DocxBlockTable {
  kind: "table";
  rows: string[][];
}

export interface DocxBlockParagraph {
  kind: "paragraph";
  text: string;
}

export type DocxBodyBlock = DocxBlockTable | DocxBlockParagraph;

export interface DocxStructure {
  blocks: DocxBodyBlock[];
  paragraphs: string[];
  fullText: string;
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  setiembre: 9,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const COMMON_GIVEN_NAMES = new Set([
  "MARIA",
  "MARÍA",
  "ANA",
  "ROSA",
  "CARLA",
  "KARLA",
  "LUCIA",
  "LUCÍA",
  "CLAUDIA",
  "SOFIA",
  "SOFÍA",
  "VALERIA",
  "ANDREA",
  "CARMEN",
  "PATRICIA",
  "SANDRA",
  "MONICA",
  "MÓNICA",
  "PAULA",
  "JESSICA",
  "VERONICA",
  "VERÓNICA",
  "KAREN",
  "LAURA",
  "DANIELA",
  "STEPHANY",
  "ALLISON",
  "AMY",
  "NANCY",
  "SISAY",
  "MILAGROS",
  "GABRIELA",
  "FIORELLA",
  "KATHERINE",
  "MELISSA",
  "ALESSANDRA",
  "CAMILA",
  "DIANA",
  "ELENA",
  "FERNANDA",
  "GLORIA",
  "INGRID",
  "JOHANNA",
  "KARINA",
  "LILIANA",
  "LUISA",
  "MARTHA",
  "NATALIA",
  "OLGA",
  "PAMELA",
  "PAOLA",
  "ROXANA",
  "SILVIA",
  "SUSANA",
  "TERESA",
  "VANESSA",
  "WENDY",
  "YANINA",
  "YESSENIA",
]);

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_m, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10))
    );
}

function normalizeAsciiLower(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractParagraphTextFromXml(pXml: string): string {
  const tokenRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^/]*\/>|<w:br\b[^/]*\/>|<w:cr\b[^/]*\/>/g;
  let result = "";
  let match: RegExpExecArray | null = null;
  while ((match = tokenRegex.exec(pXml)) !== null) {
    if (match[1] !== undefined) {
      result += decodeXmlEntities(match[1]);
    } else if (match[0].startsWith("<w:tab")) {
      result += " ";
    } else {
      result += "\n";
    }
  }
  return result
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extrae bloques ordenados (tablas y párrafos) desde un contenedor OOXML (.docx).
 */
export async function extractDocxStructure(
  bytes: Uint8Array
): Promise<DocxStructure> {
  const zip = await JSZip.loadAsync(bytes);
  const docEntry = zip.file("word/document.xml");
  if (!docEntry) {
    throw new Error("El archivo .docx no contiene word/document.xml válido.");
  }

  const xml = await docEntry.async("string");
  const bodyMatch = xml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  const blocks: DocxBodyBlock[] = [];
  const paragraphs: string[] = [];

  // Analizar hijos directos dentro de <w:body>: tablas (<w:tbl>) y párrafos (<w:p>)
  let cursor = 0;
  while (cursor < bodyXml.length) {
    const nextTbl = bodyXml.indexOf("<w:tbl", cursor);
    const nextP = bodyXml.indexOf("<w:p", cursor);

    if (nextTbl === -1 && nextP === -1) break;

    const isTableNext =
      nextTbl !== -1 && (nextP === -1 || nextTbl < nextP);

    if (isTableNext) {
      // Asegurar que sea etiqueta <w:tbl> o <w:tbl ...>
      const tagAfter = bodyXml[nextTbl + 6];
      if (tagAfter && tagAfter !== ">" && tagAfter !== " ") {
        cursor = nextTbl + 6;
        continue;
      }

      // Buscar cierre correspondiente manejando posibles tablas anidadas
      let depth = 1;
      let scan = nextTbl + 6;
      let closeIdx = -1;
      while (scan < bodyXml.length && depth > 0) {
        const openChild = bodyXml.indexOf("<w:tbl", scan);
        const closeChild = bodyXml.indexOf("</w:tbl>", scan);
        if (closeChild === -1) break;

        if (
          openChild !== -1 &&
          openChild < closeChild &&
          (bodyXml[openChild + 6] === ">" || bodyXml[openChild + 6] === " ")
        ) {
          depth += 1;
          scan = openChild + 6;
        } else {
          depth -= 1;
          if (depth === 0) {
            closeIdx = closeChild + "</w:tbl>".length;
            break;
          }
          scan = closeChild + "</w:tbl>".length;
        }
      }

      const tblXml =
        closeIdx !== -1
          ? bodyXml.slice(nextTbl, closeIdx)
          : bodyXml.slice(nextTbl);

      const rows: string[][] = [];
      const rowMatches = tblXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g);
      for (const rowMatch of rowMatches) {
        const rowXml = rowMatch[1] ?? "";
        const cells: string[] = [];
        const cellMatches = rowXml.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g);
        for (const cellMatch of cellMatches) {
          const cellXml = cellMatch[1] ?? "";
          const cellLines: string[] = [];
          const pMatches = cellXml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g);
          for (const pMatch of pMatches) {
            const pText = extractParagraphTextFromXml(pMatch[1] ?? "");
            if (pText) cellLines.push(pText);
          }
          const cellText = cellLines.join("\n").trim();
          cells.push(cellText);
          if (cellText) paragraphs.push(cellText);
        }
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length > 0) {
        blocks.push({ kind: "table", rows });
      }
      cursor = closeIdx !== -1 ? closeIdx : bodyXml.length;
    } else {
      const tagAfter = bodyXml[nextP + 4];
      if (tagAfter && tagAfter !== ">" && tagAfter !== " " && tagAfter !== "/") {
        cursor = nextP + 4;
        continue;
      }

      const selfClose = bodyXml.indexOf("/>", nextP);
      const closeTagOpen = bodyXml.indexOf(">", nextP);
      if (selfClose !== -1 && closeTagOpen !== -1 && selfClose < closeTagOpen) {
        cursor = selfClose + 2;
        continue;
      }

      const closeP = bodyXml.indexOf("</w:p>", nextP);
      if (closeP === -1) break;
      const pXml = bodyXml.slice(nextP, closeP + "</w:p>".length);
      const pText = extractParagraphTextFromXml(pXml);
      if (pText) {
        blocks.push({ kind: "paragraph", text: pText });
        paragraphs.push(pText);
      }
      cursor = closeP + "</w:p>".length;
    }
  }

  return {
    blocks,
    paragraphs,
    fullText: paragraphs.join("\n"),
  };
}

/**
 * Parsea fechas peruanas en formatos DD-MM-YYYY, DD-M-YY, "28 DE FEBRERO 1998",
 * "25de julio 1962" o "14 de octubre" (infiriendo fallbackYear).
 */
export function parseSpanishDate(
  raw: string,
  fallbackYear: number
): ParsedWordDateResult | null {
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]+$/g, "")
    .trim();

  if (!clean || /^x+$/i.test(clean)) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const isValidYmd = (y: number, m: number, d: number) => {
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    const test = new Date(Date.UTC(y, m - 1, d));
    return (
      test.getUTCFullYear() === y &&
      test.getUTCMonth() === m - 1 &&
      test.getUTCDate() === d
    );
  };

  // 1. DD-MM-YYYY o DD/MM/YY
  const numMatch = clean.match(
    /^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})$/
  );
  if (numMatch) {
    const day = Number(numMatch[1]);
    const month = Number(numMatch[2]);
    let year = Number(numMatch[3]);
    if (numMatch[3]!.length === 2) {
      year = year <= 40 ? 2000 + year : 1900 + year;
    }
    if (isValidYmd(year, month, day)) {
      return {
        iso: `${year}-${pad(month)}-${pad(day)}`,
        inferredYear: false,
      };
    }
  }

  // 2. DD [de] MES [del] [YYYY] (tolerando "25de julio 1962" y "12 enero")
  const textMatch = clean.match(
    /^(\d{1,2})\s*(?:de\b\s*)?([a-z]+)(?:\s*(?:del?\b\s*)?(\d{4}))?$/i
  );
  if (textMatch) {
    const day = Number(textMatch[1]);
    const monthName = textMatch[2]!.toLowerCase();
    const month = SPANISH_MONTHS[monthName];
    if (month) {
      const explicitYear = textMatch[3] ? Number(textMatch[3]) : null;
      const year = explicitYear ?? fallbackYear;
      if (isValidYmd(year, month, day)) {
        return {
          iso: `${year}-${pad(month)}-${pad(day)}`,
          inferredYear: explicitYear === null,
        };
      }
    }
  }

  return null;
}

/**
 * Divide nombres de paciente provenientes de Word:
 * - Con coma: "HERRERA ROJAS, MARÍA STEPHANY" -> lastName + firstName
 * - Sin coma: "VERA HOYOS ALLISON" o "MARIA CRISTINA GOMEZ SIERRA"
 */
export function splitPatientFullName(rawName: string): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const clean = rawName.replace(/\s+/g, " ").trim().toUpperCase();
  if (!clean) {
    return { firstName: "", lastName: "", fullName: "" };
  }

  if (clean.includes(",")) {
    const [rawLast, ...rest] = clean.split(",");
    const lastName = (rawLast ?? "").trim();
    const firstName = rest.join(" ").trim();
    return {
      firstName: firstName || lastName,
      lastName: lastName || firstName,
      fullName: firstName && lastName ? `${lastName}, ${firstName}` : clean,
    };
  }

  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: parts[0]!, fullName: clean };
  }
  if (parts.length === 2) {
    return {
      firstName: parts[1]!,
      lastName: parts[0]!,
      fullName: `${parts[0]}, ${parts[1]}`,
    };
  }

  // Detectar formato Nombres Apellidos (ej. "MARIA CRISTINA GOMEZ SIERRA")
  if (COMMON_GIVEN_NAMES.has(parts[0]!) && parts.length >= 4) {
    const firstName = parts.slice(0, parts.length - 2).join(" ");
    const lastName = parts.slice(parts.length - 2).join(" ");
    return {
      firstName,
      lastName,
      fullName: `${lastName}, ${firstName}`,
    };
  }

  // Formato estándar peruano sin coma: "APELLIDO1 APELLIDO2 NOMBRE(S)"
  const lastName = parts.slice(0, 2).join(" ");
  const firstName = parts.slice(2).join(" ");
  return {
    firstName,
    lastName,
    fullName: `${lastName}, ${firstName}`,
  };
}

export function isBlankWordTemplate(fullText: string): boolean {
  const norm = fullText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/NOMBRE\s*:\s*X{3,}/i.test(norm)) return true;
  if (/H\.?\s*CLINICA\s*:\s*\(?\s*DNI\s*\)?/i.test(norm)) return true;
  if (/Dimensiones del cuerpo de utero\s*:\s*X{3,}/i.test(norm)) return true;
  if (/MOTIVO\s*:\s*X{3,}/i.test(norm) && /FECHA\s*:\s*X{2,}/i.test(norm)) {
    return true;
  }
  return false;
}

export function classifyWordStructure(
  structure: DocxStructure,
  fileName: string
): WordDocKind {
  if (isBlankWordTemplate(structure.fullText)) {
    return "EMPTY_TEMPLATE";
  }

  const norm = normalizeAsciiLower(structure.fullText);
  const normFile = normalizeAsciiLower(fileName);

  if (
    norm.includes("historia clinica") &&
    (norm.includes("datos del paciente") || norm.includes("dni"))
  ) {
    return "HISTORIA_CLINICA";
  }

  if (
    norm.includes("ecografia") ||
    norm.includes("h. clinica") ||
    norm.includes("miometrio:") ||
    norm.includes("bi-rads") ||
    norm.includes("birads") ||
    normFile.includes("eco")
  ) {
    return "ECOGRAFIA";
  }

  return "UNKNOWN";
}

function cleanLabelValue(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function extractInlineClinicalSections(rawBlob: string): {
  reasonText: string;
  illnessText: string;
  antecedentesBlock: string;
  examenFisicoBlock: string;
  ecoTvText: string;
  dxText: string;
  planText: string;
  furRaw: string;
  macRaw: string;
  papRaw: string;
  goRaw: string;
  rcRaw: string;
} {
  const lines = rawBlob
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  type BucketKey =
    | "narrative"
    | "antecedentes"
    | "examen"
    | "eco"
    | "dx"
    | "plan";

  const buckets: Record<BucketKey, string[]> = {
    narrative: [],
    antecedentes: [],
    examen: [],
    eco: [],
    dx: [],
    plan: [],
  };

  let currentBucket: BucketKey = "narrative";
  let furRaw = "";
  let macRaw = "";
  let papRaw = "";
  let goRaw = "";
  let rcRaw = "";

  for (const line of lines) {
    const norm = normalizeAsciiLower(line);

    if (/^(antecedentes\s*(personales|eprsonales)?|ant\.?\s*personales)\s*[:>]/i.test(norm)) {
      currentBucket = "antecedentes";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) buckets.antecedentes.push(val);
      continue;
    }
    if (/^(examen\s*fisico|ef)\s*[:>]?/i.test(norm) && norm.length < 40) {
      currentBucket = "examen";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val && !/^examen\s*fisico$/i.test(val)) buckets.examen.push(val);
      continue;
    }
    if (/^examen\s*fisico\s*[:>]/i.test(norm)) {
      currentBucket = "examen";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) buckets.examen.push(val);
      continue;
    }
    if (/^especuloscopia\s*[:>]/i.test(norm)) {
      currentBucket = "examen";
      buckets.examen.push(line);
      continue;
    }
    if (/^(eco\s*tv|ecografia(\s*tv)?|examenes?\s*realizados?)\s*[:>]/i.test(norm)) {
      currentBucket = "eco";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) buckets.eco.push(val);
      continue;
    }
    if (/^(dx|diagnosticos?)\s*[:>]/i.test(norm)) {
      currentBucket = "dx";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) buckets.dx.push(val);
      continue;
    }
    if (/^(plan(\s*de\s*trabajo)?|tratamiento|tt[o0])\s*[:>]/i.test(norm)) {
      currentBucket = "plan";
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) buckets.plan.push(val);
      continue;
    }

    // Extraer sub-etiquetas de antecedentes aunque estén sueltas
    const furM = line.match(/\bFUR\s*[:>]\s*(.+)$/i);
    if (furM && !furRaw) {
      furRaw = furM[1]!.trim();
    }
    const macM = line.match(/\bMAC\s*[:>]\s*(.+)$/i);
    if (macM && !macRaw) {
      macRaw = macM[1]!.trim();
    }
    const papM = line.match(/\bPAP\s*[:>]\s*(.+)$/i);
    if (papM && !papRaw) {
      papRaw = papM[1]!.trim();
    }
    const goM = line.match(/\b(?:GO|GP)\s*[:>]\s*(.+)$/i);
    if (goM && !goRaw) {
      goRaw = goM[1]!.trim();
    }
    const rcM = line.match(/\b(?:R\/C|RC)\s*[:>]\s*(.+)$/i);
    if (rcM && !rcRaw) {
      rcRaw = rcM[1]!.trim();
    }

    buckets[currentBucket].push(line);
  }

  return {
    reasonText: buckets.narrative[0] ?? "",
    illnessText: buckets.narrative.join("\n").trim(),
    antecedentesBlock: buckets.antecedentes.join("\n").trim(),
    examenFisicoBlock: buckets.examen.join("\n").trim(),
    ecoTvText: buckets.eco.join("\n").trim(),
    dxText: buckets.dx.join("\n").trim(),
    planText: buckets.plan.join("\n").trim(),
    furRaw,
    macRaw,
    papRaw,
    goRaw,
    rcRaw,
  };
}

function parseObstetricFormula(raw: string): string {
  const clean = raw.trim().toUpperCase();
  const gMatch = clean.match(/G(\d+)/);
  const pFullMatch = clean.match(/P(\d{4})/);
  const pShortMatch = clean.match(/P(\d+)/);
  if (gMatch && pFullMatch) {
    return `G${gMatch[1]} P${pFullMatch[1]}`;
  }
  if (gMatch && pShortMatch) {
    return `G${gMatch[1]} P${pShortMatch[1]!.padEnd(4, "0").slice(0, 4)}`;
  }
  return clean.slice(0, 30) || "G0 P0000";
}

function parseBackgroundFromText(params: {
  antecedentesText: string;
  familyText: string;
  narrativeFallbackText: string;
  fallbackYear: number;
  goRaw?: string;
  furRaw?: string;
  macRaw?: string;
  papRaw?: string;
  rcRaw?: string;
}): ParsedWordBackground {
  const combined = `${params.antecedentesText}\n${params.narrativeFallbackText}`;
  const normCombined = normalizeAsciiLower(combined);

  const bg: ParsedWordBackground = {
    obstetricFormula: "G0 P0000",
    catamenialRegimen: "",
    contraceptiveMethod: "Ninguno / No usa",
    lastMenstrualPeriod: "",
    papHistory: "",
    vphTestHistory: "",
    hasDiabetes: "Niega",
    hasHypertension: "Niega",
    hasAsthma: "Niega",
    medicalAllergies: "Niega",
    surgeriesHistory: "Niega",
    familyHistory: params.familyText.trim() || "Niega",
    otherPathologies: "Niega",
    stiHistory: "Niega",
    notes: "",
    menarche: null,
    sexualDebutAge: null,
    sexualPartnersCount: null,
  };

  const extraNotes: string[] = [];

  if (/niega\s+[^.\n]*\bdm\b/i.test(normCombined)) {
    bg.hasDiabetes = "Niega";
  } else {
    const dmMatch = combined.match(/\b(?:DM|Diabetes)\s*[:>]\s*([^\n.;]+)/i);
    if (dmMatch) bg.hasDiabetes = dmMatch[1]!.trim();
  }

  if (/niega\s+[^.\n]*\bhta\b/i.test(normCombined)) {
    bg.hasHypertension = "Niega";
  } else {
    const htaMatch = combined.match(/\b(?:HTA|Hipertensi[óo]n)\s*[:>]\s*([^\n.;]+)/i);
    if (htaMatch) bg.hasHypertension = htaMatch[1]!.trim();
  }

  if (/niega\s+[^.\n]*\basma\b/i.test(normCombined)) {
    bg.hasAsthma = "Niega";
  } else {
    const asmaMatch = combined.match(/\bAsma\s*[:>]\s*([^\n.;]+)/i);
    if (asmaMatch) bg.hasAsthma = asmaMatch[1]!.trim();
  }

  if (/niega\s+[^.\n]*\bram\b/i.test(normCombined)) {
    bg.medicalAllergies = "Niega";
  } else {
    const ramMatch = combined.match(/\b(?:RAM|Alergias?)\s*[:>]\s*([^\n.;]+)/i);
    if (ramMatch) bg.medicalAllergies = ramMatch[1]!.trim();
  }

  // Cirugías
  const qxLines = combined
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^QX\s*[:>]/i.test(l) || /mastectom[ií]a|quistectom[ií]a|ces[aá]rea|apendicectom[ií]a|miomectom[ií]a/i.test(l));
  const surgeriesCollected: string[] = [];
  for (const ql of qxLines) {
    const cleaned = ql.replace(/^QX\s*[:>]\s*/i, "").trim();
    if (cleaned && !/^niega$/i.test(cleaned)) {
      surgeriesCollected.push(cleaned);
    }
  }
  if (surgeriesCollected.length > 0) {
    bg.surgeriesHistory = surgeriesCollected.join("; ").slice(0, 480);
  }

  // Cáncer u otra patología crónica
  const caMatch = combined.match(/Ca\s+de\s+[^\n]+/i);
  if (caMatch) {
    bg.otherPathologies = caMatch[0]!.trim().slice(0, 480);
  }

  // GO / GP
  const goCandidate =
    params.goRaw ||
    combined.match(/\b(?:GO|GP)\s*[:>]\s*([^\n]+)/i)?.[1] ||
    "";
  if (goCandidate) {
    bg.obstetricFormula = parseObstetricFormula(goCandidate);
    if (goCandidate.length > 10) {
      extraNotes.push(`GO Word: ${goCandidate.trim()}`);
    }
  }

  // Régimen catamenial
  const rcCandidate =
    params.rcRaw ||
    combined.match(/\b(?:R\/C|RC)\s*[:>]\s*([^\n]+)/i)?.[1] ||
    "";
  if (rcCandidate) {
    bg.catamenialRegimen = rcCandidate.trim().slice(0, 40);
  }

  // MAC
  const macCandidate =
    params.macRaw ||
    combined.match(/\bMAC\s*[:>]\s*([^\n]+)/i)?.[1] ||
    "";
  if (macCandidate) {
    const mLower = normalizeAsciiLower(macCandidate);
    if (mLower === "niega" || mLower === "ninguno") {
      bg.contraceptiveMethod = "Ninguno / No usa";
    } else if (mLower.includes("psv") || mLower.includes("preservativo")) {
      bg.contraceptiveMethod = "Preservativo (PSV)";
    } else {
      bg.contraceptiveMethod = macCandidate.trim().slice(0, 140);
    }
  } else if (normCombined.includes("implante subdermico")) {
    bg.contraceptiveMethod = "Implante Subdérmico";
  }

  // FUR
  const furCandidate =
    params.furRaw ||
    combined.match(/\bFUR\s*[:>]\s*([^\n]+)/i)?.[1] ||
    "";
  if (furCandidate) {
    const parsedFur = parseSpanishDate(furCandidate.trim(), params.fallbackYear);
    if (parsedFur) {
      bg.lastMenstrualPeriod = parsedFur.iso;
    } else if (furCandidate.trim()) {
      extraNotes.push(`FUR registrado en Word: ${furCandidate.trim()}`);
    }
  }

  // PAP
  const papCandidate =
    params.papRaw ||
    combined.match(/\bPAP\s*[:>]\s*([^\n]+)/i)?.[1] ||
    "";
  if (papCandidate) {
    bg.papHistory = papCandidate.trim().slice(0, 280);
  }

  // Menarquia / IRS / NPS / ITS
  const menM = combined.match(/Menarquia\s*[:>]\s*(\d{1,2})/i);
  if (menM) {
    const n = Number(menM[1]);
    if (n >= 8 && n <= 22) bg.menarche = n;
  }
  const irsM = combined.match(/IRS\s*[:>]\s*(\d{1,2})/i);
  if (irsM) {
    const n = Number(irsM[1]);
    if (n >= 10 && n <= 45) bg.sexualDebutAge = n;
  }
  const npsM = combined.match(/NPS\s*[:>]\s*(\d{1,3})/i);
  if (npsM) {
    const n = Number(npsM[1]);
    if (n >= 0 && n <= 100) bg.sexualPartnersCount = n;
  }
  const itsM = combined.match(/\bITS\s*[:>]\s*([^\n]+)/i);
  if (itsM && itsM[1]!.trim()) {
    bg.stiHistory = itsM[1]!.trim().slice(0, 280);
  }

  if (extraNotes.length > 0) {
    bg.notes = extraNotes.join(" | ").slice(0, 950);
  }

  return bg;
}

function parseExamenFisico(raw: string): {
  generalExam: string;
  abdomenExam: string;
  bimanualPalpation: string;
  speculoscopy: string;
  externalGenitalia: string;
  bloodPressure: string;
  weightKg: number | null;
  heightCm: number | null;
} {
  const out = {
    generalExam: "",
    abdomenExam: "",
    bimanualPalpation: "",
    speculoscopy: "",
    externalGenitalia: "",
    bloodPressure: "",
    weightKg: null as number | null,
    heightCm: null as number | null,
  };

  if (!raw.trim()) return out;

  const paM = raw.match(/\bPA\s*[:>]\s*(\d{2,3}\/\d{2,3})/i);
  if (paM) out.bloodPressure = paM[1]!;
  const pesoM = raw.match(/\bPeso\s*[:>]\s*(\d+(?:[.,]\d+)?)/i);
  if (pesoM) {
    const w = Number(pesoM[1]!.replace(",", "."));
    if (w >= 25 && w <= 220) out.weightKg = w;
  }
  const tallaM = raw.match(/\bTalla\s*[:>]\s*(\d+(?:[.,]\d+)?)/i);
  if (tallaM) {
    let h = Number(tallaM[1]!.replace(",", "."));
    if (h > 1 && h < 2.5) h = Math.round(h * 100);
    if (h >= 100 && h <= 220) out.heightCm = h;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const generalLines: string[] = [];
  for (const line of lines) {
    const norm = normalizeAsciiLower(line);
    if (/^pa\s*[:>]/.test(norm) && norm.length < 18) continue;
    if (/^peso\s*[:>]/.test(norm) && norm.length < 18) continue;
    if (/^talla\s*[:>]/.test(norm) && norm.length < 18) continue;

    if (/^abdomen\s*[:>]/i.test(norm)) {
      const val = line.replace(/^abdomen\s*[:>]\s*/i, "").trim();
      if (val) out.abdomenExam = val;
    } else if (/^(tacto\s*vaginal|tv)\s*[:>]/i.test(norm)) {
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) out.bimanualPalpation = val;
    } else if (/^especuloscop[ií]a\s*[:>]/i.test(norm)) {
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) out.speculoscopy = val;
    } else if (/^genitales\s*externos\s*[:>]/i.test(norm)) {
      const val = line.replace(/^[^:>]+[:>]\s*/i, "").trim();
      if (val) out.externalGenitalia = val;
    } else {
      generalLines.push(line);
    }
  }

  out.generalExam = generalLines.join(" ").trim();
  return out;
}

/**
 * Parsea una Historia Clínica CENDO en Word (.docx), soportando los 3 estilos
 * reales usados por el Dr. Patrick (tabla completa, compacto en Datos y compacto en Motivo).
 */
export function parseWordHistoryDocx(
  structure: DocxStructure,
  fileName: string,
  fallbackYear: number
): ParsedWordHistoryResult {
  const warnings: string[] = [];
  if (isBlankWordTemplate(structure.fullText)) {
    return {
      kind: "EMPTY_TEMPLATE",
      fileName,
      styleLabel: "Plantilla vacía",
      documentNumber: "",
      firstName: "",
      lastName: "",
      fullName: "",
      birthDate: "",
      ageFromDoc: null,
      phone: "",
      civilStatus: "Soltera",
      educationLevel: "Superior completa",
      occupation: "",
      birthPlace: "",
      address: "",
      religion: "",
      background: {
        obstetricFormula: "G0 P0000",
        catamenialRegimen: "",
        contraceptiveMethod: "Ninguno / No usa",
        lastMenstrualPeriod: "",
        papHistory: "",
        vphTestHistory: "",
        hasDiabetes: "Niega",
        hasHypertension: "Niega",
        hasAsthma: "Niega",
        medicalAllergies: "Niega",
        surgeriesHistory: "Niega",
        familyHistory: "Niega",
        otherPathologies: "Niega",
        stiHistory: "Niega",
        notes: "",
        menarche: null,
        sexualDebutAge: null,
        sexualPartnersCount: null,
      },
      consultations: [],
      warnings: ["Archivo plantilla sin datos reales."],
      extractedText: structure.fullText,
    };
  }

  const mainRows: string[][] = [];
  const controlTablesRows: string[][] = [];
  let inControlsBlock = false;

  for (const block of structure.blocks) {
    if (block.kind === "paragraph") {
      if (/^controles?\b/i.test(normalizeAsciiLower(block.text))) {
        inControlsBlock = true;
      }
      continue;
    }
    if (!inControlsBlock) {
      mainRows.push(...block.rows);
    } else {
      controlTablesRows.push(...block.rows);
    }
  }

  // 1. Extraer filas de Filiación + Primera Consulta antes de "CONTROLES"
  let rawName = "";
  let rawAge = "";
  let rawDni = "";
  let rawBirthDate = "";
  let civilStatus = "";
  let educationLevel = "";
  let occupation = "";
  let birthPlace = "";
  let address = "";
  let religion = "";
  let phone = "";

  const sectionFields: Record<string, string> = {};
  const extraRowsAfterMain: string[][] = [];
  let reachedControlSection = false;

  for (const row of mainRows) {
    const c0 = cleanLabelValue(row[0] ?? "");
    const c1 = cleanLabelValue(row[1] ?? "");
    const c0Norm = normalizeAsciiLower(c0);

    if (c0Norm === "controles") {
      reachedControlSection = true;
      continue;
    }

    if (reachedControlSection) {
      extraRowsAfterMain.push(row);
      continue;
    }

    // Fila multi-línea donde etiqueta y valor están dentro de la misma celda (ej. FECHA: 14 de octubre)
    const inlineColon = c0.indexOf(":");
    const mergedCellText =
      row.length === 1 || (!c1 && inlineColon !== -1)
        ? cleanLabelValue(row.join("\n"))
        : "";

    if (c0Norm === "nombre") {
      rawName = c1;
    } else if (c0Norm === "edad") {
      rawAge = c1;
    } else if (c0Norm === "dni") {
      rawDni = c1;
    } else if (c0Norm === "fecha de nacimiento") {
      rawBirthDate = c1;
    } else if (c0Norm === "estado civil") {
      civilStatus = c1;
    } else if (c0Norm === "grado de instruccion") {
      educationLevel = c1;
    } else if (c0Norm === "ocupacion actual") {
      occupation = c1;
    } else if (c0Norm === "lugar de nacimiento") {
      birthPlace = c1;
    } else if (c0Norm === "direccion actual") {
      address = c1;
    } else if (c0Norm === "religion") {
      religion = c1;
    } else if (c0Norm === "telefono") {
      phone = c1;
    } else {
      const labelSource = c1 ? c0Norm : normalizeAsciiLower(c0.split("\n")[0] ?? "");
      const valueSource = c1 || mergedCellText.replace(/^[^:\n]+:\s*/i, "").trim();

      if (labelSource.startsWith("fecha")) {
        const val = c1
          ? c1
          : c0.replace(/^fecha\s*:\s*/i, "").trim();
        sectionFields.fecha = val;
      } else if (labelSource.startsWith("motivo de consulta")) {
        sectionFields.motivo = c1
          ? c1
          : c0.replace(/^motivo de consulta\s*:\s*/i, "").trim();
      } else if (labelSource.startsWith("datos de la enfermedad")) {
        sectionFields.datos = c1
          ? c1
          : c0.replace(/^datos de la enfermedad\s*:\s*/i, "").trim();
      } else if (labelSource.startsWith("funciones biologicas")) {
        sectionFields.funciones = valueSource;
      } else if (labelSource.startsWith("antecedentes personales")) {
        sectionFields.antecedentes = valueSource;
      } else if (labelSource.startsWith("antecedentes familiares")) {
        sectionFields.familiares = valueSource;
      } else if (labelSource.startsWith("examen fisico")) {
        sectionFields.examen = valueSource;
      } else if (labelSource.startsWith("examenes realizados")) {
        sectionFields.examenes = valueSource;
      } else if (labelSource.startsWith("diagnosticos")) {
        sectionFields.diagnosticos = valueSource;
      } else if (labelSource.startsWith("plan de trabajo")) {
        sectionFields.plan = valueSource;
      } else if (labelSource.startsWith("tratamiento")) {
        sectionFields.tratamiento = valueSource;
      }
    }
  }

  // DNI limpio (8-12 dígitos/alfanuméricos)
  const cleanDni = rawDni.replace(/\s+/g, "").toUpperCase();
  const dniDigits = cleanDni.match(/\d{8}/)?.[0] ?? cleanDni;
  if (!dniDigits) {
    warnings.push("No se detectó DNI en el documento Word; ingréselo manualmente.");
  }

  // Nombre separado
  const splitName = splitPatientFullName(rawName);
  if (!splitName.firstName || !splitName.lastName) {
    warnings.push("Verifique los nombres y apellidos de la paciente.");
  }

  // Edad y fecha de nacimiento (incluyendo rescate desde Lugar de nacimiento si aplica)
  const ageMatch = rawAge.match(/\d+/);
  const ageFromDoc = ageMatch ? Number(ageMatch[0]) : null;
  let birthDateIso = "";

  if (rawBirthDate.trim()) {
    const parsedBd = parseSpanishDate(rawBirthDate, fallbackYear);
    if (parsedBd && !parsedBd.inferredYear) {
      birthDateIso = parsedBd.iso;
    } else {
      warnings.push(
        `No se pudo interpretar la fecha de nacimiento "${rawBirthDate}".`
      );
    }
  } else if (birthPlace.trim()) {
    const rescuedBd = parseSpanishDate(birthPlace.trim(), fallbackYear);
    if (rescuedBd && !rescuedBd.inferredYear) {
      birthDateIso = rescuedBd.iso;
      birthPlace = "";
      warnings.push(
        `Fecha de nacimiento (${rescuedBd.iso}) rescatada desde "Lugar de nacimiento".`
      );
    }
  }

  if (!birthDateIso) {
    warnings.push(
      ageFromDoc
        ? `Sin fecha de nacimiento en Word (edad registrada: ${ageFromDoc} años). Puede completarla aquí o dejarla en blanco.`
        : "Sin fecha de nacimiento en Word."
    );
  }

  // Teléfono limpio
  const cleanPhone = phone.replace(/[^\d+]/g, "").trim();
  if (!cleanPhone) {
    warnings.push("Sin teléfono registrado en Word.");
  }

  const hasRealMainClinicalData = Boolean(
    sectionFields.fecha?.trim() ||
      sectionFields.motivo?.trim() ||
      sectionFields.datos?.trim() ||
      sectionFields.antecedentes?.trim() ||
      sectionFields.examen?.trim() ||
      sectionFields.examenes?.trim() ||
      sectionFields.diagnosticos?.trim() ||
      sectionFields.plan?.trim() ||
      sectionFields.tratamiento?.trim()
  );

  // 2. Detectar estilo de llenado (A: filas separadas, B: todo en Datos, C: todo en Motivo)
  const hasSeparateClinicalRows = Boolean(
    sectionFields.antecedentes ||
      sectionFields.examen ||
      sectionFields.diagnosticos ||
      sectionFields.plan ||
      sectionFields.tratamiento
  );

  let styleLabel = "Estilo Completo";
  let motivoFinal = sectionFields.motivo ?? "";
  let datosFinal = sectionFields.datos ?? "";
  let antecedentesText = sectionFields.antecedentes ?? "";
  let examenText = sectionFields.examen ?? "";
  let examenesAuxText = sectionFields.examenes ?? "";
  let dxText = sectionFields.diagnosticos ?? "";
  let planCombined = [sectionFields.plan, sectionFields.tratamiento]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("\n");

  let furRaw = "";
  let macRaw = "";
  let papRaw = "";
  let goRaw = "";
  let rcRaw = "";

  if (!hasSeparateClinicalRows) {
    if (datosFinal && !motivoFinal) {
      styleLabel = "Estilo Compacto (Datos)";
    } else if (motivoFinal && !datosFinal) {
      styleLabel = "Estilo Compacto (Motivo)";
    } else {
      styleLabel = "Estilo Compacto";
    }

    const blob = [motivoFinal, datosFinal].filter(Boolean).join("\n");
    const extracted = extractInlineClinicalSections(blob);
    motivoFinal =
      sectionFields.motivo?.split("\n")[0]?.trim() ||
      extracted.reasonText ||
      "Atención ginecológica";
    datosFinal = extracted.illnessText || blob;
    antecedentesText = extracted.antecedentesBlock;
    examenText = extracted.examenFisicoBlock;
    examenesAuxText = extracted.ecoTvText;
    dxText = extracted.dxText;
    planCombined = extracted.planText;
    furRaw = extracted.furRaw;
    macRaw = extracted.macRaw;
    papRaw = extracted.papRaw;
    goRaw = extracted.goRaw;
    rcRaw = extracted.rcRaw;
  } else {
    // Estilo completo: revisar si datosFinal también trae algo y limpiar motivo multiline
    const reasonLines = motivoFinal
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (reasonLines.length > 1 && !datosFinal) {
      datosFinal = reasonLines.join("\n");
      motivoFinal = reasonLines[0]!;
    } else if (reasonLines.length > 1) {
      datosFinal = `${reasonLines.slice(1).join("\n")}\n${datosFinal}`.trim();
      motivoFinal = reasonLines[0]!;
    }
  }

  // 3. Antecedentes estructurados
  const background = parseBackgroundFromText({
    antecedentesText,
    familyText: sectionFields.familiares ?? "",
    narrativeFallbackText: [motivoFinal, datosFinal].filter(Boolean).join("\n"),
    fallbackYear,
    goRaw,
    furRaw,
    macRaw,
    papRaw,
    rcRaw,
  });

  // 4. Primera consulta
  const rawMainDate = sectionFields.fecha ?? "";
  const parsedMainDate = rawMainDate
    ? parseSpanishDate(rawMainDate, fallbackYear)
    : null;
  const fallbackIso = `${fallbackYear}-01-01`;

  if (!rawMainDate) {
    warnings.push(
      `Consulta principal sin fecha en Word (revisar fecha antes de importar).`
    );
  } else if (parsedMainDate?.inferredYear) {
    warnings.push(
      `Fecha "${rawMainDate}" sin año explícito (se asumió ${fallbackYear}).`
    );
  } else if (rawMainDate && !parsedMainDate) {
    warnings.push(`No se pudo parsear fecha "${rawMainDate}".`);
  }

  const parsedExam = parseExamenFisico(examenText);
  const consultations: ParsedWordConsultation[] = [];

  if (hasRealMainClinicalData) {
    consultations.push({
      consultationDate: parsedMainDate?.iso ?? fallbackIso,
      inferredYear: !parsedMainDate || parsedMainDate.inferredYear,
      isControl: false,
      reasonForVisit: motivoFinal || "Control ginecológico",
      symptoms: datosFinal || motivoFinal || "Evaluación ginecológica",
      generalExam:
        parsedExam.generalExam ||
        "Lúcida, orientada, en aparente regular estado general.",
      speculoscopy: parsedExam.speculoscopy,
      bimanualPalpation: parsedExam.bimanualPalpation,
      externalGenitalia: parsedExam.externalGenitalia,
      abdomenExam: parsedExam.abdomenExam,
      bloodPressure: parsedExam.bloodPressure,
      weightKg: parsedExam.weightKg,
      heightCm: parsedExam.heightCm,
      auxiliaryExams: examenesAuxText,
      diagnosis: dxText || motivoFinal || "Evaluación ginecológica",
      cie10Code: "",
      treatmentPlan: planCombined || "Seguimiento clínico",
      prescriptionNotes: sectionFields.tratamiento ?? "",
    });
  }

  // 5. Controles subsecuentes (tablas de CONTROLES)
  const allControlRows = [...extraRowsAfterMain, ...controlTablesRows];
  const controlGroups: Array<string[][]> = [];
  let activeGroup: string[][] = [];

  for (const r of allControlRows) {
    const firstCellNorm = normalizeAsciiLower(r[0] ?? "");
    if (firstCellNorm.startsWith("fecha")) {
      if (activeGroup.length > 0) controlGroups.push(activeGroup);
      activeGroup = [r];
    } else {
      activeGroup.push(r);
    }
  }
  if (activeGroup.length > 0) controlGroups.push(activeGroup);

  for (const grp of controlGroups) {
    let ctrlDateRaw = "";
    const evoLines: string[] = [];
    let ctrlExamen = "";
    let ctrlDx = "";
    let ctrlPlan = "";
    let ctrlTrat = "";

    for (const row of grp) {
      const c0 = cleanLabelValue(row[0] ?? "");
      const c1 = cleanLabelValue(row[1] ?? "");
      const norm0 = normalizeAsciiLower(c0);

      if (norm0.startsWith("fecha")) {
        ctrlDateRaw = c1 || c0.replace(/^fecha\s*:\s*/i, "").trim();
      } else if (norm0.startsWith("evolucion")) {
        const val = c1 || c0.replace(/^evoluci[oó]n\s*:\s*/i, "").trim();
        if (val) evoLines.push(val);
      } else if (norm0.startsWith("examen fisico")) {
        ctrlExamen = c1 || c0.replace(/^examen\s*f[ií]sico\s*:\s*/i, "").trim();
      } else if (norm0.startsWith("diagnosticos")) {
        ctrlDx = c1 || c0.replace(/^diagn[oó]sticos\s*:\s*/i, "").trim();
      } else if (norm0.startsWith("plan de trabajo")) {
        ctrlPlan = c1 || c0.replace(/^plan de trabajo\s*:\s*/i, "").trim();
      } else if (norm0.startsWith("tratamiento")) {
        ctrlTrat = c1 || c0.replace(/^tratamiento\s*:\s*/i, "").trim();
      } else {
        const anyText = row.map((c) => c.trim()).filter(Boolean).join("\n");
        if (anyText) evoLines.push(anyText);
      }
    }

    const combinedEvo = evoLines.join("\n").trim();
    if (!ctrlDateRaw && !combinedEvo && !ctrlExamen && !ctrlDx && !ctrlPlan && !ctrlTrat) {
      continue; // Control completamente vacío (como en estilo compacto)
    }

    const parsedCtrlDate = ctrlDateRaw
      ? parseSpanishDate(ctrlDateRaw, fallbackYear)
      : null;
    if (parsedCtrlDate?.inferredYear) {
      warnings.push(
        `Control "${ctrlDateRaw}" sin año explícito (se asumió ${fallbackYear}).`
      );
    }

    // Si en evolución viene bloque compacto (como Vera Hoyos control 12 de agosto)
    let ctrlSymptoms = combinedEvo;
    let ctrlReason = "Control ginecológico";
    let finalCtrlExam = ctrlExamen;
    let finalCtrlDx = ctrlDx;
    let finalCtrlPlan = [ctrlPlan, ctrlTrat].filter(Boolean).join("\n");

    if (!ctrlExamen && !ctrlDx && !ctrlPlan && combinedEvo) {
      const inlineCtrl = extractInlineClinicalSections(combinedEvo);
      ctrlReason = inlineCtrl.reasonText || "Control ginecológico";
      ctrlSymptoms = inlineCtrl.illnessText || combinedEvo;
      finalCtrlExam = inlineCtrl.examenFisicoBlock;
      finalCtrlDx = inlineCtrl.dxText;
      finalCtrlPlan = inlineCtrl.planText;
    } else if (combinedEvo) {
      ctrlReason = combinedEvo.split("\n")[0]?.slice(0, 140) || "Control ginecológico";
    }

    const parsedCtrlEx = parseExamenFisico(finalCtrlExam);
    consultations.push({
      consultationDate: parsedCtrlDate?.iso ?? fallbackIso,
      inferredYear: !parsedCtrlDate || parsedCtrlDate.inferredYear,
      isControl: true,
      reasonForVisit: `Control — ${ctrlReason}`.slice(0, 220),
      symptoms: ctrlSymptoms || ctrlReason,
      generalExam: parsedCtrlEx.generalExam || "Paciente en control evolutivo.",
      speculoscopy: parsedCtrlEx.speculoscopy,
      bimanualPalpation: parsedCtrlEx.bimanualPalpation,
      externalGenitalia: parsedCtrlEx.externalGenitalia,
      abdomenExam: parsedCtrlEx.abdomenExam,
      bloodPressure: parsedCtrlEx.bloodPressure,
      weightKg: parsedCtrlEx.weightKg,
      heightCm: parsedCtrlEx.heightCm,
      auxiliaryExams: "",
      diagnosis: finalCtrlDx || ctrlReason || "Control evolutivo",
      cie10Code: "",
      treatmentPlan: finalCtrlPlan || "Seguimiento según evolución.",
      prescriptionNotes: ctrlTrat,
    });
  }

  return {
    kind: "HISTORIA_CLINICA",
    fileName,
    styleLabel,
    documentNumber: dniDigits,
    firstName: splitName.firstName,
    lastName: splitName.lastName,
    fullName: splitName.fullName,
    birthDate: birthDateIso,
    ageFromDoc,
    phone: cleanPhone,
    civilStatus: civilStatus || "Soltera",
    educationLevel: educationLevel || "Superior completa",
    occupation,
    birthPlace,
    address,
    religion,
    background,
    consultations,
    warnings,
    extractedText: structure.fullText,
  };
}

/**
 * Parsea un informe de Ecografía en Word (.docx) de CENDO.
 */
export function parseWordUltrasoundDocx(
  structure: DocxStructure,
  fileName: string,
  fallbackYear: number
): ParsedWordUltrasoundResult {
  const warnings: string[] = [];
  if (isBlankWordTemplate(structure.fullText)) {
    return {
      kind: "EMPTY_TEMPLATE",
      fileName,
      patientDocumentNumber: "",
      patientFullName: "",
      reportDate: "",
      inferredYear: false,
      ultrasoundType: "TRANSVAGINAL",
      indication: "",
      findings: {},
      conclusion: "",
      recommendations: "",
      warnings: ["Plantilla de ecografía vacía (XXXXXXXXXX) omitida."],
      extractedText: structure.fullText,
    };
  }

  const lines = structure.paragraphs
    .flatMap((p) => p.split(/\r?\n/))
    .map((l) => l.trim())
    .filter(Boolean);

  const normFull = normalizeAsciiLower(structure.fullText);

  let ultrasoundType: UltrasoundType = "TRANSVAGINAL";
  if (normFull.includes("mama")) {
    ultrasoundType = "MAMA_BILATERAL";
  } else if (normFull.includes("genetica") || normFull.includes("translucencia")) {
    ultrasoundType = "OBSTETRICA_GENETICA";
  } else if (normFull.includes("morfologica")) {
    ultrasoundType = "OBSTETRICA_MORFOLOGICA";
  } else if (normFull.includes("obstetrica") || normFull.includes("trimestre")) {
    ultrasoundType =
      normFull.includes("i trimestre") || normFull.includes("primer trimestre")
        ? "OBSTETRICA_1T"
        : "OBSTETRICA_2T_3T";
  } else if (
    lines[0] &&
    normalizeAsciiLower(lines[0]).includes("doppler")
  ) {
    ultrasoundType = "DOPPLER";
  } else if (
    normFull.includes("pelvica") &&
    !normFull.includes("transvaginal")
  ) {
    ultrasoundType = "PELVICA";
  }

  let patientFullName = "";
  let referringDoctor = "";
  let rawDni = "";
  let rawDate = "";
  let reason = "";

  for (const line of lines.slice(0, 15)) {
    const mName = line.match(/^NOMBRE\s*:\s*(.+)$/i);
    if (mName) patientFullName = mName[1]!.trim().toUpperCase();

    const mInd = line.match(/^INDICACI[OÓ]N\s*:\s*(.+)$/i);
    if (mInd) referringDoctor = mInd[1]!.trim();

    const mHc = line.match(/^H\.?\s*CL[IÍ]NICA\s*:\s*(.+)$/i);
    if (mHc) rawDni = mHc[1]!.trim();

    const mFecha = line.match(/^FECHA\s*:\s*(.+)$/i);
    if (mFecha) rawDate = mFecha[1]!.trim();

    const mMot = line.match(/^MOTIVO\s*:\s*(.+)$/i);
    if (mMot) reason = mMot[1]!.trim();
  }

  if (
    /^X{3,}$/i.test(patientFullName.replace(/\s+/g, "")) ||
    /^\(?\s*DNI\s*\)?$/i.test(rawDni.trim())
  ) {
    return {
      kind: "EMPTY_TEMPLATE",
      fileName,
      patientDocumentNumber: "",
      patientFullName: "",
      reportDate: "",
      inferredYear: false,
      ultrasoundType: "TRANSVAGINAL",
      indication: "",
      findings: {},
      conclusion: "",
      recommendations: "",
      warnings: ["Plantilla de ecografía vacía (XXXXXXXXXX) omitida."],
      extractedText: structure.fullText,
    };
  }

  const dniMatch = rawDni.match(/\d{6,12}/)?.[0] ?? rawDni.replace(/[^A-Z0-9]/gi, "");
  if (!dniMatch) {
    warnings.push("No se detectó DNI en 'H. CLINICA'; seleccione paciente manualmente.");
  }

  const parsedDate = rawDate ? parseSpanishDate(rawDate, fallbackYear) : null;
  if (!parsedDate) {
    warnings.push(`Fecha "${rawDate || "vacía"}" no reconocida; usando ${fallbackYear}-01-01.`);
  }

  const findings: UltrasoundFindingsRecord = {};
  if (referringDoctor) findings.referringDoctor = referringDoctor;

  // Extraer sección CONCLUSIÓN
  const conclusionIdx = lines.findIndex((l) =>
    /^CONCLUSI[OÓ]N(?:ES)?\s*:?$/i.test(normalizeAsciiLower(l))
  );
  const bodyLines =
    conclusionIdx !== -1 ? lines.slice(0, conclusionIdx) : lines;
  const rawConclusionLines =
    conclusionIdx !== -1 ? lines.slice(conclusionIdx + 1) : [];

  const conclusionCleaned: string[] = [];
  const recLines: string[] = [];
  for (const cl of rawConclusionLines) {
    const normCl = normalizeAsciiLower(cl);
    if (
      normCl.startsWith("atentamente") ||
      normCl.startsWith("dr.") ||
      normCl.startsWith("ginecologo") ||
      normCl.startsWith("cmp ") ||
      normCl.startsWith("bi - rads:") ||
      normCl.startsWith("bi-rads:") ||
      normCl.startsWith("tipo de mama segun") ||
      /^_+$/.test(cl)
    ) {
      if (normCl.startsWith("atentamente")) break;
      continue;
    }

    if (/^birads\s*(\d[a-c]?)/i.test(normCl)) {
      const bMatch = cl.match(/(\d[A-C]?)/i);
      if (bMatch) findings.biradsCategory = `BI-RADS ${bMatch[1]!.toUpperCase()}`;
    }
    if (normCl.includes("se sugiere") || normCl.includes("control en")) {
      recLines.push(cl);
    }
    conclusionCleaned.push(cl);
  }

  const bodyText = bodyLines.join("\n");

  if (ultrasoundType === "MAMA_BILATERAL") {
    const acrM = bodyText.match(/tipo\s*[-–]?\s*([A-D])\b/i);
    if (acrM) {
      findings.breastAcrType = `Tipo ${acrM[1]!.toUpperCase()}` as UltrasoundFindingsRecord["breastAcrType"];
    }
    const mdIdx = lines.findIndex((l) => /^MAMA DERECHA\s*:?/i.test(l));
    const miIdx = lines.findIndex((l) => /^MAMA IZQUIERDA\s*:?/i.test(l));
    const compIdx = lines.findIndex((l) => /^COMPLEMENTO\s*:?/i.test(l));

    if (mdIdx !== -1) {
      const endMd =
        miIdx !== -1 ? miIdx : compIdx !== -1 ? compIdx : bodyLines.length;
      findings.rightBreastFindings = lines.slice(mdIdx + 1, endMd).join(" ").trim();
    }
    if (miIdx !== -1) {
      const endMi = compIdx !== -1 ? compIdx : bodyLines.length;
      findings.leftBreastFindings = lines.slice(miIdx + 1, endMi).join(" ").trim();
    }
    if (compIdx !== -1) {
      findings.breastComplement = lines
        .slice(compIdx + 1, bodyLines.length)
        .join(" ")
        .trim();
    }
    if (!findings.rightBreastFindings && !findings.leftBreastFindings) {
      findings.breastPattern = bodyLines
        .filter((l) => !/^(ECOGRAF|NOMBRE|EDAD|INDICAC|H\.|FECHA|MOTIVO|INFORME)/i.test(l))
        .join("\n");
    }
    if (!findings.biradsCategory) {
      findings.biradsCategory = normFull.includes("sin signos ecograficos")
        ? "BI-RADS 1"
        : "BI-RADS 2";
    }
  } else {
    // Parseo estructurado Pélvica / Transvaginal
    let section: "NONE" | "UTERO" | "OD" | "OI" = "NONE";
    const odNotes: string[] = [];
    const oiNotes: string[] = [];

    for (const line of bodyLines) {
      const normLine = normalizeAsciiLower(line);
      if (/^[uú]tero\s*:?$/i.test(normLine)) {
        section = "UTERO";
        continue;
      }
      if (/^ovario derecho\s*:?$/i.test(normLine)) {
        section = "OD";
        continue;
      }
      if (/^ovario izquierdo\s*:?$/i.test(normLine)) {
        section = "OI";
        continue;
      }

      if (section === "UTERO") {
        if (/dimensiones del cuerpo/i.test(normLine)) {
          const val = line.replace(/^[^:]+:\s*/, "").trim();
          findings.uterusDimensions = val;
          const vol = calculateEllipsoidVolumeCc(val);
          if (vol !== null) findings.uterusVolumeCc = vol;
        } else if (normLine.includes("anteverso")) {
          findings.uterusPosition = "AVF";
        } else if (normLine.includes("retroverso")) {
          findings.uterusPosition = "RVF";
        } else if (/^miometrio\s*:/i.test(normLine)) {
          findings.myometriumStatus = line.replace(/^miometrio\s*:\s*/i, "").trim();
        } else if (/^endometrio\s*:/i.test(normLine)) {
          const mmM = line.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
          if (mmM) findings.endometriumThicknessMm = Number(mmM[1]!.replace(",", "."));
          if (normLine.includes("trilaminar")) findings.endometriumPattern = "Trilaminar";
          else if (normLine.includes("secretor")) findings.endometriumPattern = "Secretor";
          else if (normLine.includes("atrófico") || normLine.includes("atrofico")) {
            findings.endometriumPattern = "Atrófico";
          }
        } else if (/^c[eé]rvix\s*:/i.test(normLine)) {
          const cxM = line.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
          if (cxM) findings.cervixLengthMm = Number(cxM[1]!.replace(",", "."));
          findings.cervixStatus = line.replace(/^c[eé]rvix\s*:\s*/i, "").trim();
        } else if (normLine.includes("dolor a la ecopuls")) {
          findings.uterusEcopulsionPain = line;
        }
      } else if (section === "OD") {
        if (/^dimensiones\s*:/i.test(normLine)) {
          const val = line.replace(/^dimensiones\s*:\s*/i, "").trim();
          findings.rightOvaryDimensions = val;
          const vol = calculateEllipsoidVolumeCc(val);
          if (vol !== null) findings.rightOvaryVolumeCc = vol;
        } else if (normLine.includes("liquido peri")) {
          findings.periOvarianFluid = line;
        } else if (normLine.includes("dolor a la ecopuls")) {
          findings.ovaryEcopulsionPain = line;
        } else {
          odNotes.push(line);
        }
      } else if (section === "OI") {
        if (/^dimensiones\s*:/i.test(normLine)) {
          const val = line.replace(/^dimensiones\s*:\s*/i, "").trim();
          findings.leftOvaryDimensions = val;
          const vol = calculateEllipsoidVolumeCc(val);
          if (vol !== null) findings.leftOvaryVolumeCc = vol;
        } else if (!normLine.includes("liquido") && !normLine.includes("ecopuls")) {
          oiNotes.push(line);
        }
      }

      if (/^fondo de saco de douglas\s*:/i.test(normLine)) {
        findings.douglasPouch = line
          .replace(/^fondo de saco de douglas\s*:\s*/i, "")
          .trim();
      }
    }

    if (odNotes.length > 0 || oiNotes.length > 0) {
      findings.ovariesNotes = [
        odNotes.length > 0 ? `OD: ${odNotes.join(" ")}` : "",
        oiNotes.length > 0 ? `OI: ${oiNotes.join(" ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
  }

  return {
    kind: "ECOGRAFIA",
    fileName,
    patientDocumentNumber: dniMatch,
    patientFullName,
    reportDate: parsedDate?.iso ?? `${fallbackYear}-01-01`,
    inferredYear: !parsedDate || parsedDate.inferredYear,
    ultrasoundType,
    indication: reason || "Evaluación ecográfica",
    findings,
    conclusion:
      conclusionCleaned.join("\n").trim() ||
      "Estudio ecográfico importado desde Word.",
    recommendations:
      recLines.join(" ").trim() || "Correlación clínica y control médico.",
    warnings,
    extractedText: structure.fullText,
  };
}
