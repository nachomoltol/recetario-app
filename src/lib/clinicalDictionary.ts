/**
 * DICCIONARIO CLÍNICO DE EXCLUSIONES (CORTAFUEGOS NUTRICIONAL)
 * Define las exclusiones estrictas de ingredientes por patología/objetivo clínico
 * y por patrón alimentario para blindar el motor de IA contra ingredientes no tolerados.
 */

export const CLINICAL_EXCLUSIONS: Record<string, string> = {
  fodmap:
    'ajo, cebolla, trigo (gluten), centeno, legumbres enteras, lácteos con lactosa, miel, jarabe de maíz, frutas altas en fructosa (manzana, pera, mango, sandía), xilitol, sorbitol, setas, coliflor, alcachofas, espárragos',
  sii:
    'ajo, cebolla, trigo (gluten), centeno, legumbres enteras, lácteos con lactosa, miel, jarabe de maíz, frutas altas en fructosa, xilitol, sorbitol, setas, coliflor, alcachofas, espárragos',
  bajo_histamina:
    'tomate, berenjena, espinacas, aguacate, fresas, arándanos, frambuesas, moras, kiwi, cítricos, plátano, chocolate, cacao, embutidos, quesos curados/fermentados, kéfir, chucrut, vinagre, alcohol, conservas, marisco, soja, clara de huevo líquida',
  sin_gluten:
    'trigo, centeno, cebada, espelta, avena con gluten, harina de trigo, pan común, pasta de trigo, salsa de soja convencional, cuscús',
  dieta_blanda:
    'ajo, cebolla, fritos, rebozados, picantes, alcohol, café, cítricos en exceso, tomate crudo, verduras crudas, legumbres enteras, carnes grasas',
  antirreflujo:
    'ajo, cebolla, fritos, rebozados, picantes, alcohol, café, cítricos en exceso, tomate crudo, verduras crudas, legumbres enteras, carnes grasas',
  keto:
    'azúcar, miel, siropes, cereales, legumbres, tubérculos, mayoría de frutas, alimentos procesados azucarados',
  resistencia_insulina:
    'azúcar, jarabe de maíz alto en fructosa, harinas ultra-refinadas, bollería industrial, bebidas azucaradas, zumos industriales, dulces',
  diabetes_tipo_2:
    'azúcar, jarabe de maíz, harinas blancas ultra-refinadas, bebidas azucaradas, bollería industrial, zumos industriales, dulces procesados',
  higado_graso:
    'alcohol, bebidas azucaradas, zumos de fruta, jarabe de maíz, miel, azúcar de mesa, harinas ultra-refinadas, grasas trans, bollería industrial',
  hipercolesterolemia:
    'grasas trans, carnes procesadas, embutidos grasos, manteca, aceite de palma, bollería industrial, frituras',
  dislipemia_familiar:
    'grasas saturadas en exceso, grasas trans, embutidos, carnes procesadas, lácteos enteros de alta grasa, frituras industriales',
  hashimoto:
    'gluten, trigo, centeno, cebada, espelta, lácteos de vaca, soja no fermentada, exceso de yodo, aceites de semillas industriales, azúcares añadidos, edulcorantes artificiales, ultraprocesados',
  sop:
    'azúcar añadido, jarabe de maíz, fructosa libre, harinas blancas ultra-refinadas, lácteos de vaca convencionales, grasas trans, aceites vegetales hidrogenados, zumos de fruta, alcohol',
  endometriosis:
    'gluten, trigo, carnes rojas, embutidos, lácteos de vaca, grasas trans, aceites ricos en omega-6, alcohol, exceso de cafeína, azúcares añadidos, soja no fermentada, ajo crudo, cebolla cruda, alcachofas, espárragos, coliflor, champiñones portobello',
  antiinflamatorio:
    'azúcares añadidos, harinas refinadas, aceites de semillas industriales refinados, grasas trans, carnes ultraprocesadas, alcohol',
};

export const PATTERN_EXCLUSIONS: Record<string, string> = {
  vegana:
    'carne, pescado, marisco, huevos, lácteos, miel, gelatina animal, ingredientes de origen animal',
  vegetariana:
    'carne, pescado, marisco, gelatina animal',
  paleo:
    'cereales, legumbres, lácteos, azúcar refinado, aceites vegetales procesados',
  keto:
    'azúcar, miel, siropes, cereales, legumbres, tubérculos, mayoría de frutas, alimentos procesados azucarados',
  low_carb:
    'azúcar, harinas blancas, dulces, pasta blanca, pan blanco',
  macrobiotica:
    'alimentos procesados, azúcares refinados, carnes rojas procesadas, lácteos convencionales, aditivos artificiales',
};

