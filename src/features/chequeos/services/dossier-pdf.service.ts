import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { db } from "@/db";
import {
  clinicalCheckups,
  clinics,
  colposcopyReports,
  patientBackgrounds,
  patientDocuments,
  patients,
  profiles,
  ultrasoundReports,
} from "@/db/schema";
import { detectVerifiedImageType } from "@/features/configuracion/configuracion.schema";
import {
  classifyColposcopyFindings,
  type ColposcopyReportItem,
} from "@/features/colposcopia/colposcopia.schema";
import { mapColposcopyRow } from "@/features/colposcopia/services/colposcopia.service";
import {
  ULTRASOUND_TYPE_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import { mapUltrasoundRow } from "@/features/ecografias/services/ecografias.service";
import { DomainError } from "@/lib/security/action-guard";
import { downloadPrivateStorageObject } from "@/lib/supabase/storage";
import { formatPeruDateDisplay } from "@/lib/utils";
import {
  normalizeDossierConfig,
  type ClinicalCheckupItem,
} from "../chequeos.schema";
import {
  assertDossierRefsBelongToPatient,
  mapCheckupRow,
} from "./chequeos.service";

const PAGE_W = 595.28; // A4 portrait width (pt)
const PAGE_H = 841.89; // A4 portrait height (pt)
const MARGIN_X = 40;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const SIGNATURE_BLOCK_HEIGHT = 104;

// Paleta institucional CENDO en puntos RGB (0..1)
const C_PRIMARY = rgb(6 / 255, 64 / 255, 89 / 255); // #064059
const C_WARNING = rgb(235 / 255, 164 / 255, 25 / 255); // #EBA419
const C_TEXT = rgb(11 / 255, 27 / 255, 36 / 255);
const C_MUTED = rgb(82 / 255, 104 / 255, 117 / 255);
const C_BORDER = rgb(213 / 255, 224 / 255, 229 / 255);
const C_BG_SOFT = rgb(244 / 255, 248 / 255, 250 / 255);
const C_BG_WARN = rgb(254 / 255, 249 / 255, 235 / 255);
const C_BG_ALERT = rgb(254 / 255, 242 / 255, 242 / 255);
const C_ALERT = rgb(185 / 255, 28 / 255, 28 / 255);
const C_SUCCESS = rgb(21 / 255, 128 / 255, 61 / 255);
const C_WHITE = rgb(1, 1, 1);

/**
 * Sanitiza cualquier texto a caracteres compatibles con WinAnsi (StandardFonts.Helvetica)
 * evitando errores de codificación en runtime con pdf-lib.
 */
function sanitizeWinAnsi(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const replaced = String(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[✓✔]/g, "[X]")
    .replace(/☐/g, "[ ]")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/×/g, "x")
    .replace(/[–—−]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/→/g, "->");

  let out = "";
  for (const ch of replaced) {
    const cp = ch.codePointAt(0) ?? 0;
    if (
      cp === 0x0a ||
      cp === 0x2022 || // •
      (cp >= 0x20 && cp <= 0x7e) ||
      (cp >= 0xa0 && cp <= 0xff)
    ) {
      out += ch;
    } else if (cp > 0xff) {
      out += " ";
    }
  }
  return out;
}

function wrapText(
  rawText: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const safe = sanitizeWinAnsi(rawText);
  const paragraphs = safe.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
          current = word;
        } else {
          // Partir palabra muy larga para que no desborde el margen
          let chunk = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, fontSize) <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

async function embedImageSafe(
  pdfDoc: PDFDocument,
  bytes: Uint8Array
): Promise<PDFImage | null> {
  try {
    const detected = detectVerifiedImageType(bytes);
    if (!detected) return null;
    if (detected.ext === "png") {
      return await pdfDoc.embedPng(bytes);
    }
    if (detected.ext === "jpg") {
      return await pdfDoc.embedJpg(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

function formatDoctorDisplayName(rawName: string): string {
  const clean = rawName.trim();
  if (/^(dr\.?|dra\.?|lic\.?|obs\.?)\s+/i.test(clean)) {
    return clean.toUpperCase();
  }
  return `DR. ${clean}`.toUpperCase();
}

interface DoctorMeta {
  id: string;
  name: string;
  specialty: string;
  cmp: string;
  rne: string;
  signatureImage: PDFImage | null;
}

interface SharedBrandAssets {
  pdfDoc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  membreteImg: PDFImage | null;
  cenefaImg: PDFImage | null;
  footerHeight: number;
  footerSafeY: number;
  clinicAddress: string;
  clinicEmail: string;
  clinicPhone: string;
}

function drawHeaderAndFooterOnPage(
  page: PDFPage,
  assets: SharedBrandAssets,
  options?: {
    badgeText?: string;
    codeText?: string;
    dateText?: string;
  }
): number {
  const { fontRegular, fontBold, membreteImg, cenefaImg } = assets;

  // Footer cenefa a todo ancho al pie
  if (cenefaImg) {
    page.drawImage(cenefaImg, {
      x: 0,
      y: 0,
      width: PAGE_W,
      height: assets.footerHeight,
    });
  } else {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: 36,
      color: C_PRIMARY,
    });
  }

  // Membrete superior izquierdo
  if (membreteImg) {
    const imgW = (membreteImg.width / membreteImg.height) * 42;
    page.drawImage(membreteImg, {
      x: MARGIN_X - 4,
      y: PAGE_H - 58,
      width: imgW,
      height: 42,
    });
  } else {
    page.drawText("CENDO • CENTRO DE ENDOMETRIOSIS", {
      x: MARGIN_X,
      y: PAGE_H - 42,
      size: 13,
      font: fontBold,
      color: C_PRIMARY,
    });
  }

  // Metadatos del documento arriba derecha
  if (options?.badgeText) {
    const badge = sanitizeWinAnsi(options.badgeText);
    const badgeW = fontBold.widthOfTextAtSize(badge, 8) + 14;
    page.drawRectangle({
      x: PAGE_W - MARGIN_X - badgeW,
      y: PAGE_H - 36,
      width: badgeW,
      height: 15,
      color: C_BG_SOFT,
      borderColor: C_PRIMARY,
      borderWidth: 0.6,
    });
    page.drawText(badge, {
      x: PAGE_W - MARGIN_X - badgeW + 7,
      y: PAGE_H - 31.5,
      size: 8,
      font: fontBold,
      color: C_PRIMARY,
    });
  }

  if (options?.codeText) {
    const code = sanitizeWinAnsi(options.codeText);
    const w = fontRegular.widthOfTextAtSize(code, 8);
    page.drawText(code, {
      x: PAGE_W - MARGIN_X - w,
      y: PAGE_H - 48,
      size: 8,
      font: fontRegular,
      color: C_MUTED,
    });
  }

  if (options?.dateText) {
    const dateStr = sanitizeWinAnsi(options.dateText);
    const w = fontBold.widthOfTextAtSize(dateStr, 8.5);
    page.drawText(dateStr, {
      x: PAGE_W - MARGIN_X - w,
      y: PAGE_H - 59,
      size: 8.5,
      font: fontBold,
      color: C_TEXT,
    });
  }

  // Línea separadora institucional
  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_H - 68 },
    end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 68 },
    thickness: 1.2,
    color: C_PRIMARY,
  });

  return PAGE_H - 84;
}

