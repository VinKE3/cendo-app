"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DoctorSignatureEntry } from "@/features/configuracion/configuracion.schema";

export interface ResolvedDoctorSignature {
  doctorId: string | null;
  hasSignature: boolean;
  showByDefault: boolean;
  signatureSrc: string | null;
  isOwnDocument: boolean;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorCmp?: string;
  doctorRne?: string;
}

interface SignatureSettingsContextValue {
  directory: DoctorSignatureEntry[];
  currentDoctorId: string;
  getSignatureForDoctor: (
    doctorId?: string | null,
    doctorCmp?: string | null
  ) => ResolvedDoctorSignature;
  refreshDirectory: () => Promise<void>;
}

const SignatureSettingsContext =
  createContext<SignatureSettingsContextValue | null>(null);

interface SignatureSettingsProviderProps {
  initialDirectory: DoctorSignatureEntry[];
  currentDoctorId: string;
  children: ReactNode;
}

export function SignatureSettingsProvider({
  initialDirectory,
  currentDoctorId,
  children,
}: SignatureSettingsProviderProps) {
  const [directory, setDirectory] =
    useState<DoctorSignatureEntry[]>(initialDirectory);

  const refreshDirectory = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        success?: boolean;
        data?: { signatureDirectory?: DoctorSignatureEntry[] };
      };
      if (json.success && Array.isArray(json.data?.signatureDirectory)) {
        setDirectory(json.data.signatureDirectory);
      }
    } catch {
      // Ignorar errores silenciosos de red al refrescar el directorio de firmas
    }
  }, []);

  const getSignatureForDoctor = useCallback(
    (
      doctorId?: string | null,
      doctorCmp?: string | null
    ): ResolvedDoctorSignature => {
      let entry: DoctorSignatureEntry | undefined;

      if (doctorId) {
        entry = directory.find((item) => item.doctorId === doctorId);
      } else if (doctorCmp && doctorCmp.trim().length > 0) {
        const cleanCmp = doctorCmp.trim();
        entry = directory.find((item) => item.cmp.trim() === cleanCmp);
      }

      if (!entry) {
        return {
          doctorId: null,
          hasSignature: false,
          showByDefault: false,
          signatureSrc: null,
          isOwnDocument: false,
        };
      }

      const signatureSrc = entry.hasSignature
        ? `/api/configuracion/firma?doctorId=${entry.doctorId}&v=${encodeURIComponent(
            entry.signatureVersion
          )}`
        : null;

      return {
        doctorId: entry.doctorId,
        hasSignature: entry.hasSignature,
        showByDefault: entry.hasSignature && entry.showSignatureByDefault,
        signatureSrc,
        isOwnDocument: entry.doctorId === currentDoctorId,
        doctorName: `${entry.doctorTitle} ${entry.fullName}`,
        doctorSpecialty: entry.specialty,
        doctorCmp: entry.cmp,
        doctorRne: entry.rne,
      };
    },
    [currentDoctorId, directory]
  );

  const value = useMemo<SignatureSettingsContextValue>(
    () => ({
      directory,
      currentDoctorId,
      getSignatureForDoctor,
      refreshDirectory,
    }),
    [currentDoctorId, directory, getSignatureForDoctor, refreshDirectory]
  );

  return (
    <SignatureSettingsContext.Provider value={value}>
      {children}
    </SignatureSettingsContext.Provider>
  );
}

export function useSignatureSettings(): SignatureSettingsContextValue {
  const ctx = useContext(SignatureSettingsContext);
  if (!ctx) {
    return {
      directory: [],
      currentDoctorId: "",
      getSignatureForDoctor: () => ({
        doctorId: null,
        hasSignature: false,
        showByDefault: false,
        signatureSrc: null,
        isOwnDocument: false,
      }),
      refreshDirectory: async () => undefined,
    };
  }
  return ctx;
}