export interface ClinicalModelOption {
  id: string;
  key: string;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
}

export const OBJETIVOS_CLINICOS: ClinicalModelOption[] = [
  {
    id: 'General',
    key: 'general',
    label: 'General (Equilibrada)',
    labelEn: 'General (Balanced)',
    desc: 'Sin restricciones clínicas específicas. Nutrición variada y sostenible.',
    descEn: 'No specific clinical restrictions. Varied and sustainable nutrition.',
  },
  {
    id: 'FODMAP',
    key: 'fodmap',
    label: 'FODMAP (Bajo en fermentables)',
    labelEn: 'Low FODMAP (Low fermentable)',
    desc: 'Excluye oligosacáridos, disacáridos y polioles fermentables para alivio digestivo.',
    descEn: 'Excludes fermentable oligosaccharides, disaccharides, and polyols for gut relief.',
  },
  {
    id: 'SII',
    key: 'sii',
    label: 'SII (Intestino Irritable)',
    labelEn: 'IBS (Irritable Bowel Syndrome)',
    desc: 'Alivio de espasmos, hinchazón y tránsito intestinal irregular.',
    descEn: 'Relief from spasms, bloating, and irregular bowel movements.',
  },
  {
    id: 'Baja en Histamina',
    key: 'bajo_histamina',
    label: 'Baja en Histamina',
    labelEn: 'Low Histamine',
    desc: 'Evita alimentos fermentados, curados o liberadores de histamina.',
    descEn: 'Avoids fermented, aged, or histamine-releasing ingredients.',
  },
  {
    id: 'Sin Gluten',
    key: 'sin_gluten',
    label: 'Sin Gluten (Celiaquía / Sensibilidad)',
    labelEn: 'Gluten-Free (Celiac / Sensitivity)',
    desc: 'Tolerancia cero a trigo, centeno, cebada y contaminación cruzada.',
    descEn: 'Zero tolerance for wheat, rye, barley, and cross-contamination.',
  },
  {
    id: 'Dieta Blanda',
    key: 'dieta_blanda',
    label: 'Dieta Blanda (Gástrica)',
    labelEn: 'Bland Diet (Gastric)',
    desc: 'Cocciones suaves, sin grasas agresivas, picantes ni irritantes gástricos.',
    descEn: 'Gentle cooking methods without heavy fats, spices, or gastric irritants.',
  },
  {
    id: 'Antirreflujo',
    key: 'antirreflujo',
    label: 'Antirreflujo (ERGE)',
    labelEn: 'Acid Reflux / GERD',
    desc: 'Evita acidez, cítricos, menta, chocolate, ajo, cebolla y fritos.',
    descEn: 'Avoids acidity, citrus, mint, chocolate, garlic, onion, and deep frying.',
  },
  {
    id: 'Resistencia a la Insulina',
    key: 'resistencia_insulina',
    label: 'Resistencia a la Insulina',
    labelEn: 'Insulin Resistance',
    desc: 'Control glucémico estricto con bajo índice y carga glucémica.',
    descEn: 'Strict glycemic control with low glycemic index and load.',
  },
  {
    id: 'Diabetes Tipo 2',
    key: 'diabetes_tipo_2',
    label: 'Diabetes Tipo 2',
    labelEn: 'Type 2 Diabetes',
    desc: 'Prioriza fibra soluble y elimina azúcares simples y harinas refinadas.',
    descEn: 'Prioritizes soluble fiber and eliminates simple sugars and refined flours.',
  },
  {
    id: 'Hígado Graso',
    key: 'higado_graso',
    label: 'Hígado Graso (EHNA)',
    labelEn: 'Fatty Liver (NAFLD)',
    desc: 'Protección hepática: cero fructosa libre, alcohol ni grasas trans.',
    descEn: 'Liver protection: zero free fructose, alcohol, or trans fats.',
  },
  {
    id: 'Hipercolesterolemia',
    key: 'hipercolesterolemia',
    label: 'Hipercolesterolemia',
    labelEn: 'High Cholesterol',
    desc: 'Reducción de grasas saturadas proaterogénicas y fitoesteroles activos.',
    descEn: 'Reduction of pro-atherogenic saturated fats and active phytosterols.',
  },
  {
    id: 'Dislipemia Familiar',
    key: 'dislipemia_familiar',
    label: 'Dislipemia Familiar',
    labelEn: 'Familial Dyslipidemia',
    desc: 'Optimización lipídica clínica con grasas monoinsaturadas y omega-3.',
    descEn: 'Clinical lipid optimization with monounsaturated fats and omega-3.',
  },
  {
    id: 'Hashimoto',
    key: 'hashimoto',
    label: 'Hashimoto (Tiroides Autoinmune)',
    labelEn: 'Hashimoto (Autoimmune Thyroid)',
    desc: 'Protocolo autoinmune sin gluten, lácteos bovinos ni soja inflamatoria.',
    descEn: 'Autoimmune protocol without gluten, bovine dairy, or inflammatory soy.',
  },
  {
    id: 'SOP',
    key: 'sop',
    label: 'SOP (Ovario Poliquístico)',
    labelEn: 'PCOS (Polycystic Ovary Syndrome)',
    desc: 'Regulación hormonal, sensibilización insulínica y anti-androgénica.',
    descEn: 'Hormonal regulation, insulin sensitization, and anti-androgenic nutrition.',
  },
  {
    id: 'Endometriosis',
    key: 'endometriosis',
    label: 'Endometriosis',
    labelEn: 'Endometriosis',
    desc: 'Dieta antiinflamatoria pélvica, depuración estrogénica y sin carnes rojas.',
    descEn: 'Anti-inflammatory pelvic diet, estrogen clearance, and no red meats.',
  },
  {
    id: 'Antiinflamatorio',
    key: 'antiinflamatorio',
    label: 'Antiinflamatorio General',
    labelEn: 'Anti-inflammatory General',
    desc: 'Rico en polifenoles, omega-3 y antioxidantes frente a inflamación crónica.',
    descEn: 'Rich in polyphenols, omega-3, and antioxidants against chronic inflammation.',
  },
];