function drawSignatureBlock(
  page: PDFPage,
  assets: SharedBrandAssets,
  doctor: DoctorMeta,
  showDigitalSignature: boolean,
  topY: number
): void {
  const { fontRegular, fontBold } = assets;
  const centerX = PAGE_W - MARGIN_X - 115;

  const salutation = "Atentamente";
  page.drawText(salutation, {
    x: centerX - fontRegular.widthOfTextAtSize(salutation, 9) / 2,
    y: topY - 10,
    size: 9,
    font: fontRegular,
    color: C_MUTED,
  });

  if (showDigitalSignature && doctor.signatureImage) {
    const dims = doctor.signatureImage.scaleToFit(120, 46);
    page.drawImage(doctor.signatureImage, {
      x: centerX - dims.width / 2,
      y: topY - 60 + (46 - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });
  }

  const lineY = topY - 63;
  page.drawLine({
    start: { x: centerX - 90, y: lineY },
    end: { x: centerX + 90, y: lineY },
    thickness: 0.9,
    color: C_PRIMARY,
  });

  const nameStr = sanitizeWinAnsi(doctor.name);
  page.drawText(nameStr, {
    x: centerX - fontBold.widthOfTextAtSize(nameStr, 8.5) / 2,
    y: lineY - 12,
    size: 8.5,
    font: fontBold,
    color: C_PRIMARY,
  });

  const specStr = sanitizeWinAnsi(doctor.specialty.toUpperCase());
  const specW = fontRegular.widthOfTextAtSize(specStr, 7.5);
  const clampedSpec =
    specW > 205 ? `${specStr.slice(0, 44)}...` : specStr;
  page.drawText(clampedSpec, {
    x: centerX - fontRegular.widthOfTextAtSize(clampedSpec, 7.5) / 2,
    y: lineY - 22,
    size: 7.5,
    font: fontRegular,
    color: C_TEXT,
  });

  const credsStr = sanitizeWinAnsi(
    [
      doctor.cmp ? `CMP ${doctor.cmp}` : "",
      doctor.rne ? `RNE ${doctor.rne}` : "",
    ]
      .filter(Boolean)
      .join(" • ")
  );
  if (credsStr) {
    page.drawText(credsStr, {
      x: centerX - fontRegular.widthOfTextAtSize(credsStr, 7.5) / 2,
      y: lineY - 32,
      size: 7.5,
      font: fontRegular,
      color: C_MUTED,
    });
  }
}

function drawCoverPage(
  assets: SharedBrandAssets,
  options: {
    coverTitle: string;
    patientFullName: string;
    documentLabel: string;
    doctor: DoctorMeta;
  }
) {
  const { pdfDoc, fontRegular, fontBold, membreteImg, cenefaImg } = assets;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  if (membreteImg) {
    const imgW = (membreteImg.width / membreteImg.height) * 56;
    page.drawImage(membreteImg, {
      x: MARGIN_X,
      y: PAGE_H - 96,
      width: imgW,
      height: 56,
    });
  }

  const centerX = PAGE_W / 2;

  const eyebrow = "INFORME";
  page.drawText(eyebrow, {
    x: centerX - fontRegular.widthOfTextAtSize(eyebrow, 14) / 2,
    y: 505,
    size: 14,
    font: fontRegular,
    color: C_PRIMARY,
  });

  const titleLines = wrapText(
    options.coverTitle.toUpperCase(),
    fontBold,
    24,
    CONTENT_W - 20
  );
  let titleY = 472;
  for (const line of titleLines) {
    page.drawText(line, {
      x: centerX - fontBold.widthOfTextAtSize(line, 24) / 2,
      y: titleY,
      size: 24,
      font: fontBold,
      color: C_PRIMARY,
    });
    titleY -= 30;
  }

  page.drawRectangle({
    x: centerX - 46,
    y: titleY - 2,
    width: 92,
    height: 3,
    color: C_WARNING,
  });

  const patientLines = wrapText(
    options.patientFullName.toUpperCase(),
    fontBold,
    16,
    CONTENT_W - 40
  );
  let patY = titleY - 34;
  for (const line of patientLines) {
    page.drawText(line, {
      x: centerX - fontBold.widthOfTextAtSize(line, 16) / 2,
      y: patY,
      size: 16,
      font: fontBold,
      color: C_PRIMARY,
    });
    patY -= 20;
  }

  const docLine = sanitizeWinAnsi(`DNI / HC: ${options.documentLabel}`);
  page.drawText(docLine, {
    x: centerX - fontRegular.widthOfTextAtSize(docLine, 10) / 2,
    y: patY - 4,
    size: 10,
    font: fontRegular,
    color: C_MUTED,
  });

  // Bloque del médico abajo derecha
  const rightX = PAGE_W - MARGIN_X;
  const docName = sanitizeWinAnsi(options.doctor.name);
  const docSpec = sanitizeWinAnsi(options.doctor.specialty.toUpperCase());
  const docCreds = sanitizeWinAnsi(
    [
      options.doctor.cmp ? `CMP ${options.doctor.cmp}` : "",
      options.doctor.rne ? `RNE ${options.doctor.rne}` : "",
    ]
      .filter(Boolean)
      .join(" • ")
  );

  const baseDocY = assets.footerHeight + 66;
  page.drawText(docName, {
    x: rightX - fontBold.widthOfTextAtSize(docName, 10.5),
    y: baseDocY,
    size: 10.5,
    font: fontBold,
    color: C_PRIMARY,
  });
  page.drawText(docSpec, {
    x: rightX - fontRegular.widthOfTextAtSize(docSpec, 8.5),
    y: baseDocY - 14,
    size: 8.5,
    font: fontRegular,
    color: C_PRIMARY,
  });
  if (docCreds) {
    page.drawText(docCreds, {
      x: rightX - fontRegular.widthOfTextAtSize(docCreds, 8),
      y: baseDocY - 26,
      size: 8,
      font: fontRegular,
      color: C_MUTED,
    });
  }

  if (cenefaImg) {
    page.drawImage(cenefaImg, {
      x: 0,
      y: 0,
      width: PAGE_W,
      height: assets.footerHeight,
    });
  }
}

class PageCursor {
  page: PDFPage;
  y: number;
  assets: SharedBrandAssets;
  headerOpts: { badgeText?: string; codeText?: string; dateText?: string };

  constructor(
    assets: SharedBrandAssets,
    headerOpts: { badgeText?: string; codeText?: string; dateText?: string }
  ) {
    this.assets = assets;
    this.headerOpts = headerOpts;
    this.page = assets.pdfDoc.addPage([PAGE_W, PAGE_H]);
    this.y = drawHeaderAndFooterOnPage(this.page, assets, headerOpts);
  }

  ensureSpace(requiredHeight: number) {
    if (this.y - requiredHeight < this.assets.footerSafeY) {
      this.page = this.assets.pdfDoc.addPage([PAGE_W, PAGE_H]);
      this.y = drawHeaderAndFooterOnPage(
        this.page,
        this.assets,
        this.headerOpts
      );
    }
  }

  drawSectionTitle(title: string) {
    this.ensureSpace(24);
    const clean = sanitizeWinAnsi(title.toUpperCase());
    this.page.drawText(clean, {
      x: MARGIN_X,
      y: this.y,
      size: 9.5,
      font: this.assets.fontBold,
      color: C_PRIMARY,
    });
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y - 4 },
      end: { x: PAGE_W - MARGIN_X, y: this.y - 4 },
      thickness: 0.7,
      color: C_BORDER,
    });
    this.y -= 15;
  }

  drawKeyValue(label: string, value: string, fontSize = 9, leading = 12.5) {
    const cleanVal = sanitizeWinAnsi(value || "-");
    const cleanLabel = sanitizeWinAnsi(`${label}: `);
    const labelW = this.assets.fontBold.widthOfTextAtSize(cleanLabel, fontSize);
    const firstLineMaxW = Math.max(120, CONTENT_W - labelW);
    const lines = wrapText(
      cleanVal,
      this.assets.fontRegular,
      fontSize,
      firstLineMaxW
    );

    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(leading + 4);
      if (i === 0) {
        this.page.drawText(cleanLabel, {
          x: MARGIN_X,
          y: this.y,
          size: fontSize,
          font: this.assets.fontBold,
          color: C_TEXT,
        });
        this.page.drawText(lines[i], {
          x: MARGIN_X + labelW,
          y: this.y,
          size: fontSize,
          font: this.assets.fontRegular,
          color: C_TEXT,
        });
      } else {
        this.page.drawText(lines[i], {
          x: MARGIN_X,
          y: this.y,
          size: fontSize,
          font: this.assets.fontRegular,
          color: C_TEXT,
        });
      }
      this.y -= leading;
    }
  }

  drawParagraphBox(
    title: string,
    bodyText: string,
    options?: { bg?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb> }
  ) {
    const lines = wrapText(
      bodyText || "-",
      this.assets.fontRegular,
      9,
      CONTENT_W - 20
    );
    const boxH = 22 + lines.length * 12;
    this.ensureSpace(Math.min(boxH, 160));

    // Si cabe completo en la página actual, dibujarlo con caja; si no, línea por línea limpio
    if (this.y - boxH >= this.assets.footerSafeY) {
      this.page.drawRectangle({
        x: MARGIN_X,
        y: this.y - boxH,
        width: CONTENT_W,
        height: boxH,
        color: options?.bg ?? C_BG_SOFT,
        borderColor: options?.border ?? C_PRIMARY,
        borderWidth: 0.7,
      });

      this.page.drawText(sanitizeWinAnsi(title.toUpperCase()), {
        x: MARGIN_X + 10,
        y: this.y - 14,
        size: 8.5,
        font: this.assets.fontBold,
        color: C_PRIMARY,
      });

      let lineY = this.y - 27;
      for (const l of lines) {
        this.page.drawText(l, {
          x: MARGIN_X + 10,
          y: lineY,
          size: 9,
          font: this.assets.fontRegular,
          color: C_TEXT,
        });
        lineY -= 12;
      }
      this.y -= boxH + 10;
    } else {
      this.drawSectionTitle(title);
      for (const l of lines) {
        this.ensureSpace(14);
        this.page.drawText(l, {
          x: MARGIN_X,
          y: this.y,
          size: 9,
          font: this.assets.fontRegular,
          color: C_TEXT,
        });
        this.y -= 12;
      }
      this.y -= 8;
    }
  }

  drawSignature(doctor: DoctorMeta, showDigitalSignature: boolean) {
    this.ensureSpace(SIGNATURE_BLOCK_HEIGHT);
    drawSignatureBlock(
      this.page,
      this.assets,
      doctor,
      showDigitalSignature,
      this.y - 4
    );
    this.y -= SIGNATURE_BLOCK_HEIGHT;
  }
}

