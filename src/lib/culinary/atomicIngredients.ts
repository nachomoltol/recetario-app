/**
 * Motor de Atomicidad Culinaria (Ley Universal: Un ingrediente por línea).
 * Descompone de forma limpia y semántica líneas que agrupan múltiples alimentos
 * en ítems atómicos individuales, protegiendo categóricamente nombres compuestos
 * legítimos (ej. "aceite de oliva", "queso de cabra", "leche de coco", "pimienta negra")
 * y vinculando modificadores de técnica o corte (ej. "picado", "triturado", "al gusto")
 * a su sustantivo rector correspondiente.
 */

import type { ScaledShoppingInputItem } from './consolidateShoppingItems';
import type { ExtractedIngredient } from '@/lib/gemini/schema';

/**
 * Catálogo canónico de entidades y alimentos compuestos legítimos en gastronomía española.
 * Estos términos son conceptualmente un único alimento y NUNCA deben fragmentarse.
 */
export const COMPOUND_PROTECTED_TERMS: readonly string[] = [
  // Grasas y aceites
  'aceite de oliva',
  'aceite de oliva virgen',
  'aceite de oliva virgen extra',
  'aove',
  'aceite de girasol',
  'aceite de sesamo',
  'aceite de sésamo',
  'aceite de coco',
  'aceite de maiz',
  'aceite de maíz',
  'aceite de cacahuete',

  // Lácteos, quesos y cremas
  'queso de cabra',
  'queso de oveja',
  'queso de untar',
  'queso crema',
  'queso azul',
  'queso rallado',
  'queso parmesano',
  'queso mozzarella',
  'queso feta',
  'queso cheddar',
  'queso ricota',
  'queso ricotta',
  'crema de leche',
  'nata para cocinar',
  'nata liquida',
  'nata montada',
  'crema agria',
  'crema de cacahuete',
  'mantequilla de cacahuete',

  // Salsas, caldos y fondos
  'salsa de soja',
  'salsa de tomate',
  'salsa de ostras',
  'salsa de pescado',
  'salsa agridulce',
  'salsa barbacoa',
  'salsa perrins',
  'salsa worcestershire',
  'caldo de pollo',
  'caldo de ave',
  'caldo de verduras',
  'caldo de carne',
  'caldo de pescado',
  'caldo de cocido',

  // Bebidas vegetales y lácteas
  'leche de coco',
  'leche de almendras',
  'leche de avena',
  'leche de soja',
  'leche de arroz',

  // Harinas y almidones
  'harina de trigo',
  'harina de maiz',
  'harina de maíz',
  'harina de avena',
  'harina de arroz',
  'harina de fuerza',
  'harina de almendra',
  'harina integral',
  'pasta de tomate',
  'tomate concentrado',
  'tomate frito',
  'tomate triturado',
  'tomate seco',
  'tomates secos',

  // Cortes cárnicos y aves
  'diente de ajo',
  'dientes de ajo',
  'cabeza de ajo',
  'cabezas de ajo',
  'lomo de cerdo',
  'cinta de lomo',
  'pechuga de pollo',
  'pechuga de pavo',
  'costilla de cerdo',
  'costillas de cerdo',
  'muslo de pollo',
  'muslos de pollo',
  'contramuslo de pollo',
  'contramuslos de pollo',
  'alita de pollo',
  'alitas de pollo',
  'carne picada',
  'carne molida',
  'carne de ternera',
  'carne de cerdo',

  // Frutos y semillas
  'frutos secos',
  'frutos del bosque',
  'frutos rojos',
  'copos de avena',
  'levadura de panadero',
  'levadura quimica',
  'levadura química',
  'levadura fresca',
  'polvo de hornear',
  'polvos de hornear',
  'semillas de sesamo',
  'semillas de sésamo',
  'semillas de chia',
  'semillas de chía',
  'semillas de lino',
  'semillas de girasol',
  'semillas de calabaza',

  // Especias y condimentos multi-palabra
  'pimienta negra',
  'pimienta blanca',
  'pimienta verde',
  'pimienta rosa',
  'pimienta de jamaica',
  'pimenton dulce',
  'pimentón dulce',
  'pimenton picante',
  'pimentón picante',
  'pimenton de la vera',
  'pimentón de la vera',
  'nuez moscada',
  'nueces de macadamia',
  'hierbas provenzales',
  'finas hierbas',
  'hierbabuena',
  'hierba buena',

  // Vegetales y legumbres con nombre compuesto
  'pimiento rojo',
  'pimiento verde',
  'pimiento amarillo',
  'pimiento morron',
  'pimiento morrón',
  'pimientos de padron',
  'pimientos de padrón',
  'cebolla morada',
  'cebolla dulce',
  'cebolla tierna',
  'cebolla blanca',
  'cebolla fresca',
  'alubias blancas',
  'alubias rojas',
  'alubias negras',
  'judias verdes',
  'judías verdes',
  'judias blancas',
  'fideos de sopa',
  'fideo de sopa',

  // Vinos y vinagres
  'vino blanco',
  'vino tinto',
  'vino de jerez',
  'vino dulce',
  'vinagre blanco',
  'vinagre de modena',
  'vinagre de módena',
  'vinagre de manzana',
  'vinagre de arroz',

  // Azúcares y endulzantes
  'azucar moreno',
  'azúcar moreno',
  'azucar glas',
  'azúcar glas',
  'azucar de cana',
  'azúcar de caña',

  // Arroces con variedad
  'arroz blanco',
  'arroz integral',
  'arroz basmati',
  'arroz jazmin',
  'arroz jazmín',
  'arroz bomba',
  'arroz redondo',
];