export const PATRONES_ALIMENTARIOS: ClinicalModelOption[] = [
  {
    id: 'Omnívora',
    key: 'omnivora',
    label: 'Omnívora Flexible',
    labelEn: 'Flexible Omnivore',
    desc: 'Incluye alimentos de todos los grupos con énfasis en alimentos reales.',
    descEn: 'Includes all food groups with emphasis on whole, real foods.',
  },
  {
    id: 'Vegetariana',
    key: 'vegetariana',
    label: 'Ovolactovegetariana',
    labelEn: 'Vegetarian (Ovo-lacto)',
    desc: 'Sin carnes ni pescados. Permite huevos y lácteos seleccionados.',
    descEn: 'No meat or fish. Allows selected eggs and dairy.',
  },
  {
    id: 'Vegana',
    key: 'vegana',
    label: '100% Vegetal (Vegana)',
    labelEn: 'Plant-Based (Vegan)',
    desc: 'Exclusivamente ingredientes de origen vegetal con sustitución proteica equilibrada.',
    descEn: 'Exclusively plant-derived ingredients with balanced protein replacement.',
  },
  {
    id: 'Paleo',
    key: 'paleo',
    label: 'Paleodieta',
    labelEn: 'Paleo Diet',
    desc: 'Inspirada en el cazador-recolector: sin cereales, legumbres ni lácteos.',
    descEn: 'Hunter-gatherer inspired: no grains, legumes, or dairy.',
  },
  {
    id: 'Keto',
    key: 'keto',
    label: 'Cetogénica (Keto)',
    labelEn: 'Ketogenic (Keto)',
    desc: 'Muy baja en hidratos de carbono (<30g/día) y alta en grasas saludables.',
    descEn: 'Very low carbohydrate (<30g/day) and high healthy fat.',
  },
  {
    id: 'Low Carb',
    key: 'low_carb',
    label: 'Baja en Carbohidratos (Low Carb)',
    labelEn: 'Low Carb',
    desc: 'Reducción moderada de harinas, panes y azúcares manteniendo verduras y frutas.',
    descEn: 'Moderate reduction of flours, bread, and sugar while preserving veggies and fruits.',
  },
  {
    id: 'Macrobiótica',
    key: 'macrobiotica',
    label: 'Macrobiótica',
    labelEn: 'Macrobiotic',
    desc: 'Cereales integrales ecológicos, verduras de temporada y algas.',
    descEn: 'Organic whole grains, seasonal vegetables, and seaweeds.',
  },
];

