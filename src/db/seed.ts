import { db } from "./index";
import {
  catalogCategories,
  clinics,
  labOrderTemplates,
  medicationsVademecum,
  proceduresTariff,
  profiles,
} from "./schema";
import { ensureOfficialClinicalTemplatesSeeded } from "@/features/clinical-templates/services/clinical-templates.service";
import { hashPassword } from "@/lib/security/password";

export const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

async function seed() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
  const passwordHash = await hashPassword(defaultPassword);

  await db
    .insert(clinics)
    .values({
      id: DEFAULT_CLINIC_ID,
      slug: "cendo-miraflores",
      name: "CENDO - Centro de Endometriosis y Ginecología",
      address: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
      phone: "985 945 697",
      contactEmail: "cendoperu@gmail.com",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: clinics.slug,
      set: {
        name: "CENDO - Centro de Endometriosis y Ginecología",
        address: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
        phone: "985 945 697",
        contactEmail: "cendoperu@gmail.com",
        updatedAt: new Date(),
      },
    });

  const officialDoctors = [
    {
      id: "a0000000-0000-0000-0000-000000000001",
      email: "cendoperu@gmail.com",
      fullName: "Patrick José Jacinto Gomero",
      doctorTitle: "Dr.",
      specialty: "Ginecología y Obstetricia - Endometriosis y Colposcopía",
      cmp: "61693",
      rne: "38657",
      role: "admin" as const,
      clinicalRole: "director" as const,
      phone: "985 945 697",
    },
    {
      id: "a0000000-0000-0000-0000-000000000002",
      email: "cbenavides@cendo.pe",
      fullName: "Carlos Eduardo Benavides Silva",
      doctorTitle: "Dr.",
      specialty: "Ginecología y Obstetricia - Cirugía Laparoscópica Ginecológica",
      cmp: "64520",
      rne: "39145",
      role: "moderator" as const,
      clinicalRole: "doctor" as const,
      phone: "984 321 654",
    },
    {
      id: "a0000000-0000-0000-0000-000000000003",
      email: "amorales@cendo.pe",
      fullName: "Andrea Sofía Morales Tello",
      doctorTitle: "Dra.",
      specialty: "Ginecología y Obstetricia - Medicina Materno-Fetal & Ecografía Doppler",
      cmp: "68914",
      rne: "41250",
      role: "moderator" as const,
      clinicalRole: "doctor" as const,
      phone: "976 123 987",
    },
  ];

  for (const doc of officialDoctors) {
    await db
      .insert(profiles)
      .values({
        id: doc.id,
        tenantId: DEFAULT_CLINIC_ID,
        email: doc.email,
        passwordHash,
        fullName: doc.fullName,
        doctorTitle: doc.doctorTitle,
        specialty: doc.specialty,
        cmp: doc.cmp,
        rne: doc.rne,
        role: doc.role,
        clinicalRole: doc.clinicalRole,
        clinicName: "CENDO - Centro de Endometriosis y Ginecología",
        clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
        phone: doc.phone,
        contactEmail: doc.email,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          fullName: doc.fullName,
          doctorTitle: doc.doctorTitle,
          specialty: doc.specialty,
          cmp: doc.cmp,
          rne: doc.rne,
          role: doc.role,
          clinicalRole: doc.clinicalRole,
          phone: doc.phone,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  const officialLabTemplates = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      code: "tmpl-pap-cervicovaginal",
      title: "Citología Cervicovaginal / Papanicolaou (ThinPrep & Convencional)",
      category: "Citología & Cérvix",
      templateType: "PAP",
      sampleType: "Exocérvix y cepillado endocervical en medio líquido PreservCyt / Frotis fijado",
      fixativeTransport: "Vial PreservCyt ThinPrep / Spray fijador citológico en lámina portaobjetos",
      suggestedDiagnosis: "Despistaje ginecológico preventivo / Sospecha de lesión intraepitelial",
      cie10Code: "Z01.4",
      defaultTests: [
        "Citología en Base Líquida (ThinPrep Pap Test)",
        "Evaluación citomorfológica según Sistema Bethesda 2014",
        "Identificación de flora bacteriana / agentes infecciosos (Döderlein, Gardnerella, Cándida, Trichomonas)",
        "Evaluación hormonal del frotis citológico (trofismo epitelial)",
      ],
      clinicalNotes:
        "Abstinencia sexual 48 horas previas. Sin sangrado menstrual activo. No haber aplicado óvulos ni duchas vaginales 48 horas antes de la toma de muestra.",
      isOfficial: true,
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      code: "tmpl-biopsia-patologia",
      title: "Biopsia Quirúrgica / Histopatología (Cérvix, Endometrio, Cono LEEP, Pólipos)",
      category: "Anatomía Patológica",
      templateType: "BIOPSIA",
      sampleType: "Tejido en cuña cervical / Fragmentos endometriales / Pieza quirúrgica LEEP",
      fixativeTransport:
        "Formol neutro tamponado al 10% (volumen formol:tejido mínimo 10:1) en frasco hermético estéril",
      suggestedDiagnosis: "Displasia cervical moderada / Pólipo / Hiperplasia endometrial",
      cie10Code: "N87.1",
      defaultTests: [
        "Estudio histopatológico con inclusión en parafina y tinción Hematoxilina-Eosina (H&E)",
        "Evaluación de márgenes quirúrgicos endocervicales y ectocervicales",
        "Evaluación de profundidad estromal y compromiso vascular o linfático",
        "Inmunohistoquímica p16 / Ki-67 en caso de displasia sospechosa de alto grado",
      ],
      clinicalNotes:
        "Rotulación clara del frasco con nombres, DNI, fecha y cuadrante/hora de reloj de toma. Fijación inmediata en formol tamponado para evitar autólisis celular.",
      isOfficial: true,
    },
    {
      id: "20000000-0000-0000-0000-000000000003",
      code: "tmpl-biopsia-trucut-mama",
      title: "Biopsia Mamaria Percutánea con Aguja Gruesa (Tru-Cut Core Biopsy)",
      category: "Patología Mamaria",
      templateType: "TRUCUT",
      sampleType: "Cilindros tisulares mamarios (calibre 14G / 16G, 3 a 5 fragmentos intactos)",
      fixativeTransport: "Formol neutro tamponado al 10% con inmersión inmediata",
      suggestedDiagnosis: "Nódulo / Masa mamaria sospechosa (BI-RADS 4/5)",
      cie10Code: "N63",
      defaultTests: [
        "Estudio histopatológico estándar con tinción H&E de cilindros mamarios",
        "Clasificación histológica (Carcinoma ductal infiltrante, lobulillar, fibroadenoma, etc.)",
        "Grado histológico de Nottingham / Bloom-Richardson",
        "Panel de Inmunohistoquímica Mamaria: Receptores de Estrógeno (RE), Progesterona (RP), HER2 y Ki-67",
      ],
      clinicalNotes:
        "Indicar radio horario (horas 1 a 12), distancia al pezón en cm, cuadrante y mama (Izquierda/Derecha). Acompañar informe ecográfico BI-RADS.",
      isOfficial: true,
    },
    {
      id: "20000000-0000-0000-0000-000000000004",
      code: "tmpl-panel-its-pcr",
      title: "Panel Molecular de ITS Multiplex por PCR en Tiempo Real (7 Patógenos)",
      category: "Biología Molecular",
      templateType: "ITS",
      sampleType:
        "Hisopado endocervical / vaginal profundo en medio de transporte molecular (o primera fracción de orina)",
      fixativeTransport: "Tubo con medio de lisis y transporte molecular para ADN/ARN a 2°C - 8°C",
      suggestedDiagnosis: "Cervicitis mucopurulenta / Síndrome de flujo vaginal recidivante / ITS",
      cie10Code: "A56.0",
      defaultTests: [
        "Chlamydia trachomatis por PCR en tiempo real",
        "Neisseria gonorrhoeae por PCR en tiempo real",
        "Mycoplasma genitalium por PCR en tiempo real",
        "Mycoplasma hominis por PCR en tiempo real",
        "Ureaplasma urealyticum / Ureaplasma parvum por PCR en tiempo real",
        "Trichomonas vaginalis por PCR en tiempo real",
        "Herpes Simplex Virus Tipo 1 y Tipo 2 (HSV-1 / HSV-2) por PCR",
      ],
      clinicalNotes:
        "Muestra recolectada sin lubricante ni antisépticos previos. Transporte refrigerado con cadena de frío garantizada.",
      isOfficial: true,
    },
    {
      id: "20000000-0000-0000-0000-000000000005",
      code: "tmpl-liquido-peritoneal",
      title: "Estudio Citoquímico, Bloque Celular y Marcadores de Líquido Peritoneal",
      category: "Fluidos Corporales & Laparoscopía",
      templateType: "PERITONEAL",
      sampleType:
        "Líquido peritoneal / lavado peritoneal obtenido por laparoscopía o paracentesis (20-50 mL)",
      fixativeTransport:
        "Frasco estéril con heparina (evita coágulos) para citología + tubo seco estéril para bioquímica",
      suggestedDiagnosis: "Endometriosis pélvica profunda / Ascitis en estudio / Masa pélvica",
      cie10Code: "N80.3",
      defaultTests: [
        "Examen citoquímico: Recuento celular total y diferencial, Glucosa, Proteínas totales, Albúmina, LDH, GASA",
        "Citología oncológica con técnica de Bloque Celular (Cell Block) para células atípicas",
        "Marcador tumoral CA-125 cuantitativo en líquido peritoneal",
        "Frotis con tinción Gram y cultivo aerobio/anaerobio + antibiograma",
        "Tinción de Ziehl-Neelsen / GeneXpert para Mycobacterium tuberculosis en fluido peritoneal",
      ],
      clinicalNotes:
        "Envío inmediato al laboratorio dentro de las 2 horas post-punción. Indicar sospecha clínica de endometriosis pélvica o masa ovárica.",
      isOfficial: true,
    },
  ];

  for (const tmpl of officialLabTemplates) {
    await db
      .insert(labOrderTemplates)
      .values({
        ...tmpl,
        tenantId: DEFAULT_CLINIC_ID,
      })
      .onConflictDoUpdate({
        target: labOrderTemplates.id,
        set: {
          code: tmpl.code,
          title: tmpl.title,
          category: tmpl.category,
          templateType: tmpl.templateType,
          sampleType: tmpl.sampleType,
          fixativeTransport: tmpl.fixativeTransport,
          suggestedDiagnosis: tmpl.suggestedDiagnosis,
          cie10Code: tmpl.cie10Code,
          defaultTests: tmpl.defaultTests,
          clinicalNotes: tmpl.clinicalNotes,
          isOfficial: tmpl.isOfficial,
          updatedAt: new Date(),
        },
      });
  }

  const officialTariffs = [
    {
      id: "c1000000-0000-0000-0000-000000000001",
      code: "CONS-ESP",
      name: "Consulta Médica Ginecológica Especializada",
      category: "Consulta",
      description:
        "Evaluación integral por especialista en ginecología, revisión de antecedentes y plan diagnóstico.",
      price: "180.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000002",
      code: "COLPO-DX",
      name: "Colposcopía Digital de Alta Resolución IFCPC con Test de Schiller",
      category: "Procedimiento",
      description:
        "Evaluación colposcópica completa con videocámara HD, captura fotográfica y reporte oficial.",
      price: "250.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000003",
      code: "ECO-TV",
      name: "Ecografía Ginecológica Transvaginal Doppler Color",
      category: "Ecografía",
      description:
        "Estudio ultrasonográfico de alta definición para útero, miometrio, endometrio y reserva ovárica.",
      price: "180.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000004",
      code: "ECO-MAMA",
      name: "Ecografía Mamaria Bilateral con Clasificación BI-RADS",
      category: "Ecografía",
      description: "Mapeo ecográfico de ambas mamas y huecos axilares por cuadrantes.",
      price: "200.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000005",
      code: "BIO-CX",
      name: "Biopsia de Cérvix Dirigida Tischler + Acondicionamiento de Muestra",
      category: "Procedimiento",
      description:
        "Toma de tejido cervical bajo visión colposcópica directa con hemostasia local.",
      price: "320.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000006",
      code: "PAP-CONV",
      name: "Papanicolaou Convencional en Base Líquida Bethesda",
      category: "Laboratorio",
      description: "Citología exfoliativa en medio líquido con tinción y lectura citopatológica.",
      price: "80.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000007",
      code: "LEEP-CONO",
      name: "Conización Cervical LEEP / Radiocirugía Bajo Anestesia Local",
      category: "Procedimiento",
      description: "Escisión electroquirúrgica con asa diatérmica de la zona de transformación atípica.",
      price: "1400.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000008",
      code: "HDA-ENDO",
      name: "Histeroscopía Diagnóstica Ambulatoria HD",
      category: "Procedimiento",
      description:
        "Inspección endoscópica del canal endocervical y cavidad endometrial sin anestesia general.",
      price: "950.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000009",
      code: "PAQ-PREV",
      name: "Chequeo Integral Ginecológico Anual CENDO",
      category: "Paquete",
      description:
        "Incluye: Consulta especializada + Colposcopía digital HD + Ecografía transvaginal + Papanicolaou.",
      price: "420.00",
    },
    {
      id: "c1000000-0000-0000-0000-000000000010",
      code: "IMPL-ETONO",
      name: "Inserción de Implante Anticonceptivo Subdérmico Implanon NXT",
      category: "Procedimiento",
      description:
        "Colocación estéril en cara interna del brazo no dominante con anestesia local.",
      price: "480.00",
    },
  ];

  for (const tariff of officialTariffs) {
    await db
      .insert(proceduresTariff)
      .values({
        ...tariff,
        tenantId: DEFAULT_CLINIC_ID,
        active: true,
      })
      .onConflictDoUpdate({
        target: proceduresTariff.id,
        set: {
          code: tariff.code,
          name: tariff.name,
          category: tariff.category,
          description: tariff.description,
          price: tariff.price,
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  const officialMedications = [
    {
      id: "c2000000-0000-0000-0000-000000000001",
      genericName: "Dienogest 2 mg",
      atcCode: "G03DB08",
      therapeuticGroup: "Progestágenos / Tratamiento de Endometriosis",
      commercialBrands: [
        {
          brandName: "Visannette",
          laboratory: "Bayer Healthcare",
          presentation: "Caja x 28 comprimidos",
          referencePricePen: 280,
        },
        {
          brandName: "Dienomed",
          laboratory: "Medifarma",
          presentation: "Caja x 30 comprimidos",
          referencePricePen: 195,
        },
      ],
      indications:
        "Tratamiento de la endometriosis ovárica y pélvica profunda, dismenorrea severa y dolor pélvico crónico.",
      contraindications:
        "Trastorno tromboembólico venoso activo, enfermedad hepática severa, embarazo.",
    },
    {
      id: "c2000000-0000-0000-0000-000000000002",
      genericName: "Ácido Tranexámico 500 mg",
      atcCode: "B02AA02",
      therapeuticGroup: "Antifibrinolíticos / Hemostáticos Ginecológicos",
      commercialBrands: [
        {
          brandName: "Transamin",
          laboratory: "Daiichi Sankyo",
          presentation: "Caja x 20 tabletas",
          referencePricePen: 85,
        },
        {
          brandName: "Hemostop",
          laboratory: "Laboratorios AC Farma",
          presentation: "Caja x 30 tabletas",
          referencePricePen: 52,
        },
      ],
      indications:
        "Hemorragia uterina anormal (HUA-O / HUA-A), hipermenorrea por adenomiosis o miomatosis.",
      contraindications:
        "Antecedente de trombosis arterial o venosa, insuficiencia renal severa.",
    },
    {
      id: "c2000000-0000-0000-0000-000000000003",
      genericName: "Metronidazol 500 mg + Miconazol 100 mg",
      atcCode: "G01AF20",
      therapeuticGroup: "Antiinfecciosos y Antisépticos Ginecológicos",
      commercialBrands: [
        {
          brandName: "Ginedazol",
          laboratory: "Laboratorios Roemmers",
          presentation: "Caja x 10 óvulos vaginales",
          referencePricePen: 48,
        },
      ],
      indications:
        "Tratamiento tópico de vulvovaginitis mixta (vaginosis bacteriana y candidiasis vulvovaginal).",
      contraindications:
        "Primer trimestre de gestación, hipersensibilidad a los derivados imidazólicos.",
    },
    {
      id: "c2000000-0000-0000-0000-000000000004",
      genericName: "Ácido Mefenámico 500 mg",
      atcCode: "M01AG01",
      therapeuticGroup: "Antiinflamatorios No Esteroides (AINES)",
      commercialBrands: [
        {
          brandName: "Ponstan",
          laboratory: "Pfizer",
          presentation: "Caja x 20 tabletas",
          referencePricePen: 65,
        },
      ],
      indications:
        "Manejo del dolor agudo en dismenorrea primaria y secundaria por endometriosis.",
      contraindications:
        "Úlcera péptica activa, hipersensibilidad al ácido acetilsalicílico u otros AINES.",
    },
    {
      id: "c2000000-0000-0000-0000-000000000005",
      genericName: "Levonorgestrel 75 mg (Implante Subdérmico Jadelle x 2 varillas)",
      atcCode: "G03AC03",
      therapeuticGroup: "Anticonceptivos de Larga Duración (LARC)",
      commercialBrands: [
        {
          brandName: "Jadelle",
          laboratory: "Bayer Healthcare",
          presentation: "Caja con 2 implantes subdérmicos + trocar",
          referencePricePen: 420,
        },
      ],
      indications: "Anticoncepción de larga duración hasta por 5 años continuos.",
      contraindications:
        "Embarazo conocido o sospechado, enfermedad arterial severa activa.",
    },
  ];

  for (const med of officialMedications) {
    await db
      .insert(medicationsVademecum)
      .values({
        ...med,
        tenantId: DEFAULT_CLINIC_ID,
      })
      .onConflictDoUpdate({
        target: medicationsVademecum.id,
        set: {
          genericName: med.genericName,
          atcCode: med.atcCode,
          therapeuticGroup: med.therapeuticGroup,
          commercialBrands: med.commercialBrands,
          indications: med.indications,
          contraindications: med.contraindications,
          updatedAt: new Date(),
        },
      });
  }

  const initialCategories = [
    { id: "c3000000-0000-0000-0000-000000000001", scope: "tariff", name: "Consulta" },
    { id: "c3000000-0000-0000-0000-000000000002", scope: "tariff", name: "Procedimiento" },
    { id: "c3000000-0000-0000-0000-000000000003", scope: "tariff", name: "Ecografía" },
    { id: "c3000000-0000-0000-0000-000000000004", scope: "tariff", name: "Laboratorio" },
    { id: "c3000000-0000-0000-0000-000000000005", scope: "tariff", name: "Paquete" },
    {
      id: "c3000000-0000-0000-0000-000000000011",
      scope: "vademecum",
      name: "Progestágenos / Tratamiento de Endometriosis",
    },
    {
      id: "c3000000-0000-0000-0000-000000000012",
      scope: "vademecum",
      name: "Antifibrinolíticos / Hemostáticos Ginecológicos",
    },
    {
      id: "c3000000-0000-0000-0000-000000000013",
      scope: "vademecum",
      name: "Antiinfecciosos y Antisépticos Ginecológicos",
    },
    {
      id: "c3000000-0000-0000-0000-000000000014",
      scope: "vademecum",
      name: "Antiinflamatorios No Esteroides (AINES)",
    },
    {
      id: "c3000000-0000-0000-0000-000000000015",
      scope: "vademecum",
      name: "Anticonceptivos de Larga Duración (LARC)",
    },
  ];

  for (const cat of initialCategories) {
    await db
      .insert(catalogCategories)
      .values({
        ...cat,
        tenantId: DEFAULT_CLINIC_ID,
      })
      .onConflictDoNothing();
  }

  await ensureOfficialClinicalTemplatesSeeded(DEFAULT_CLINIC_ID);

  console.log(
    "Seed CENDO completado: sede Miraflores, 3 médicos, 5 plantillas lab, 11 plantillas clínicas, 10 tarifas, 5 fármacos y categorías."
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error ejecutando seed CENDO:", err);
  process.exit(1);
});