/**
 * Modificadores culinarios de técnica, corte, cocción o presentación que
 * NO constituyen un ingrediente por sí mismos y deben ligarse a su sustantivo rector.
 */
export const CULINARY_MODIFIERS_REGEX =
  /\b(picad[oa]s?|triturad[oa]s?|trocead[oa]s?|cortad[oa]s?|laminad[oa]s?|rallad[oa]s?|molid[oa]s?|cocid[oa]s?|asad[oa]s?|hornead[oa]s?|frit[oa]s?|escalfad[oa]s?|pochad[oa]s?|desmigad[oa]s?|deshuesad[oa]s?|pelad[oa]s?|limpi[oa]s?|lavad[oa]s?|desmenuzad[oa]s?|batid[oa]s?|escurrid[oa]s?|en\s+dados|en\s+cubos|en\s+juliana|en\s+rodajas|en\s+tiras|en\s+trozos|en\s+polvo|en\s+conserva|de\s+bote|al\s+gusto|a\s+gusto|para\s+decorar|para\s+servir|para\s+ali[ñn]ar|opcional|virgen\s+extra|virgen|fresc[oa]s?|sec[oa]s?|en\s+pomada|punto\s+pomada|a\s+temperatura\s+ambiente|al\s+vac[ií]o|c\/n|cn|reci[eé]n\s+molid[oa]s?)\b/i;

/**
 * Sustantivos nucleares de alimentos reconocibles en cocina española para validar
 * que un segmento extraído contiene una materia prima real e independiente.
 */
export const CULINARY_CORE_NOUNS_REGEX =
  /\b(sal|pimienta|nuez\s+moscada|comino|or[eé]gano|albahaca|tomillo|romero|perejil|cilantro|canela|curry|piment[oó]n|laurel|eneldo|c[uú]rcuma|azafr[aá]n|clavo|vainilla|an[ií]s|cardamomo|jengibre|ajo|ajos|diente(s)?\s+de\s+ajo|cebolla(s)?|puerro(s)?|apio|zanahoria(s)?|tomate(s)?|pimiento(s)?|patata(s)?|papa(s)?|calabac[ií]n(es)?|berenjena(s)?|espinaca(s)?|champi[nñ][oó]n(es)?|seta(s)?|lechuga(s)?|pepino(s)?|br[oó]coli|col|coliflor|alcachofa(s)?|esp[aá]rrago(s)?|guisante(s)?|jud[ií]a(s)?|haba(s)?|ma[ií]z|manzana(s)?|pl[aá]tano(s)?|pera(s)?|naranja(s)?|lim[oó]n(es)?|lima(s)?|fresa(s)?|ar[aá]ndano(s)?|frambuesa(s)?|mora(s)?|uva(s)?|aguacate(s)?|mango(s)?|pi[nñ]a(s)?|melocot[oó]n(es)?|carne(s)?|pollo|ternera|cerdo|pavo|pescado(s)?|at[uú]n|salm[oó]n|merluza|bacalao|gamba(s)?|langostino(s)?|mejill[oó]n(es)?|almeja(s)?|calamar(es)?|pulpo|jam[oó]n|bacon|panceta|salchicha(s)?|chorizo(s)?|queso(s)?|leche|nata|yogur(es)?|huevo(s)?|mantequilla|aceite(s)?|vinagre(s)?|soja|miel|az[uú]car|harina(s)?|arroz|pasta(s)?|pan|legumbre(s)?|lenteja(s)?|garbanzo(s)?|alubia(s)?|avena|quinoa|cusc[uú]s|fideo(s)?|macarr[oó]n(es)?|espagueti(s)?|nuez|nueces|almendra(s)?|avellana(s)?|anacardo(s)?|cacahuete(s)?|pistacho(s)?)\b/i;