function drawPatientStrip(
  cursor: PageCursor,
  patient: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    age: number;
  },
  extraLine?: string
) {
  const height = extraLine ? 46 : 32;
  cursor.ensureSpace(height + 8);
  cursor.page.drawRectangle({
    x: MARGIN_X,
    y: cursor.y - height,
    width: CONTENT_W,
    height,
    color: C_BG_SOFT,
    borderColor: C_BORDER,
    borderWidth: 0.7,
  });

  cursor.page.drawText("PACIENTE", {
    x: MARGIN_X + 10,
    y: cursor.y - 11,
    size: 7.5,
    font: cursor.assets.fontBold,
    color: C_MUTED,
  });
  cursor.page.drawText(sanitizeWinAnsi(patient.fullName).slice(0, 46), {
    x: MARGIN_X + 10,
    y: cursor.y - 22,
    size: 9.5,
    font: cursor.assets.fontBold,
    color: C_TEXT,
  });

  cursor.page.drawText(sanitizeWinAnsi(patient.documentType), {
    x: MARGIN_X + 295,
    y: cursor.y - 11,
    size: 7.5,
    font: cursor.assets.fontBold,
    color: C_MUTED,
  });
  cursor.page.drawText(sanitizeWinAnsi(patient.documentNumber), {
    x: MARGIN_X + 295,
    y: cursor.y - 22,
    size: 9.5,
    font: cursor.assets.fontBold,
    color: C_TEXT,
  });

  cursor.page.drawText("EDAD", {
    x: MARGIN_X + 415,
    y: cursor.y - 11,
    size: 7.5,
    font: cursor.assets.fontBold,
    color: C_MUTED,
  });
  cursor.page.drawText(`${patient.age} años`, {
    x: MARGIN_X + 415,
    y: cursor.y - 22,
    size: 9.5,
    font: cursor.assets.fontRegular,
    color: C_TEXT,
  });

  if (extraLine) {
    cursor.page.drawLine({
      start: { x: MARGIN_X + 8, y: cursor.y - 29 },
      end: { x: PAGE_W - MARGIN_X - 8, y: cursor.y - 29 },
      thickness: 0.5,
      color: C_BORDER,
    });
    const clipped = sanitizeWinAnsi(extraLine).slice(0, 96);
    cursor.page.drawText(clipped, {
      x: MARGIN_X + 10,
      y: cursor.y - 40,
      size: 8.5,
      font: cursor.assets.fontRegular,
      color: C_TEXT,
    });
  }

  cursor.y -= height + 10;
}

async function appendPhotoAnnexPages(
  assets: SharedBrandAssets,
  images: Array<{ storagePath: string; caption: string }>,
  options: {
    title: string;
    codeText: string;
    dateText: string;
    patientLabel: string;
    perPage: 4 | 6;
  }
) {
  if (images.length === 0) return;

  const chunks: Array<Array<{ storagePath: string; caption: string }>> = [];
  for (let i = 0; i < images.length; i += options.perPage) {
    chunks.push(images.slice(i, i + options.perPage));
  }

  for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
    const batch = chunks[pageIdx];
    const page = assets.pdfDoc.addPage([PAGE_W, PAGE_H]);
    const startY = drawHeaderAndFooterOnPage(page, assets, {
      badgeText: `${options.title} (${pageIdx + 1}/${chunks.length})`,
      codeText: options.codeText,
      dateText: options.dateText,
    });

    page.drawText(sanitizeWinAnsi(`Paciente: ${options.patientLabel}`), {
      x: MARGIN_X,
      y: startY,
      size: 9,
      font: assets.fontBold,
      color: C_MUTED,
    });

    const cols = 2;
    const rows = options.perPage === 6 ? 3 : 2;
    const gapX = 14;
    const gapY = 14;
    const cellW = (CONTENT_W - gapX) / cols;
    const availableH = startY - 14 - assets.footerSafeY;
    const cellH = (availableH - gapY * (rows - 1)) / rows;
    const captionH = 18;
    const imgBoxH = cellH - captionH;

    for (let idx = 0; idx < batch.length; idx++) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellX = MARGIN_X + col * (cellW + gapX);
      const cellTopY = startY - 14 - row * (cellH + gapY);

      page.drawRectangle({
        x: cellX,
        y: cellTopY - cellH,
        width: cellW,
        height: cellH,
        color: C_WHITE,
        borderColor: C_BORDER,
        borderWidth: 0.8,
      });

      const downloaded = await downloadPrivateStorageObject({
        bucket: "clinical-images",
        path: batch[idx].storagePath,
      }).catch(() => null);

      if (downloaded) {
        const embedded = await embedImageSafe(
          assets.pdfDoc,
          new Uint8Array(downloaded.buffer)
        );
        if (embedded) {
          const fitted = embedded.scaleToFit(cellW - 8, imgBoxH - 8);
          page.drawImage(embedded, {
            x: cellX + (cellW - fitted.width) / 2,
            y: cellTopY - imgBoxH + (imgBoxH - fitted.height) / 2,
            width: fitted.width,
            height: fitted.height,
          });
        }
      }

      page.drawRectangle({
        x: cellX,
        y: cellTopY - cellH,
        width: cellW,
        height: captionH,
        color: C_BG_SOFT,
        borderColor: C_BORDER,
        borderWidth: 0.6,
      });

      const caption = sanitizeWinAnsi(
        `Fig. ${pageIdx * options.perPage + idx + 1}: ${batch[idx].caption}`
      ).slice(0, 48);
      page.drawText(caption, {
        x: cellX + 6,
        y: cellTopY - cellH + 5.5,
        size: 7.8,
        font: assets.fontRegular,
        color: C_TEXT,
      });
    }
  }
}