/**
 * Normaliza cualquier clave clínica a su identificador de diccionario
 */
export function normalizeClinicalKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Cruza las preferencias del usuario y alérgenos con el diccionario clínico
 * para obtener una lista consolidada y deduplicada de ingredientes estrictamente prohibidos.
 */
export function getClinicalExclusions(params: {
  objetivoClinico?: string;
  patronAlimentario?: string;
  preferencias?: string[];
  alergenos?: string[];
}): string[] {
  const allTerms = new Set<string>();

  const processKey = (raw: string) => {
    if (!raw) return;
    const norm = normalizeClinicalKey(raw);

    // Mapeo inteligente con los modelos clínicos predefinidos
    const matchingObj = OBJETIVOS_CLINICOS.find(
      (o) =>
        o.id.toLowerCase() === raw.toLowerCase() ||
        o.label.toLowerCase() === raw.toLowerCase() ||
        o.key.toLowerCase() === norm ||
        normalizeClinicalKey(o.id) === norm
    );

    const matchingPatron = PATRONES_ALIMENTARIOS.find(
      (p) =>
        p.id.toLowerCase() === raw.toLowerCase() ||
        p.label.toLowerCase() === raw.toLowerCase() ||
        p.key.toLowerCase() === norm ||
        normalizeClinicalKey(p.id) === norm
    );

    const effectiveKeys = new Set<string>([norm]);
    if (matchingObj) effectiveKeys.add(matchingObj.key);
    if (matchingPatron) effectiveKeys.add(matchingPatron.key);

    for (const k of effectiveKeys) {
      // Búsqueda en CLINICAL_EXCLUSIONS
      for (const [dictKey, exclusions] of Object.entries(CLINICAL_EXCLUSIONS)) {
        if (
          k === dictKey ||
          k.includes(dictKey) ||
          dictKey.includes(k) ||
          (k.includes('histamina') && dictKey.includes('histamina'))
        ) {
          exclusions.split(',').forEach((item) => allTerms.add(item.trim()));
        }
      }

      // Búsqueda en PATTERN_EXCLUSIONS
      for (const [dictKey, exclusions] of Object.entries(PATTERN_EXCLUSIONS)) {
        if (k === dictKey || k.includes(dictKey) || dictKey.includes(k)) {
          exclusions.split(',').forEach((item) => allTerms.add(item.trim()));
        }
      }
    }
  };

  if (params.objetivoClinico) processKey(params.objetivoClinico);
  if (params.patronAlimentario) processKey(params.patronAlimentario);

  if (params.preferencias && Array.isArray(params.preferencias)) {
    params.preferencias.forEach((p) => processKey(p));
  }

  if (params.alergenos && Array.isArray(params.alergenos)) {
    params.alergenos.forEach((a) => {
      const cleanAlergeno = a.trim();
      if (cleanAlergeno) {
        allTerms.add(cleanAlergeno);
        processKey(cleanAlergeno);
      }
    });
  }

  return Array.from(allTerms).filter(Boolean);
}

/**
 * Formatea la cláusula de cortafuegos clínico lista para ser inyectada en el prompt de Gemini
 */
export function buildClinicalFirewallPrompt(exclusions: string[], lang: 'es' | 'en' = 'es'): string {
  if (!exclusions || exclusions.length === 0) return '';

  const exclusionsList = exclusions.join(', ');

  if (lang === 'en') {
    return `CLINICAL FIREWALL & MEDICAL SAFETY DIRECTIVE:
ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusionsList}].
Zero tolerance: you MUST NEVER include, suggest or prescribe any of these prohibited items or derivatives in the recipe ingredients, steps or tips. Always replace them with culinary and nutritionally sound alternatives.`;
  }

  return `CORTAFUEGOS CLÍNICO Y SEGURIDAD MÉDICA OBLIGATORIA:
ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusionsList}].
Tolerancia cero: está TERMINANTEMENTE PROHIBIDO incluir o sugerir cualquiera de estos ingredientes prohibidos o sus derivados directos en los ingredientes, pasos o consejos de la receta. Sustitúyelos por alternativas culinarias y nutricionales 100% seguras.`;
}