/**
 * Descompone un nombre de ingrediente que agrupa múltiples alimentos en una lista de
 * ingredientes atómicos individuales, protegiendo nombres compuestos y unificando cortes.
 *
 * Ejemplos:
 * - "Sal, pimienta y nuez moscada" -> ["Sal", "pimienta", "nuez moscada"]
 * - "Ajo y perejil picado" -> ["Ajo", "perejil picado"]
 * - "Aceite de oliva virgen extra" -> ["Aceite de oliva virgen extra"]
 * - "Tomate, triturado" -> ["Tomate triturado"]
 * - "Pimiento rojo y verde" -> ["Pimiento rojo", "pimiento verde"]
 */
export function splitCompositeIngredient(rawName: string): string[] {
  if (!rawName || typeof rawName !== 'string') return [];
  const text = rawName.trim();
  if (!text) return [];

  // Si no contiene conectores de coordinación explícitos (coma o conjunciones 'y' / 'e'), es atómico
  if (!/,\s*|\s+(?:y|e)\s+/i.test(text)) {
    return [text];
  }

  // Verificar si la frase completa es un compuesto protegido
  const lowerText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const compound of COMPOUND_PROTECTED_TERMS) {
    const normCompound = compound
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (lowerText === normCompound) {
      return [text.replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim()];
    }
  }

  // Desglosar inicialmente por comas y conjunciones coordinadas
  const rawParts = text
    .split(/\s*,\s*|\s+(?:y|e)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParts.length <= 1) {
    return [text];
  }

  // Unificar modificadores de corte o estado que hayan quedado separados por coma
  const mergedSegments: string[] = [];

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    const isPureModifier =
      CULINARY_MODIFIERS_REGEX.test(part) && !CULINARY_CORE_NOUNS_REGEX.test(part);

    if (isPureModifier && mergedSegments.length > 0) {
      // Adjuntar modificador (ej. "triturado", "en dados", "picado", "al gusto") al segmento anterior
      mergedSegments[mergedSegments.length - 1] += ` ${part}`;
    } else {
      mergedSegments.push(part);
    }
  }

  if (mergedSegments.length <= 1) {
    return [mergedSegments[0] || text];
  }

  // Validar y expandir segmentos
  const validSegments: string[] = [];
  let headNoun = '';

  for (let i = 0; i < mergedSegments.length; i++) {
    const seg = mergedSegments[i];
    const hasCoreNoun = CULINARY_CORE_NOUNS_REGEX.test(seg);

    if (hasCoreNoun) {
      const match = seg.match(CULINARY_CORE_NOUNS_REGEX);
      if (match) {
        headNoun = match[0];
      }
      validSegments.push(seg);
    } else if (
      headNoun &&
      /\b(verde|rojo|roja|amarillo|amarilla|blanco|blanca|negro|negra|morado|morada|dulce|picante|integral)\b/i.test(
        seg
      )
    ) {
      // Hereda el sustantivo rector (ej: "pimiento verde" a partir de "pimiento rojo y verde")
      validSegments.push(`${headNoun} ${seg}`.trim());
    } else {
      // Si un segmento no es ni sustantivo reconocible ni adjetivo dependiente, no romper arbitrariamente
      return [text];
    }
  }

  return validSegments.length > 1 ? validSegments : [text];
}