function drawSummarySheet(
  assets: SharedBrandAssets,
  checkup: ClinicalCheckupItem,
  patient: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    age: number;
  },
  doctor: DoctorMeta,
  showDigitalSignature: boolean
) {
  const cursor = new PageCursor(assets, {
    badgeText: "RESUMEN EJECUTIVO CHEQUEO",
    codeText: `CHK-${checkup.id.slice(0, 8).toUpperCase()}`,
    dateText: `Fecha: ${formatPeruDateDisplay(checkup.checkupDate)}`,
  });

  drawPatientStrip(
    cursor,
    patient,
    `Motivo de Atención: ${checkup.reasonForConsultation}`
  );

  cursor.drawSectionTitle("1. Evaluación Ecográfica Consolidada");
  if (checkup.breastUltrasoundBirads) {
    cursor.drawKeyValue(
      "Eco Mamaria / BI-RADS",
      `${checkup.breastUltrasoundBirads}${checkup.breastLesionMeasurements ? ` — ${checkup.breastLesionMeasurements}` : ""}`
    );
  }
  if (checkup.breastUltrasoundFindings) {
    cursor.drawKeyValue("Hallazgos Mamas", checkup.breastUltrasoundFindings);
  }
  if (checkup.uterusMeasurements || checkup.endometriumThicknessMm != null) {
    cursor.drawKeyValue(
      "Útero & Endometrio",
      `${checkup.uterusMeasurements || "-"} • Endometrio: ${checkup.endometriumThicknessMm ?? "-"} mm`
    );
  }
  if (checkup.transvaginalUltrasoundFindings) {
    cursor.drawKeyValue(
      "Eco Transvaginal",
      checkup.transvaginalUltrasoundFindings
    );
  }
  if (checkup.ovariesFindings) {
    cursor.drawKeyValue("Ovarios & Anexos", checkup.ovariesFindings);
  }
  cursor.y -= 6;

  cursor.drawSectionTitle("2. Patología Cervical & Tamizaje Preventivo");
  if (checkup.colposcopyResult || checkup.colposcopyFindings) {
    cursor.drawKeyValue(
      "Colposcopía Digital",
      `${checkup.colposcopyResult || "-"} — ${checkup.colposcopyFindings || ""}`
    );
  }
  cursor.drawKeyValue(
    "Papanicolaou (PAP)",
    checkup.papResult || "Pendiente / Sin registro"
  );
  cursor.drawKeyValue(
    "Test Molecular VPH",
    checkup.vphResult || "No solicitado / Pendiente"
  );
  cursor.y -= 8;

  cursor.drawParagraphBox(
    checkup.cie10Code
      ? `Conclusiones Diagnósticas [CIE-10: ${checkup.cie10Code}]`
      : "Conclusiones Diagnósticas",
    checkup.conclusions
  );

  if (checkup.medicalPrescription) {
    cursor.drawParagraphBox(
      "Plan Terapéutico & Indicaciones Generales",
      checkup.medicalPrescription,
      { bg: C_WHITE, border: C_BORDER }
    );
  }

  cursor.drawSignature(doctor, showDigitalSignature);
}

async function drawUltrasoundSection(
  assets: SharedBrandAssets,
  eco: UltrasoundReportItem,
  patient: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    age: number;
  },
  doctor: DoctorMeta,
  showDigitalSignature: boolean
) {
  const label =
    ULTRASOUND_TYPE_LABELS[eco.ultrasoundType] || eco.ultrasoundType;

  const cursor = new PageCursor(assets, {
    badgeText: "INFORME ECOGRÁFICO",
    codeText: `N° ECO-${eco.id.slice(0, 8).toUpperCase()}`,
    dateText: `Fecha: ${formatPeruDateDisplay(eco.reportDate)}`,
  });

  // Banner modalidad destacado
  cursor.ensureSpace(40);
  cursor.page.drawRectangle({
    x: MARGIN_X,
    y: cursor.y - 34,
    width: CONTENT_W,
    height: 34,
    color: C_PRIMARY,
  });
  cursor.page.drawRectangle({
    x: MARGIN_X,
    y: cursor.y - 34,
    width: 4.5,
    height: 34,
    color: C_WARNING,
  });
  cursor.page.drawText("MODALIDAD DIAGNÓSTICA ESPECIALIZADA", {
    x: MARGIN_X + 12,
    y: cursor.y - 12,
    size: 7.5,
    font: assets.fontBold,
    color: C_WARNING,
  });
  cursor.page.drawText(sanitizeWinAnsi(label.toUpperCase()), {
    x: MARGIN_X + 12,
    y: cursor.y - 26,
    size: 11.5,
    font: assets.fontBold,
    color: C_WHITE,
  });
  cursor.y -= 44;

  drawPatientStrip(cursor, patient, `Indicación Clínica: ${eco.indication}`);

  const f = eco.findings;
  const isGyn =
    eco.ultrasoundType === "TRANSVAGINAL" ||
    eco.ultrasoundType === "PELVICA" ||
    eco.ultrasoundType === "DOPPLER";
  const isBreast = eco.ultrasoundType === "MAMA_BILATERAL";
  const isObst =
    eco.ultrasoundType === "OBSTETRICA_1T" ||
    eco.ultrasoundType === "OBSTETRICA_2T_3T";

  cursor.drawSectionTitle("Hallazgos Ecográficos Detallados");

  if (isGyn) {
    cursor.drawKeyValue(
      "Útero",
      `Posición: ${f.uterusPosition || "AVF"} • Dimensiones: ${f.uterusDimensions || "-"} • Volumen: ${f.uterusVolumeCc != null ? `${f.uterusVolumeCc} cc` : "-"}`
    );
    cursor.drawKeyValue(
      "Miometrio",
      f.myometriumStatus || "Homogéneo sin lesiones focales."
    );
    cursor.drawKeyValue(
      "Endometrio",
      `${f.endometriumThicknessMm != null ? `${f.endometriumThicknessMm} mm` : "-"} • Patrón ${f.endometriumPattern || "-"}`
    );
    cursor.drawKeyValue("Ovario Derecho", f.rightOvaryDimensions || "-");
    cursor.drawKeyValue("Ovario Izquierdo", f.leftOvaryDimensions || "-");
    if (f.ovariesNotes) {
      cursor.drawKeyValue("Notas Anexiales", f.ovariesNotes);
    }
    cursor.drawKeyValue(
      "Fondo de Saco de Douglas",
      f.douglasPouch || "Libre de colecciones."
    );
    if (f.slidingSign || f.uterosacralLigaments || f.endometriosisFoci) {
      cursor.y -= 4;
      cursor.drawSectionTitle("Mapeo Dinámico de Endometriosis (Protocolo IDEA)");
      cursor.drawKeyValue(
        "Sliding Sign (Deslizamiento)",
        f.slidingSign || "Positivo"
      );
      if (f.uterosacralLigaments) {
        cursor.drawKeyValue("Ligamentos Uterosacros", f.uterosacralLigaments);
      }
      if (f.endometriosisFoci) {
        cursor.drawKeyValue("Focos Profundos", f.endometriosisFoci);
      }
    }
  } else if (isBreast) {
    cursor.drawKeyValue(
      "Patrón Mamario",
      f.breastPattern || "Tejido fibroglandular simétrico."
    );
    cursor.drawKeyValue(
      "Categoría ACR BI-RADS",
      f.biradsCategory || "BI-RADS 1"
    );
    cursor.drawKeyValue("Mama Derecha", f.rightBreastFindings || "-");
    cursor.drawKeyValue("Mama Izquierda", f.leftBreastFindings || "-");
  } else if (isObst) {
    cursor.drawKeyValue(
      "Sacos Gestacionales",
      String(f.gestationalSacsCount ?? 1)
    );
    cursor.drawKeyValue(
      "Biometría / LCN",
      `${f.embryoCrownRumpLengthMm != null ? `${f.embryoCrownRumpLengthMm} mm` : "-"} • EG por Eco: ${f.gestationalAgeByEcho || "-"}`
    );
    cursor.drawKeyValue(
      "Vitalidad (FCF)",
      f.fetalHeartRate ? `${f.fetalHeartRate} lpm` : "Presente"
    );
    if (f.placentaLocation) {
      cursor.drawKeyValue("Placenta / Corion", f.placentaLocation);
    }
    if (f.amnioticFluidIndex) {
      cursor.drawKeyValue("Líquido Amniótico", f.amnioticFluidIndex);
    }
  }

  cursor.y -= 8;
  cursor.drawParagraphBox("Conclusión Diagnóstica", eco.conclusion);

  if (eco.recommendations) {
    cursor.drawParagraphBox("Recomendaciones / Seguimiento", eco.recommendations, {
      bg: C_WHITE,
      border: C_BORDER,
    });
  }

  if (isBreast) {
    cursor.ensureSpace(34);
    const legendLines = [
      "BI-RADS: (0) Eval. adicional. (1) Normal. (2) Hallazgo benigno. (3) Control 6m. (4) Sospecha: Biopsia. (5) Malignidad. (6) Confirmado.",
      "Tipo de mama ACR: (A) Predominio graso. (B) Ecotextura homogénea fibroglandular. (C) Heterogéneamente densa. (D) Extremadamente densa.",
    ];
    for (const line of legendLines) {
      cursor.page.drawText(sanitizeWinAnsi(line), {
        x: MARGIN_X,
        y: cursor.y,
        size: 7.2,
        font: assets.fontRegular,
        color: C_MUTED,
      });
      cursor.y -= 10;
    }
    cursor.y -= 4;
  }

  cursor.drawSignature(doctor, showDigitalSignature);

  await appendPhotoAnnexPages(assets, eco.images, {
    title: "ANEXO FOTOGRÁFICO ECOGRAFÍA",
    codeText: `N° ECO-${eco.id.slice(0, 8).toUpperCase()}`,
    dateText: formatPeruDateDisplay(eco.reportDate),
    patientLabel: `${patient.fullName} (${patient.documentType} ${patient.documentNumber})`,
    perPage: 6,
  });
}

function drawCervicalClockVector(
  page: PDFPage,
  assets: SharedBrandAssets,
  cx: number,
  cy: number,
  radius: number,
  selectedHours: string[]
) {
  // Círculo principal y ejes de cuadrantes Q1-Q4
  page.drawCircle({
    x: cx,
    y: cy,
    size: radius,
    color: C_BG_SOFT,
    borderColor: C_PRIMARY,
    borderWidth: 1.5,
  });

  page.drawLine({
    start: { x: cx, y: cy - radius },
    end: { x: cx, y: cy + radius },
    thickness: 0.6,
    color: C_BORDER,
  });
  page.drawLine({
    start: { x: cx - radius, y: cy },
    end: { x: cx + radius, y: cy },
    thickness: 0.6,
    color: C_BORDER,
  });

  const qOffsets: Array<{ label: string; dx: number; dy: number }> = [
    { label: "Q1", dx: 12, dy: 10 },
    { label: "Q2", dx: -20, dy: 10 },
    { label: "Q3", dx: -20, dy: -16 },
    { label: "Q4", dx: 12, dy: -16 },
  ];
  for (const q of qOffsets) {
    page.drawText(q.label, {
      x: cx + q.dx,
      y: cy + q.dy,
      size: 6.5,
      font: assets.fontBold,
      color: C_MUTED,
    });
  }

  for (let h = 1; h <= 12; h++) {
    // 12 arriba (90 deg), sentido horario
    const angle = ((90 - h * 30) * Math.PI) / 180;
    const rLabel = radius + 8;
    const lx = cx + rLabel * Math.cos(angle);
    const ly = cy + rLabel * Math.sin(angle);
    const hStr = String(h);
    const selected = selectedHours.includes(hStr);

    if (selected) {
      const mx = cx + (radius - 10) * Math.cos(angle);
      const my = cy + (radius - 10) * Math.sin(angle);
      page.drawCircle({
        x: mx,
        y: my,
        size: 5.5,
        color: C_ALERT,
      });
    }

    const labelW = assets.fontBold.widthOfTextAtSize(hStr, 6.5);
    page.drawText(hStr, {
      x: lx - labelW / 2,
      y: ly - 2,
      size: 6.5,
      font: assets.fontBold,
      color: selected ? C_ALERT : C_PRIMARY,
    });
  }
}