/**
 * Expande una lista de entradas de compra escaladas desagregando líneas compuestas
 * en ítems atómicos individuales, distribuyendo cantidades y asignando a cada uno
 * su pasillo de supermercado físico exacto.
 */
export function expandAtomicShoppingItems(
  items: ScaledShoppingInputItem[],
  classifier?: (name: string, existingAisle?: string | null) => string
): ScaledShoppingInputItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: ScaledShoppingInputItem[] = [];

  for (const item of items) {
    const rawName = (item.nombre_limpio || item.nombre_crudo || '').trim();
    if (!rawName) {
      result.push(item);
      continue;
    }

    const splitNames = splitCompositeIngredient(rawName);

    if (splitNames.length <= 1) {
      result.push(item);
      continue;
    }

    const numParts = splitNames.length;
    const uLower = (item.unidad || '').toLowerCase().trim();
    const isSubjectiveUnit =
      /^(al\s+gusto|a\s+gusto|to\s+taste|pizca|pizcas|c\/n|cn|gota|gotas)$/i.test(uLower);

    splitNames.forEach((atomicName, idx) => {
      const rawNum =
        typeof item.cantidad === 'number'
          ? item.cantidad
          : parseFloat(String(item.cantidad || '1')) || 1;
      let atomicCantidad: number = rawNum;
      let atomicGramos = typeof item.gramos_calculados === 'number' ? item.gramos_calculados : 0;

      if (!isSubjectiveUnit) {
        atomicCantidad = Math.max(0.1, Math.round((rawNum / numParts) * 10) / 10);
        if (atomicGramos > 0) {
          atomicGramos = Math.max(1, Math.round(atomicGramos / numParts));
        }
      }

      const assignedAisle = classifier
        ? classifier(atomicName, null)
        : item.pasillo_supermercado || 'Despensa y Especias';

      result.push({
        ...item,
        id: item.id ? `${item.id}_part_${idx + 1}` : undefined,
        nombre_limpio: atomicName,
        nombre_crudo: atomicName,
        cantidad: atomicCantidad,
        gramos_calculados: atomicGramos,
        pasillo_supermercado: assignedAisle,
      });
    });
  }

  return result;
}

/**
 * Expande ingredientes extraídos durante la ingesta multimodal desagregando
 * líneas compuestas en ingredientes atómicos individuales antes de persistir.
 */
export function expandAtomicExtractedIngredients(
  items: ExtractedIngredient[],
  classifier?: (name: string, existingAisle?: string | null) => string
): ExtractedIngredient[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: ExtractedIngredient[] = [];

  for (const item of items) {
    const rawName = (item.nombre_limpio || item.nombre_crudo || '').trim();
    if (!rawName) {
      result.push(item);
      continue;
    }

    const splitNames = splitCompositeIngredient(rawName);

    if (splitNames.length <= 1) {
      result.push(item);
      continue;
    }

    const numParts = splitNames.length;
    const uLower = (item.unidad || '').toLowerCase().trim();
    const isSubjectiveUnit =
      /^(al\s+gusto|a\s+gusto|to\s+taste|pizca|pizcas|c\/n|cn|gota|gotas)$/i.test(uLower);

    splitNames.forEach((atomicName) => {
      let atomicCantidad = item.cantidad;
      let atomicGramos = item.gramos_estimados || 0;

      if (!isSubjectiveUnit) {
        atomicCantidad = Math.max(0.1, Math.round((item.cantidad / numParts) * 10) / 10);
        if (atomicGramos > 0) {
          atomicGramos = Math.max(1, Math.round(atomicGramos / numParts));
        }
      }

      const assignedAisle = classifier
        ? classifier(atomicName, null)
        : item.pasillo_supermercado || 'Despensa y Especias';

      result.push({
        ...item,
        nombre_limpio: atomicName,
        nombre_crudo: atomicName,
        cantidad: atomicCantidad,
        gramos_estimados: atomicGramos,
        pasillo_supermercado: assignedAisle,
      });
    });
  }

  return result;
}