async function drawColposcopySection(
  assets: SharedBrandAssets,
  colpo: ColposcopyReportItem,
  patient: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    age: number;
  },
  background: {
    obstetricFormula: string | null;
    lastMenstrualPeriod: string | null;
    contraceptiveMethod: string | null;
    sexualDebutAge: number | null;
    sexualPartnersCount: number | null;
    papHistory: string | null;
    vphTestHistory: string | null;
  } | null,
  doctor: DoctorMeta,
  showDigitalSignature: boolean
) {
  const classification = classifyColposcopyFindings({
    thinAcetowhiteEpithelium: colpo.thinAcetowhiteEpithelium,
    irregularBorder: colpo.irregularBorder,
    fineMosaic: colpo.fineMosaic,
    finePunctation: colpo.finePunctation,
    denseAcetowhiteEpithelium: colpo.denseAcetowhiteEpithelium,
    coarseMosaic: colpo.coarseMosaic,
    coarsePunctation: colpo.coarsePunctation,
    atypicalVessels: colpo.atypicalVessels,
    extendedFindings: colpo.extendedFindings,
  });

  const cursor = new PageCursor(assets, {
    badgeText: "COLPOSCOPÍA DIGITAL IFCPC",
    codeText: `N° COLP-${colpo.id.slice(0, 8).toUpperCase()}`,
    dateText: `Fecha: ${formatPeruDateDisplay(colpo.reportDate)}`,
  });

  drawPatientStrip(
    cursor,
    patient,
    `Clasificación IFCPC: ${classification.label} • ZT: ${colpo.transformationZoneType} • Schiller: ${colpo.schillerTest}`
  );

  // Bloque Antecedentes complementarios (Pág. 9 de informe.pdf)
  if (background) {
    cursor.ensureSpace(44);
    cursor.page.drawRectangle({
      x: MARGIN_X,
      y: cursor.y - 38,
      width: CONTENT_W,
      height: 38,
      color: C_BG_WARN,
      borderColor: C_WARNING,
      borderWidth: 0.6,
    });
    cursor.page.drawText("ANTECEDENTES COMPLEMENTARIOS", {
      x: MARGIN_X + 8,
      y: cursor.y - 11,
      size: 7.5,
      font: assets.fontBold,
      color: C_PRIMARY,
    });
    const bgLine1 = sanitizeWinAnsi(
      `Fórmula Obstétrica: ${background.obstetricFormula || "G0 P0000"}  •  FUR: ${
        background.lastMenstrualPeriod
          ? formatPeruDateDisplay(background.lastMenstrualPeriod)
          : "No registra"
      }  •  MAC: ${background.contraceptiveMethod || "Ninguno"}  •  IRS/NPS: ${
        background.sexualDebutAge ?? "NA"
      } / ${background.sexualPartnersCount ?? "NA"}`
    );
    const bgLine2 = sanitizeWinAnsi(
      `PAP Previo: ${background.papHistory || "No refiere"}  •  Test VPH: ${
        background.vphTestHistory || "No realizado"
      }`
    );
    cursor.page.drawText(bgLine1.slice(0, 102), {
      x: MARGIN_X + 8,
      y: cursor.y - 22,
      size: 7.8,
      font: assets.fontRegular,
      color: C_TEXT,
    });
    cursor.page.drawText(bgLine2.slice(0, 102), {
      x: MARGIN_X + 8,
      y: cursor.y - 32,
      size: 7.8,
      font: assets.fontRegular,
      color: C_TEXT,
    });
    cursor.y -= 46;
  }

  // Evaluación general IFCPC
  cursor.drawKeyValue(
    "Evaluación General",
    `${colpo.adequateColposcopy ? "Adecuada" : "Inadecuada"}  •  ZSC: ${colpo.squamocolumnarJunctionVisible}  •  ZT: ${colpo.transformationZoneType}  •  Schiller: ${colpo.schillerTest}`,
    8.5,
    12
  );
  cursor.y -= 4;

  // Matriz IFCPC 2011 en 2 columnas (solo positivos resaltados)
  const ext = colpo.extendedFindings ?? {};
  const leftItems: Array<{ label: string; pos: boolean; severity: "n" | "w" | "d" }> = [
    { label: "Epitelio escamoso maduro", pos: colpo.matureSquamousEpithelium, severity: "n" },
    { label: "Ectopia / Epitelio columnar", pos: colpo.ectopy, severity: "n" },
    { label: "Quistes de Naboth", pos: Boolean(ext.nabothCyst), severity: "n" },
    { label: "Aberturas glandulares", pos: Boolean(ext.cryptOpenings), severity: "n" },
    { label: "Epitelio acetoblanco tenue (G1)", pos: colpo.thinAcetowhiteEpithelium, severity: "w" },
    { label: "Borde irregular / geográfico (G1)", pos: colpo.irregularBorder, severity: "w" },
    { label: "Mosaico fino (G1)", pos: colpo.fineMosaic, severity: "w" },
    { label: "Punteado fino (G1)", pos: colpo.finePunctation, severity: "w" },
    { label: "Pólipo / Condiloma cervical", pos: Boolean(ext.polyp || ext.condyloma), severity: "w" },
    { label: "Inflamación / Cervicitis", pos: Boolean(ext.inflammation), severity: "w" },
    { label: "ZT congénita / Endometriosis", pos: Boolean(ext.congenitalTZ || ext.endometriosisFoci), severity: "n" },
  ];

  const rightItems: Array<{ label: string; pos: boolean; severity: "n" | "w" | "d" }> = [
    { label: "Epitelio acetoblanco denso (G2)", pos: colpo.denseAcetowhiteEpithelium, severity: "d" },
    { label: "Acetoblanco aparición rápida (G2)", pos: Boolean(ext.rapidAcetowhite), severity: "d" },
    { label: "Mosaico grueso (G2)", pos: colpo.coarseMosaic, severity: "d" },
    { label: "Punteado grueso (G2)", pos: colpo.coarsePunctation, severity: "d" },
    { label: "Bordes netos delimitados (G2)", pos: Boolean(ext.sharpBorders), severity: "d" },
    { label: "Signo del límite interno (G2)", pos: Boolean(ext.innerBorderSign), severity: "d" },
    { label: "Signo de la cresta (G2)", pos: Boolean(ext.ridgeSign), severity: "d" },
    { label: "Orificios glandulares engrosados", pos: Boolean(ext.thickenedGlands), severity: "d" },
    { label: "Leucoplasia / Erosión epitelial", pos: Boolean(ext.leukoplakia || ext.erosion), severity: "w" },
    { label: "Vasos atípicos (Invasión)", pos: colpo.atypicalVessels, severity: "d" },
    { label: "Vasos frágiles (Invasión)", pos: Boolean(ext.fragileVessels), severity: "d" },
    {
      label: "Sup. irregular / Exofítica / Necrosis",
      pos: Boolean(
        ext.irregularSurface || ext.exophyticLesion || ext.necrosis || ext.nodularTumor
      ),
      severity: "d",
    },
  ];

  const maxRows = Math.max(leftItems.length, rightItems.length);
  const rowH = 14;
  const matrixH = 22 + maxRows * rowH;
  cursor.ensureSpace(matrixH + 10);

  const colW = (CONTENT_W - 10) / 2;
  const drawMatrixCol = (
    x: number,
    colTitle: string,
    items: typeof leftItems
  ) => {
    cursor.page.drawRectangle({
      x,
      y: cursor.y - matrixH,
      width: colW,
      height: matrixH,
      color: C_WHITE,
      borderColor: C_BORDER,
      borderWidth: 0.7,
    });
    cursor.page.drawText(sanitizeWinAnsi(colTitle.toUpperCase()), {
      x: x + 8,
      y: cursor.y - 12,
      size: 7.5,
      font: assets.fontBold,
      color: C_PRIMARY,
    });

    let iy = cursor.y - 25;
    for (const item of items) {
      if (item.pos) {
        cursor.page.drawRectangle({
          x: x + 4,
          y: iy - 3,
          width: colW - 8,
          height: rowH - 1,
          color:
            item.severity === "d"
              ? C_BG_ALERT
              : item.severity === "w"
                ? C_BG_WARN
                : C_BG_SOFT,
        });
      }

      const mark = item.pos ? "[X]" : "[ ]";
      const textColor = item.pos
        ? item.severity === "d"
          ? C_ALERT
          : item.severity === "w"
            ? C_PRIMARY
            : C_SUCCESS
        : C_MUTED;

      cursor.page.drawText(
        sanitizeWinAnsi(`${mark} ${item.label}`),
        {
          x: x + 8,
          y: iy + 1,
          size: 7.6,
          font: item.pos ? assets.fontBold : assets.fontRegular,
          color: item.pos ? C_TEXT : C_MUTED,
        }
      );

      if (item.pos) {
        const tag = "POSITIVO";
        cursor.page.drawText(tag, {
          x: x + colW - 8 - assets.fontBold.widthOfTextAtSize(tag, 6.8),
          y: iy + 1,
          size: 6.8,
          font: assets.fontBold,
          color: textColor,
        });
      }

      iy -= rowH;
    }
  };

  drawMatrixCol(MARGIN_X, "Normales, Grado 1 (Menor) & Misc.", leftItems);
  drawMatrixCol(MARGIN_X + colW + 10, "Grado 2 (Mayor) & Invasión", rightItems);
  cursor.y -= matrixH + 10;

  // Reloj cervical + Diagnóstico & Plan
  const diagLines = wrapText(
    colpo.diagnosis,
    assets.fontBold,
    9,
    CONTENT_W - 150
  );
  const planLines = wrapText(
    colpo.planRecommendations,
    assets.fontRegular,
    8.5,
    CONTENT_W - 150
  );
  const blockH = Math.max(122, 54 + diagLines.length * 11 + planLines.length * 11);
  cursor.ensureSpace(blockH + 10);

  cursor.page.drawRectangle({
    x: MARGIN_X,
    y: cursor.y - blockH,
    width: CONTENT_W,
    height: blockH,
    color: C_BG_SOFT,
    borderColor: C_PRIMARY,
    borderWidth: 0.7,
  });

  drawCervicalClockVector(
    cursor.page,
    assets,
    MARGIN_X + 66,
    cursor.y - blockH / 2 - 4,
    38,
    colpo.biopsyClockHours
  );
  cursor.page.drawText("MAPA HORARIO CERVICAL", {
    x: MARGIN_X + 18,
    y: cursor.y - 13,
    size: 7.2,
    font: assets.fontBold,
    color: C_PRIMARY,
  });

  cursor.page.drawLine({
    start: { x: MARGIN_X + 132, y: cursor.y - 6 },
    end: { x: MARGIN_X + 132, y: cursor.y - blockH + 6 },
    thickness: 0.6,
    color: C_BORDER,
  });

  let textY = cursor.y - 15;
  const rx = MARGIN_X + 142;
  cursor.page.drawText(
    sanitizeWinAnsi(`DIAGNÓSTICO COLPOSCÓPICO  •  CIE-10: ${colpo.cie10Code}`),
    {
      x: rx,
      y: textY,
      size: 8,
      font: assets.fontBold,
      color: C_PRIMARY,
    }
  );
  textY -= 13;

  for (const dl of diagLines) {
    cursor.page.drawText(dl, {
      x: rx,
      y: textY,
      size: 9,
      font: assets.fontBold,
      color: C_TEXT,
    });
    textY -= 11;
  }
  textY -= 3;
  for (const pl of planLines) {
    cursor.page.drawText(pl, {
      x: rx,
      y: textY,
      size: 8.5,
      font: assets.fontRegular,
      color: C_TEXT,
    });
    textY -= 11;
  }

  const biopsyTxt = colpo.cervicalBiopsyTaken
    ? colpo.biopsyClockHours.length > 0
      ? `Biopsia Cervical: Tomada en horas ${colpo.biopsyClockHours.map((h) => `${h}h`).join(", ")}`
      : "Biopsia Cervical: Tomada (biopsia dirigida)"
    : "Biopsia Cervical: No requerida en este acto";
  cursor.page.drawText(sanitizeWinAnsi(biopsyTxt), {
    x: rx,
    y: cursor.y - blockH + 10,
    size: 8,
    font: assets.fontBold,
    color: C_PRIMARY,
  });

  cursor.y -= blockH + 8;

  cursor.drawSignature(doctor, showDigitalSignature);

  await appendPhotoAnnexPages(assets, colpo.images, {
    title: "ANEXO FOTOGRÁFICO COLPOSCOPÍA",
    codeText: `N° COLP-${colpo.id.slice(0, 8).toUpperCase()}`,
    dateText: formatPeruDateDisplay(colpo.reportDate),
    patientLabel: `${patient.fullName} (${patient.documentType} ${patient.documentNumber})`,
    perPage: 4,
  });
}

export async function generateCheckupDossierPdf(params: {
  tenantId: string;
  checkupId: string;
  overrides?: {
    showDigitalSignature?: boolean;
    includeCoverPage?: boolean;
    includeSummarySheet?: boolean;
  };
}): Promise<{
  bytes: Uint8Array;
  filename: string;
  pageCount: number;
  patientId: string;
} | null> {
  const [checkupRow] = await db
    .select()
    .from(clinicalCheckups)
    .where(
      and(
        eq(clinicalCheckups.id, params.checkupId),
        eq(clinicalCheckups.tenantId, params.tenantId),
        isNull(clinicalCheckups.deletedAt)
      )
    )
    .limit(1);

  if (!checkupRow) return null;

  const checkup = mapCheckupRow(checkupRow);
  const config = normalizeDossierConfig(checkup.dossierConfig);

  const includeCoverPage =
    params.overrides?.includeCoverPage ?? config.includeCoverPage;
  const includeSummarySheet =
    params.overrides?.includeSummarySheet ?? config.includeSummarySheet;
  const showDigitalSignature =
    params.overrides?.showDigitalSignature ?? config.showDigitalSignature;

  // Lote 1 (<=3 queries): paciente, antecedentes, clínica
  const [[patientRow], [backgroundRow], [clinicRow]] = await Promise.all([
    db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, checkup.patientId),
          eq(patients.tenantId, params.tenantId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1),
    db
      .select()
      .from(patientBackgrounds)
      .where(
        and(
          eq(patientBackgrounds.patientId, checkup.patientId),
          eq(patientBackgrounds.tenantId, params.tenantId),
          isNull(patientBackgrounds.deletedAt)
        )
      )
      .limit(1),
    db
      .select()
      .from(clinics)
      .where(eq(clinics.id, params.tenantId))
      .limit(1),
  ]);

  if (!patientRow) {
    throw new DomainError("Paciente no encontrada para generar el dossier.");
  }

  // Anti-IDOR estricto antes de leer archivos o ensamblar PDFs
  await assertDossierRefsBelongToPatient(
    params.tenantId,
    checkup.patientId,
    config.items
  );

  const ecoIds = Array.from(
    new Set(
      config.items.filter((i) => i.kind === "ULTRASOUND").map((i) => i.refId)
    )
  );
  const colpoIds = Array.from(
    new Set(
      config.items.filter((i) => i.kind === "COLPOSCOPY").map((i) => i.refId)
    )
  );
  const docIds = Array.from(
    new Set(
      config.items.filter((i) => i.kind === "DOCUMENT").map((i) => i.refId)
    )
  );

  // Lote 2 (<=3 queries): estudios propios + metadatos PDF externos
  const [ecoRows, colpoRows, docRows] = await Promise.all([
    ecoIds.length > 0
      ? db
          .select()
          .from(ultrasoundReports)
          .where(
            and(
              eq(ultrasoundReports.tenantId, params.tenantId),
              eq(ultrasoundReports.patientId, checkup.patientId),
              isNull(ultrasoundReports.deletedAt),
              inArray(ultrasoundReports.id, ecoIds)
            )
          )
      : Promise.resolve([]),
    colpoIds.length > 0
      ? db
          .select()
          .from(colposcopyReports)
          .where(
            and(
              eq(colposcopyReports.tenantId, params.tenantId),
              eq(colposcopyReports.patientId, checkup.patientId),
              isNull(colposcopyReports.deletedAt),
              inArray(colposcopyReports.id, colpoIds)
            )
          )
      : Promise.resolve([]),
    docIds.length > 0
      ? db
          .select()
          .from(patientDocuments)
          .where(
            and(
              eq(patientDocuments.tenantId, params.tenantId),
              eq(patientDocuments.patientId, checkup.patientId),
              isNull(patientDocuments.deletedAt),
              inArray(patientDocuments.id, docIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const ecoMap = new Map(ecoRows.map((r) => [r.id, mapUltrasoundRow(r)]));
  const colpoMap = new Map(colpoRows.map((r) => [r.id, mapColposcopyRow(r)]));
  const docMap = new Map(docRows.map((r) => [r.id, r]));

  // Resolver firmas privadas de los médicos participantes
  const doctorIds = Array.from(
    new Set(
      [
        checkup.doctorId,
        ...ecoRows.map((e) => e.doctorId),
        ...colpoRows.map((c) => c.doctorId),
      ].filter((id): id is string => Boolean(id))
    )
  );

  const profileRows =
    doctorIds.length > 0
      ? await db
          .select()
          .from(profiles)
          .where(
            and(
              eq(profiles.tenantId, params.tenantId),
              inArray(profiles.id, doctorIds)
            )
          )
      : [];

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(
    sanitizeWinAnsi(`${config.coverTitle} - ${patientRow.fullName}`)
  );
  pdfDoc.setAuthor("CENDO Miraflores");

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [membreteBuf, cenefaBuf] = await Promise.all([
    fs
      .readFile(path.join(process.cwd(), "public/brand/cendo-membrete.jpg"))
      .catch(() => null),
    fs
      .readFile(path.join(process.cwd(), "public/brand/cendo-cenefa.jpg"))
      .catch(() => null),
  ]);

  const membreteImg = membreteBuf
    ? await embedImageSafe(pdfDoc, new Uint8Array(membreteBuf))
    : null;
  const cenefaImg = cenefaBuf
    ? await embedImageSafe(pdfDoc, new Uint8Array(cenefaBuf))
    : null;

  const footerHeight = cenefaImg
    ? Math.round((cenefaImg.height / cenefaImg.width) * PAGE_W)
    : 56;

  const signatureCache = new Map<string, PDFImage | null>();
  for (const prof of profileRows) {
    if (!prof.signatureUrl) {
      signatureCache.set(prof.id, null);
      continue;
    }
    const sigObj = await downloadPrivateStorageObject({
      bucket: "clinical-images",
      path: prof.signatureUrl,
    }).catch(() => null);
    if (!sigObj) {
      signatureCache.set(prof.id, null);
      continue;
    }
    signatureCache.set(
      prof.id,
      await embedImageSafe(pdfDoc, new Uint8Array(sigObj.buffer))
    );
  }

  const profileMap = new Map(profileRows.map((p) => [p.id, p]));
  const buildDoctorMeta = (
    doctorId: string | null,
    name: string,
    cmp: string,
    rne: string
  ): DoctorMeta => {
    const prof = doctorId ? profileMap.get(doctorId) : undefined;
    return {
      id: doctorId ?? "",
      name: formatDoctorDisplayName(name),
      specialty: prof?.specialty || "Ginecólogo Obstetra",
      cmp: cmp || prof?.cmp || "61693",
      rne: rne || prof?.rne || "",
      signatureImage: doctorId ? (signatureCache.get(doctorId) ?? null) : null,
    };
  };

  const assets: SharedBrandAssets = {
    pdfDoc,
    fontRegular,
    fontBold,
    membreteImg,
    cenefaImg,
    footerHeight,
    footerSafeY: footerHeight + 16,
    clinicAddress:
      clinicRow?.address ||
      "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
    clinicEmail: clinicRow?.contactEmail || "cendoperu@gmail.com",
    clinicPhone: clinicRow?.phone || "985 945 697",
  };

  const birth = new Date(`${patientRow.birthDate}T00:00:00Z`);
  const age = Number.isNaN(birth.getTime())
    ? 0
    : Math.max(
        0,
        new Date().getUTCFullYear() - birth.getUTCFullYear()
      );
  const patientInfo = {
    fullName: patientRow.fullName,
    documentType: patientRow.documentType,
    documentNumber: patientRow.documentNumber,
    age,
  };

  const mainDoctor = buildDoctorMeta(
    checkup.doctorId,
    checkup.doctorName,
    checkup.doctorCmp,
    checkup.doctorRne
  );

  // 1. Carátula CENDO
  if (includeCoverPage) {
    drawCoverPage(assets, {
      coverTitle: config.coverTitle,
      patientFullName: patientInfo.fullName,
      documentLabel: `${patientInfo.documentType} ${patientInfo.documentNumber}`,
      doctor: mainDoctor,
    });
  }

  // 2. Hoja Resumen Ejecutivo opcional
  if (includeSummarySheet) {
    drawSummarySheet(
      assets,
      checkup,
      patientInfo,
      mainDoctor,
      showDigitalSignature
    );
  }

  // 3. Iterar piezas ordenadas del dossier intercalando estudios propios y PDFs externos
  for (const item of config.items) {
    if (item.kind === "ULTRASOUND") {
      const eco = ecoMap.get(item.refId);
      if (!eco) continue;
      const ecoDoctor = buildDoctorMeta(
        eco.doctorId,
        eco.doctorName,
        eco.doctorCmp,
        eco.doctorRne
      );
      await drawUltrasoundSection(
        assets,
        eco,
        patientInfo,
        ecoDoctor,
        showDigitalSignature
      );
    } else if (item.kind === "COLPOSCOPY") {
      const colpo = colpoMap.get(item.refId);
      if (!colpo) continue;
      const colpoDoctor = buildDoctorMeta(
        colpo.doctorId,
        colpo.doctorName,
        colpo.doctorCmp,
        colpo.doctorRne
      );
      await drawColposcopySection(
        assets,
        colpo,
        patientInfo,
        backgroundRow ?? null,
        colpoDoctor,
        showDigitalSignature
      );
    } else if (item.kind === "DOCUMENT") {
      const docRow = docMap.get(item.refId);
      if (!docRow) continue;

      const downloaded = await downloadPrivateStorageObject({
        bucket: "lab-reports",
        path: docRow.storagePath,
      });

      if (!downloaded) {
        throw new DomainError(
          `El documento PDF "${docRow.title}" no está disponible en Storage.`
        );
      }

      try {
        const extPdf = await PDFDocument.load(downloaded.buffer, {
          ignoreEncryption: true,
        });
        const copiedPages = await pdfDoc.copyPages(
          extPdf,
          extPdf.getPageIndices()
        );
        for (const extPage of copiedPages) {
          pdfDoc.addPage(extPage);
        }
      } catch {
        throw new DomainError(
          `No se pudo adjuntar el PDF externo "${docRow.title}": el archivo está dañado o protegido con contraseña de apertura.`
        );
      }
    }
  }

  // Garantizar al menos 1 hoja si desactivaron carátula, resumen y aún no hay piezas
  if (pdfDoc.getPageCount() === 0) {
    drawSummarySheet(
      assets,
      checkup,
      patientInfo,
      mainDoctor,
      showDigitalSignature
    );
  }

  const finalBytes = await pdfDoc.save();
  const safeLast = patientRow.lastName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return {
    bytes: finalBytes,
    filename: `Chequeo_${safeLast || "CENDO"}_${checkup.checkupDate}.pdf`,
    pageCount: pdfDoc.getPageCount(),
    patientId: checkup.patientId,
  };
}
