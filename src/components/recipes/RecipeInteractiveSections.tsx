'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Sparkles,
  ChevronDown,
  Clock,
  Thermometer,
  Flame,
  ChefHat,
  Eye,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { RecetaIngrediente, Paso } from '@/types/recipe';
import {
  scaleIngredientsWithCulinaryHeuristics,
  scaleCookingTime,
  isBakingOrPastryContext,
} from '@/lib/culinary/scaler';
import { replaceIngredientInText } from '@/lib/culinary/textReplacer';
import { scaleStepQuantities } from '@/lib/culinary/stepQuantityScaler';
import { ServingsScaler } from './ServingsScaler';
import { ShoppingListMode } from './ShoppingListMode';
import { FormattedText } from '@/components/ui/FormattedText';
import { FeatureInfoTrigger } from '@/components/ui/FeatureInfoTrigger';
import dynamic from 'next/dynamic';

const ProSubscriptionModal = dynamic(
  () => import('@/components/subscription/ProSubscriptionModal').then((m) => m.ProSubscriptionModal),
  { ssr: false }
);
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { SubstituteOption } from '@/app/actions/suggestSubstitute';

export type NivelCulinarioUI = 'Principiante' | 'Intermedio' | 'Avanzado';

export function normalizeNivelCulinario(val?: string | null): NivelCulinarioUI {
  if (!val) return 'Intermedio';
  const clean = val.trim().toLowerCase();
  if (clean === 'avanzado' || clean === 'advanced') return 'Avanzado';
  if (clean === 'principiante' || clean === 'beginner') return 'Principiante';
  return 'Intermedio';
}

/**
 * Normaliza la temperatura de cocción técnica según el método (horno vs fuego directo en sartén/olla/plancha)
 */
function formatStepHeat(
  tempCelsius: number | null | undefined,
  instructionText: string,
  potenciaFuego?: string | null,
  lang: 'es' | 'en' = 'es'
): { label: string; isBaking: boolean } | null {
  const norm = instructionText.toLowerCase();

  const isBakingText =
    /\b(horno|hornear|hornea|hornealo|horneala|horneados|horneadas|precalentar|precalienta|oven|bake|baking|baked|airfryer|air\s*fryer|freidora\s+de\s+aire)\b/i.test(
      norm
    );

  const potencia = (potenciaFuego || '').trim().toLowerCase();

  if (potencia === 'horno' || isBakingText) {
    return {
      label:
        typeof tempCelsius === 'number' && tempCelsius > 0
          ? `${tempCelsius}°C`
          : lang === 'en'
          ? 'Oven'
          : 'Horno',
      isBaking: true,
    };
  }

  if (potencia === 'alto') {
    return { label: lang === 'en' ? 'High heat' : 'Fuego alto', isBaking: false };
  } else if (potencia === 'medio-alto') {
    return { label: lang === 'en' ? 'Medium-high heat' : 'Fuego medio-alto', isBaking: false };
  } else if (potencia === 'medio') {
    return { label: lang === 'en' ? 'Medium heat' : 'Fuego medio', isBaking: false };
  } else if (potencia === 'suave') {
    return { label: lang === 'en' ? 'Low heat' : 'Fuego suave / lento', isBaking: false };
  }

  // Fallback termodinámico mediante temperatura_celsius clásica
  if (typeof tempCelsius === 'number' && tempCelsius > 0) {
    if (tempCelsius >= 190) {
      return {
        label: lang === 'en' ? 'High heat' : 'Fuego alto',
        isBaking: false,
      };
    } else if (tempCelsius >= 170) {
      return {
        label: lang === 'en' ? 'Medium-high heat' : 'Fuego medio-alto',
        isBaking: false,
      };
    } else if (tempCelsius >= 130) {
      return {
        label: lang === 'en' ? 'Medium heat' : 'Fuego medio',
        isBaking: false,
      };
    } else {
      return {
        label: lang === 'en' ? 'Low heat' : 'Fuego suave / lento',
        isBaking: false,
      };
    }
  }

  return null;
}

/**
 * Comprueba si dos textos de instrucción son prácticamente iguales para forzar
 * la generación de un relato pedagógico expandido y visiblemente distinto.
 */
function areInstructionsTooSimilar(baseText: string, candidateText?: string | null): boolean {
  if (!candidateText) return true;
  const a = baseText
    .toLowerCase()
    .replace(/[^a-záéíóúñ0-9]/gi, '')
    .trim();
  const b = candidateText
    .toLowerCase()
    .replace(/[^a-záéíóúñ0-9]/gi, '')
    .trim();
  if (!b) return true;
  if (a === b) return true;
  // Si el candidato es apenas un 20% más largo o contiene exactamente el mismo arranque sin desarrollo didáctico
  if (b.length < a.length * 1.25 && (b.includes(a) || a.includes(b))) {
    return true;
  }
  return false;
}

/**
 * Calibración pedagógica para Nivel Principiante (PRO):
 * Garantiza que:
 * 1. El relato principal (instruccion_principiante) cambie de forma EVIDENTE y PALPABLE
 *    respecto al Nivel Intermedio (paso.instruccion), desglosando el paso con explicación guiada.
 * 2. Exista siempre una tarjeta sensorial rica (cambios de color, texturas y aromas clave).
 * 3. Incluya advertencias de seguridad térmica y precauciones claras para no quemar ni dejar crudo el alimento.
 */
function buildBeginnerPedagogicalCalibration(
  baseInstruction: string,
  explicitBeginnerInstruction: string | undefined | null,
  explicitSensoryCue: string | undefined | null,
  potenciaFuego: string | undefined | null,
  tempCelsius: number | undefined | null,
  tiempoMin: number | undefined | null,
  lang: 'es' | 'en' = 'es',
  isFirstBakingStep: boolean = true
): {
  beginnerInstruction: string;
  sensoryCue: string;
  thermalSafetyWarning: string;
} {
  const cleanBase = baseInstruction.trim().replace(/\.+$/, '');
  const norm = cleanBase.toLowerCase();

  const isBaking =
    potenciaFuego === 'horno' ||
    /\b(horno|hornear|hornea|precalienta|precalentar|airfryer|freidora\s+de\s+aire|oven|bake|roast|gratinar|gratina)\b/i.test(
      norm
    );
  const isSearingOrFrying =
    /\b(sofreír|sofríe|sofrie|dorar|dora|saltear|saltea|freír|fríe|frie|pochar|pocha|sartén|sarten|aceite|marcar|marca|plancha|sauté|sear|fry|brown)\b/i.test(
      norm
    );
  const isBoilingOrSimmering =
    /\b(hervir|hierve|cocer|cuece|caldo|agua|ebullición|ebullicion|fuego\s+lento|reducir|reduce|guisar|cocinar\s+a\s+fuego|boil|simmer|broth)\b/i.test(
      norm
    );
  const isCuttingOrPrep =
    /\b(cortar|corta|picar|pica|pelar|pela|trocear|trocea|laminar|lamina|rallar|ralla|limpiar|limpia|lavar|lava|chop|dice|slice|mince|peel)\b/i.test(
      norm
    );
  const isMixingOrEmulsifying =
    /\b(mezclar|mezcla|batir|bate|integrar|integra|remover|remueve|triturar|tritura|amasar|amasa|emulsionar|incorporar|incorpora|añadir|añade|agregar|agrega|mix|whisk|blend|stir)\b/i.test(
      norm
    );

  // 1. Relato pedagógico expandido para Principiante (visiblemente distinto a Intermedio a simple vista)
  let beginnerInstruction = (explicitBeginnerInstruction || '').trim();
  if (areInstructionsTooSimilar(cleanBase, beginnerInstruction)) {
    const lowerFirstBase =
      cleanBase.length > 1
        ? cleanBase.charAt(0).toLowerCase() + cleanBase.slice(1)
        : cleanBase.toLowerCase();

    if (lang === 'en') {
      if (isBaking) {
        if (isFirstBakingStep) {
          beginnerInstruction = `Step-by-step beginner guide: First, verify that your oven or air fryer is fully preheated${
            tempCelsius ? ` to ${tempCelsius}°C` : ''
          } so the food starts cooking evenly right away without drying out. Next, ${lowerFirstBase}. Place the tray in the center rack so heat circulates all around, and check progress${
            tiempoMin ? ` around the ${tiempoMin}-minute mark` : ' during the final minutes'
          } to ensure the interior is tender and the outside doesn't over-brown.`;
        } else {
          beginnerInstruction = `Step-by-step beginner guide: With the oven already actively hot${
            tempCelsius ? ` at ${tempCelsius}°C` : ''
          }, ${lowerFirstBase}. Keep the oven door closed so heat remains constant, and check progress${
            tiempoMin ? ` around the ${tiempoMin}-minute mark` : ''
          } to ensure it cooks through evenly.`;
        }
      } else if (isSearingOrFrying) {
        beginnerInstruction = `Step-by-step beginner guide: Place your pan over ${
          potenciaFuego ? `${potenciaFuego} heat` : 'medium heat'
        } and let it warm up for 30 to 45 seconds before starting so the food doesn't stick to the surface. Now, ${lowerFirstBase}. Move the ingredients gently and continuously with a wooden or silicone spatula so every piece receives even heat without scorching the edges or burning the oil.`;
      } else if (isBoilingOrSimmering) {
        beginnerInstruction = `Step-by-step beginner guide: Regulate the burner carefully to keep a controlled temperature throughout the liquid. Proceed to ${lowerFirstBase}. Stir occasionally by sliding a spoon across the bottom of the pot so nothing sticks, allowing flavors to concentrate while the texture cooks evenly all the way through.`;
      } else if (isCuttingOrPrep) {
        beginnerInstruction = `Step-by-step beginner guide: Set up a stable cutting board on a flat counter and curl your fingertips slightly inward ("claw grip") to protect your hands. Carefully ${lowerFirstBase}. Take your time to make all pieces as uniform in size as possible—this guarantees they will cook at the exact same speed in the next steps without smaller pieces burning.`;
      } else if (isMixingOrEmulsifying) {
        beginnerInstruction = `Step-by-step beginner guide: Use a wide bowl or container that gives you plenty of room to work comfortably without spilling. Slowly ${lowerFirstBase}. Use a flexible spatula to scrape down the sides and bottom of the container using enveloping movements until you achieve a smooth, lump-free mixture.`;
      } else {
        beginnerInstruction = `Step-by-step beginner guide: Have all your utensils and measured ingredients ready on the counter before starting this action. Calmly ${lowerFirstBase}. Verify that the texture, moisture, and seasoning look uniform across the dish before moving on to the next step.`;
      }
    } else {
      if (isBaking) {
        if (isFirstBakingStep) {
          beginnerInstruction = `Guía paso a paso para principiantes: En primer lugar, comprueba que el horno o freidora de aire haya alcanzado la temperatura adecuada${
            tempCelsius ? ` (${tempCelsius}°C)` : ''
          } antes de meter los alimentos para que no queden crudos por dentro. A continuación, ${lowerFirstBase}. Coloca la bandeja a altura media para que el calor envuelva el plato por igual y vigila los últimos minutos${
            tiempoMin ? ` (de los ${tiempoMin} min estimados)` : ''
          } para lograr un dorado uniforme sin que se tueste en exceso.`;
        } else {
          beginnerInstruction = `Guía paso a paso para principiantes: Con el horneado ya en marcha a temperatura adecuada${
            tempCelsius ? ` (${tempCelsius}°C)` : ''
          }, ${lowerFirstBase}. Mantén la puerta del horno cerrada para no perder calor y vigila el progreso${
            tiempoMin ? ` durante los ${tiempoMin} min estimados` : ''
          } para asegurar que se cocine de forma homogénea sin quemarse.`;
        }
      } else if (isSearingOrFrying) {
        beginnerInstruction = `Guía paso a paso para principiantes: Calienta primero el recipiente a fuego ${
          potenciaFuego || 'medio'
        } durante 30-40 segundos para que la base tome temperatura y los ingredientes no se peguen. Seguidamente, ${lowerFirstBase}. Remueve con suavidad pero de forma constante usando una espátula de madera o silicona, repartiendo el calor por igual para que se cocine por dentro sin quemarse por fuera.`;
      } else if (isBoilingOrSimmering) {
        beginnerInstruction = `Guía paso a paso para principiantes: Ajusta la potencia del fuego para mantener un hervor controlado y constante sin que el líquido se desborde. Paso seguido, ${lowerFirstBase}. Pasa una cuchara de vez en cuando por el fondo de la cazuela para evitar que los ingredientes se agarren y asegurar una cocción tierna y homogénea.`;
      } else if (isCuttingOrPrep) {
        beginnerInstruction = `Guía paso a paso para principiantes: Prepara una tabla firme sobre la encimera y sujeta el ingrediente curvando las yemas de los dedos hacia dentro ("postura de garra") para mayor seguridad. Con calma, ${lowerFirstBase}. Procura que todos los trozos queden de un grosor muy similar; así se cocinarán exactamente al mismo tiempo sin que unos se quemen y otros queden crudos.`;
      } else if (isMixingOrEmulsifying) {
        beginnerInstruction = `Guía paso a paso para principiantes: Elige un bol o recipiente amplio que te permita trabajar con holgura sin salpicar fuera. De forma progresiva, ${lowerFirstBase}. Ayúdate de una lengua o espátula repasando bien las paredes y el fondo con movimientos envolventes hasta que no queden grumos ni partes secas sin integrar.`;
      } else {
        beginnerInstruction = `Guía paso a paso para principiantes: Ten preparados a mano los ingredientes y utensilios antes de iniciar este paso para trabajar sin prisas. A continuación, ${lowerFirstBase}. Asegúrate de que todo quede bien distribuido y en su punto de textura antes de pasar al siguiente paso de la receta.`;
      }
    }
  }

  // 2. Tarjeta / Badge Sensorial (descriptor_sensorial) prominente
  let sensoryCue = (explicitSensoryCue || '').trim();
  if (!sensoryCue) {
    if (lang === 'en') {
      if (isBaking) {
        sensoryCue =
          'Look for an evenly golden-brown crust, a warm toasted aroma filling the kitchen, and a firm yet tender center when gently pressed or pierced with a toothpick.';
      } else if (isSearingOrFrying) {
        sensoryCue =
          'Listen for a steady, gentle sizzle. Vegetables will turn translucent and glossy, while proteins will release easily from the pan with an appetizing golden color and nutty aroma.';
      } else if (isBoilingOrSimmering) {
        sensoryCue =
          'Wait for steady, gentle bubbles breaking the surface, a concentrated savory aroma, and a tender texture when pierced with a fork—never mushy or raw inside.';
      } else if (isCuttingOrPrep) {
        sensoryCue =
          'Pieces should look uniform in thickness and size, with clean edges and fresh aroma, ensuring even heat penetration during cooking.';
      } else {
        sensoryCue =
          'You will notice a smooth, cohesive texture with a uniform color and balanced aroma before moving to the next step.';
      }
    } else {
      if (isBaking) {
        sensoryCue =
          'Sabrás que está en su punto cuando la superficie adquiera un tono dorado uniforme, desprenda un aroma tostado envolvente y al pinchar el centro salga limpio y tierno sin resistencia cruda.';
      } else if (isSearingOrFrying) {
        sensoryCue =
          'Escucharás un chisporroteo constante y suave; el alimento cambiará a un color dorado brillante (o traslúcido en verduras) y soltará un aroma dulce y tostado sin humear ni oscurecerse.';
      } else if (isBoilingOrSimmering) {
        sensoryCue =
          'Observa un burbujeo suave y continuo; el líquido espesará ligeramente liberando todo su aroma y, al pinchar el ingrediente principal, se sentirá tierno por dentro sin deshacerse.';
      } else if (isCuttingOrPrep) {
        sensoryCue =
          'Los trozos deben verse de grosor y tamaño homogéneo al tacto y a la vista, garantizando que todos alcancen el punto exacto de cocción a la vez.';
      } else {
        sensoryCue =
          'Notarás una textura homogénea, brillante y bien ligada, con un color uniforme y aroma equilibrado que indica que puedes pasar al siguiente paso.';
      }
    }
  }

  // 3. Advertencia de seguridad térmica y precauciones claras
  let thermalSafetyWarning = '';
  if (lang === 'en') {
    if (isBaking) {
      thermalSafetyWarning = isFirstBakingStep
        ? `Thermal safety: Always use dry oven mitts when handling trays${
            tempCelsius ? ` at ${tempCelsius}°C` : ''
          } and step back slightly when opening the door to avoid hot steam burns.`
        : `Thermal safety: Always use oven mitts when rotating or handling hot baking trays${
            tempCelsius ? ` at ${tempCelsius}°C` : ''
          } and avoid leaving the door open to prevent heat loss.`;
    } else if (isSearingOrFrying) {
      thermalSafetyWarning =
        'Thermal safety: Pat wet ingredients dry before adding to hot oil to prevent splatters. If the pan starts smoking, lower the heat immediately so the oil does not burn.';
    } else if (isBoilingOrSimmering) {
      thermalSafetyWarning =
        'Thermal safety: Tilt the lid away from your face when uncovering the pot to let hot steam escape safely, and keep handles turned inward.';
    } else if (isCuttingOrPrep) {
      thermalSafetyWarning =
        'Safety precaution: Place a damp cloth or paper towel under your cutting board so it never slips while using the knife.';
    } else {
      thermalSafetyWarning =
        'Culinary precaution: Taste and check temperature carefully with a clean spoon before serving or advancing.';
    }
  } else {
    if (isBaking) {
      thermalSafetyWarning = isFirstBakingStep
        ? `Seguridad térmica: Utiliza siempre manoplas secas al manipular bandejas${
            tempCelsius ? ` a ${tempCelsius}°C` : ''
          } y retira ligeramente el rostro al abrir la puerta para evitar el golpe de vapor caliente.`
        : `Seguridad térmica: Utiliza manoplas térmicas secas al manipular la bandeja o comprobar el asado, evitando abrir la puerta más de lo necesario para no enfriar el horno.`;
    } else if (isSearingOrFrying) {
      thermalSafetyWarning =
        'Seguridad térmica: Seca el exceso de humedad de los alimentos antes de echarlos al aceite caliente para evitar salpicaduras. Si ves humo blanco, baja el fuego de inmediato para no quemar el fondo.';
    } else if (isBoilingOrSimmering) {
      thermalSafetyWarning =
        'Seguridad térmica: Al destapar la olla o remover líquidos calientes, inclina la tapa hacia el lado contrario a ti para evacuar el vapor sin quemarte.';
    } else if (isCuttingOrPrep) {
      thermalSafetyWarning =
        'Precaución en cocina: Coloca un paño ligeramente húmedo bajo la tabla de corte para fijarla a la encimera y evitar que resbale al cortar.';
    } else {
      thermalSafetyWarning =
        'Precaución térmica y de punto: Comprueba la temperatura con precaución antes de probar o emplatar para evitar quemaduras.';
    }
  }

  return {
    beginnerInstruction,
    sensoryCue,
    thermalSafetyWarning,
  };
}

/**
 * Calibración técnica para Nivel Avanzado (PRO):
 * Garantiza que si una receta antigua en BD no tiene `instruccion_avanzada` o es idéntica a `instruccion`,
 * se transforme en prosa ejecutiva, sintética y profesional de restaurante.
 */
function buildAdvancedTechnicalCalibration(
  baseInstruction: string,
  explicitAdvancedInstruction: string | undefined | null,
  potenciaFuego: string | undefined | null,
  tempCelsius: number | undefined | null,
  tiempoMin: number | undefined | null,
  lang: 'es' | 'en' = 'es'
): string {
  const cleanBase = baseInstruction.trim();
  const explicitClean = (explicitAdvancedInstruction || '').trim();

  if (
    explicitClean &&
    explicitClean.toLowerCase() !== cleanBase.toLowerCase()
  ) {
    return explicitClean;
  }

  // Transformación léxica a terminología profesional de restaurante
  let technical = cleanBase
    .replace(/\bcortar en trozos pequeños\b/gi, 'picar en brunoise')
    .replace(/\bcorta en trozos pequeños\b/gi, 'pica en brunoise')
    .replace(/\bcortar en tiras finas\b/gi, 'cortar en juliana fina')
    .replace(/\bcorta en tiras finas\b/gi, 'corta en juliana fina')
    .replace(/\bcortar en dados\b/gi, 'cortar en mirepoix / dados regulares')
    .replace(/\bcorta en dados\b/gi, 'corta en mirepoix regular')
    .replace(/\bcocinar a fuego lento\b/gi, 'rehogar a fuego suave')
    .replace(/\bcocina a fuego lento\b/gi, 'rehoga a fuego suave')
    .replace(/\bdorar por ambos lados\b/gi, 'sellar y nacarar por ambas caras (reacción de Maillard)')
    .replace(/\bdora por ambos lados\b/gi, 'sella por ambas caras hasta reacción de Maillard')
    .replace(/\bmezclar bien hasta que se integre\b/gi, 'emulsionar hasta homogeneizar')
    .replace(/\bmezcla bien hasta que se integre\b/gi, 'emulsiona hasta ligar la mezcla')
    .replace(/\bmezclar todos los ingredientes\b/gi, 'integrar la mise en place y emulsionar')
    .replace(/\bmezcla todos los ingredientes\b/gi, 'integra la mise en place y emulsiona');

  const specs: string[] = [];
  if (tempCelsius && tempCelsius > 0) specs.push(`${tempCelsius}°C`);
  if (potenciaFuego) specs.push(lang === 'en' ? `heat: ${potenciaFuego}` : `fuego ${potenciaFuego}`);
  if (tiempoMin && tiempoMin > 0) specs.push(`${tiempoMin}'`);

  const specSuffix = specs.length > 0 ? ` [${specs.join(' · ')}]` : '';

  if (lang === 'en') {
    return `Executive technique${specSuffix}: ${technical.replace(/\.+$/, '')}. Verify doneness and texture before plating.`;
  }

  return `Técnica ejecutiva${specSuffix}: ${technical.replace(/\.+$/, '')}. Ajustar punto de sazón y textura de pase.`;
}

interface RecipeInteractiveSectionsProps {
  recetaId: string;
  tituloReceta: string;
  basePorciones: number;
  tiempoCoccionMin: number | null;
  ingredientes: RecetaIngrediente[];
  pasos: Paso[];
  defaultServings?: number;
  onSubstitutePersist?: (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => void;
  isAdapted?: boolean;
  userProfile?: any;
  rolPlato?: string | null;
  categoriasGastronomicas?: string[] | null;
}

export function RecipeInteractiveSections({
  recetaId,
  tituloReceta,
  basePorciones,
  tiempoCoccionMin,
  ingredientes,
  pasos,
  defaultServings,
  onSubstitutePersist,
  isAdapted,
  userProfile,
  rolPlato,
  categoriasGastronomicas,
}: RecipeInteractiveSectionsProps) {
  const t = useLanguageStore((s) => s.t);
  const searchParams = useSearchParams();
  const isFromPlanner = searchParams?.get('from') === 'planner';
  const plannerServings =
    isFromPlanner && searchParams?.get('servings')
      ? Number(searchParams.get('servings'))
      : null;

  // Solo si la URL contiene explícitamente from=planner y servings se inicializa con dicho valor;
  // al abrir la receta desde el recetario o colección, el estado inicial DEBE ser SIEMPRE la base de la receta.
  const resolvedInitialServings =
    plannerServings && plannerServings > 0
      ? plannerServings
      : isFromPlanner && defaultServings && defaultServings > 0
      ? defaultServings
      : basePorciones || 2;

  const [servings, setServings] = useState(resolvedInitialServings);
  const [mobileTab, setMobileTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(true);
  const [isStepsOpen, setIsStepsOpen] = useState(true);
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({});
  const [showProLevelModal, setShowProLevelModal] = useState(false);
  const prevRecetaIdRef = useRef(recetaId);

  // Sincronizar comensales: preservar la selección activa del usuario al cambiar de modo (adaptado vs original)
  useEffect(() => {
    if (prevRecetaIdRef.current !== recetaId) {
      prevRecetaIdRef.current = recetaId;
      if (isFromPlanner && plannerServings && plannerServings > 0) {
        setServings(plannerServings);
      } else if (isFromPlanner && defaultServings && defaultServings > 0) {
        setServings(defaultServings);
      } else {
        setServings(basePorciones || 2);
      }
      return;
    }

    if (isFromPlanner && plannerServings && plannerServings > 0) {
      setServings(plannerServings);
    }
  }, [recetaId, basePorciones, isFromPlanner, plannerServings, defaultServings]);

  // Limpiar sustituciones activas cuando cambia la receta o cuando se aplica/revierte una adaptación
  useEffect(() => {
    setSubstitutions({});
  }, [recetaId, isAdapted]);

  const handleSubstituteChange = (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => {
    const cleanTarget = String(currentTarget || '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
    const cleanNew = newName
      ? String(newName)
          .replace(/<\/?[^>]+(>|$)/g, '')
          .trim()
      : null;
    const baseKey = String(adaptedBaseName || cleanTarget)
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();

    setSubstitutions((prev) => {
      const next = { ...prev };
      delete next[cleanTarget];
      delete next[baseKey];

      if (cleanNew && cleanNew.toLowerCase() !== baseKey.toLowerCase()) {
        next[baseKey] = cleanNew;
      }
      return next;
    });

    onSubstitutePersist?.(cleanTarget, cleanNew, baseKey, substituteOption);
  };

  const safePasos = Array.isArray(pasos) ? pasos : [];
  const safeIngredientes = Array.isArray(ingredientes) ? ingredientes : [];

  const language = useLanguageStore((s) => s.language);
  const ratio = servings / (basePorciones || 2);

  const isBaking = useMemo(() => {
    return isBakingOrPastryContext({
      rol_plato: rolPlato,
      titulo: tituloReceta,
      categorias: categoriasGastronomicas,
      ingredientes: safeIngredientes,
    });
  }, [rolPlato, tituloReceta, categoriasGastronomicas, safeIngredientes]);

  // Escalado inteligente con conciencia culinaria (respetando 'al gusto' / 'to taste' como invariable sin número 1 previo)
  const scaledIngredientes = useMemo(() => {
    const rawScaled = scaleIngredientsWithCulinaryHeuristics(
      safeIngredientes,
      basePorciones || 2,
      servings,
      {
        rol_plato: rolPlato,
        titulo: tituloReceta,
        categorias: categoriasGastronomicas,
        isBaking,
      }
    );
    return rawScaled.map((ing) => {
      const cleanU = (ing.unidad || '').replace(/^\s*1\s+(?=(al\s+gusto|to\s+taste)\b)/i, '').trim();
      if (/^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn)$/i.test(cleanU)) {
        return {
          ...ing,
          cantidad: 1,
          cantidad_escalada: 1,
          unidad: language === 'en' ? 'to taste' : 'al gusto',
          rol_culinario: 'invariable',
        };
      }
      return ing;
    });
  }, [safeIngredientes, basePorciones, servings, language, rolPlato, tituloReceta, categoriasGastronomicas, isBaking]);

  const scaledTiempoCoccion = tiempoCoccionMin
    ? scaleCookingTime(tiempoCoccionMin, basePorciones || 2, servings, {
        titulo: tituloReceta,
        isBaking,
        pasos,
      })
    : null;

  // ==============================================================
  // MONETIZACIÓN Y COMPORTAMIENTO POR NIVEL CULINARIO (100% PRO)
  // ==============================================================
  const profileFromStore = useProfileStore((s) => s.profile);
  const resolvedPlan = (
    profileFromStore?.plan_suscripcion ||
    userProfile?.plan_suscripcion ||
    'gratis'
  )
    .trim()
    .toLowerCase();
  const isPro = resolvedPlan === 'pro';

  // Usuario PRO: El microselector arranca seleccionado en el nivel guardado en su perfil.
  // Usuario FREE: Los 3 niveles están bloqueados (effectiveActiveLevel = null) y lee el texto base neutro de extracción.
  const initialProLevel: NivelCulinarioUI = normalizeNivelCulinario(
    profileFromStore?.nivel_culinario || userProfile?.nivel_culinario
  );

  const [activeLevel, setActiveLevel] = useState<NivelCulinarioUI>(initialProLevel);

  useEffect(() => {
    if (!isPro) return;
    const freshLevel =
      profileFromStore?.nivel_culinario || userProfile?.nivel_culinario;
    if (freshLevel) {
      setActiveLevel(normalizeNivelCulinario(freshLevel));
    }
  }, [isPro, userProfile?.nivel_culinario, profileFromStore?.nivel_culinario]);

  // En Usuario FREE effectiveActiveLevel es null (ningún nivel PRO activo; las 3 opciones muestran candado)
  const effectiveActiveLevel: NivelCulinarioUI | null = isPro ? activeLevel : null;

  // Manejador de clic en el microselector [ 🌱 | 🍳 | 👨‍🍳 ]
  const handleLevelSelect = (targetLevel: NivelCulinarioUI) => {
    if (!isPro) {
      // Usuario FREE: LAS TRES OPCIONES (Principiante, Intermedio y Avanzado) están bloqueadas.
      // No se cambia nada y se abre el modal de suscripción Miga Pro.
      setShowProLevelModal(true);
      return;
    }
    // Usuario PRO: conmutación libre e instantánea (0 ms) entre los 3 niveles
    setActiveLevel(targetLevel);
  };

  // Textos para la Capa Informativa (Tooltip en PC y Bottom Sheet '?' en Móvil)
  const levelInfoProps = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Pedagogical Calibration & Culinary Levels (Miga Pro)',
        description:
          'All 3 culinary levels are an exclusive Miga Pro feature that rewrites every step in real time to match your cooking experience:',
        bullets: [
          {
            icon: '🌱',
            label: 'Beginner',
            badge: 'PRO',
            text: 'Expanded step-by-step pedagogical narrative with prominent sensory cards (color, texture & aroma cues) and thermal safety warnings.',
          },
          {
            icon: '🍳',
            label: 'Intermediate',
            badge: 'PRO',
            text: 'Balanced, direct technical prose for everyday home cooking without elementary warnings.',
          },
          {
            icon: '👨‍🍳',
            label: 'Advanced',
            badge: 'PRO',
            text: 'Synthetic, executive restaurant-grade phrasing using professional culinary terminology (sear, deglaze, emulsify, reduce).',
          },
        ],
        footerNote: isPro
          ? 'Miga Pro Active: Switch freely between all 3 levels in 0 ms.'
          : 'Free accounts read the raw video extraction. Subscribe to Miga Pro to unlock all 3 culinary levels.',
        closeLabel: 'Got it',
      };
    }

    return {
      title: 'Calibración Pedagógica y Niveles Culinarios (Miga Pro)',
      description:
        'Los 3 niveles culinarios son una funcionalidad exclusiva Miga Pro que adapta en tiempo real el relato de cada paso según tu dominio en la cocina:',
      bullets: [
        {
          icon: '🌱',
          label: 'Principiante',
          badge: 'PRO',
          text: 'Relato pedagógico expandido paso a paso con tarjetas sensoriales (cambios de color, texturas y aromas clave) y advertencias de seguridad térmica.',
        },
        {
          icon: '🍳',
          label: 'Intermedio',
          badge: 'PRO',
          text: 'Versión técnica equilibrada con prosa directa, limpia y estructurada para cocina doméstica ágil.',
        },
        {
          icon: '👨‍🍳',
          label: 'Avanzado',
          badge: 'PRO',
          text: 'Versión sintética y profesional con terminología ejecutiva de restaurante (marcar, reducir, desglasar, emulsionar).',
        },
      ],
      footerNote: isPro
        ? 'Miga Pro Activo: Conmuta libremente (0 ms) entre Principiante, Intermedio y Avanzado.'
        : 'En cuentas gratuitas lees la extracción base del vídeo. Suscríbete a Miga Pro para desbloquear los 3 niveles culinarios.',
      closeLabel: 'Entendido',
    };
  }, [language, isPro]);

  // Reactividad dinámica: escalado métrico, calibración pedagógica por nivel y sustitución de ingredientes
  const reactivePasos = useMemo(() => {
    const activeSubs = Object.entries(substitutions).filter(
      (entry): entry is [string, string] => Boolean(entry[1])
    );
    const usageTracker = new Map<string, number>();
    const currentLang = (language as 'es' | 'en') || 'es';
    let hasEncounteredBaking = false;

    return safePasos.map((paso) => {
      const baseInstruction = String(paso?.instruccion || '');
      const rawBeginner = (paso as any)?.instruccion_principiante
        ? String((paso as any).instruccion_principiante).trim()
        : undefined;
      const rawAdvanced = (paso as any)?.instruccion_avanzada
        ? String((paso as any).instruccion_avanzada).trim()
        : undefined;
      const rawSensory = (paso as any)?.descriptor_sensorial
        ? String((paso as any).descriptor_sensorial).trim()
        : undefined;

      const isCurrentStepBaking =
        (paso as any)?.potencia_fuego === 'horno' ||
        /\b(horno|hornear|hornea|precalienta|precalentar|airfryer|freidora\s+de\s+aire|oven|bake|roast|gratinar|gratina)\b/i.test(
          baseInstruction
        );
      const isFirstBakingStep = isCurrentStepBaking && !hasEncounteredBaking;
      if (isCurrentStepBaking) {
        hasEncounteredBaking = true;
      }

      const stepScaledTime = paso.tiempo_estimado_min
        ? scaleCookingTime(
            paso.tiempo_estimado_min,
            basePorciones || 2,
            servings,
            {
              instruccion: baseInstruction,
              potencia_fuego: (paso as any)?.potencia_fuego,
              isBaking,
            }
          )
        : null;

      let instruccion = baseInstruction;
      let descriptorSensorial: string | undefined = undefined;
      let precaucionTermica: string | undefined = undefined;

      if (!isPro || effectiveActiveLevel === null) {
        // Usuario FREE: Lee el paso a paso TAL CUAL se genera al cargar el vídeo original (texto base neutro de extracción)
        instruccion = baseInstruction;
      } else if (effectiveActiveLevel === 'Principiante') {
        // Usuario PRO - Nivel Principiante: Renderiza paso.instruccion_principiante (o genera relato pedagógico expandido si viene vacío/idéntico) + descriptor sensorial + precaución térmica
        const calibrated = buildBeginnerPedagogicalCalibration(
          baseInstruction,
          rawBeginner,
          rawSensory,
          (paso as any)?.potencia_fuego,
          paso?.temperatura_celsius,
          stepScaledTime ?? paso?.tiempo_estimado_min,
          currentLang,
          isFirstBakingStep
        );
        instruccion = calibrated.beginnerInstruction;
        descriptorSensorial = calibrated.sensoryCue;
        precaucionTermica = calibrated.thermalSafetyWarning;
      } else if (effectiveActiveLevel === 'Avanzado') {
        // Usuario PRO - Nivel Avanzado: Renderiza paso.instruccion_avanzada (o calibración técnica ejecutiva sintética)
        instruccion = buildAdvancedTechnicalCalibration(
          baseInstruction,
          rawAdvanced,
          (paso as any)?.potencia_fuego,
          paso?.temperatura_celsius,
          stepScaledTime ?? paso?.tiempo_estimado_min,
          currentLang
        );
      } else {
        // Usuario PRO - Nivel Intermedio: Renderiza paso.instruccion (versión técnica equilibrada estándar)
        instruccion = baseInstruction;
      }

      let consejo = paso?.consejo_pro ? String(paso.consejo_pro).trim() : undefined;

      // 1. Escalar cantidades numéricas integradas en el texto si ratio !== 1 o si es receta adaptada
      if ((ratio !== 1 || isAdapted) && scaledIngredientes.length > 0) {
        const snapshotTracker = new Map(usageTracker);
        instruccion = scaleStepQuantities(
          instruccion,
          scaledIngredientes,
          ratio,
          language,
          servings,
          usageTracker
        );
        if (descriptorSensorial) {
          descriptorSensorial = scaleStepQuantities(
            descriptorSensorial,
            scaledIngredientes,
            ratio,
            language,
            servings,
            new Map(snapshotTracker)
          );
        }
        if (consejo) {
          consejo = scaleStepQuantities(
            consejo,
            scaledIngredientes,
            ratio,
            language,
            servings,
            new Map(snapshotTracker)
          );
        }
      }

      // 2. Aplicar sustitución de ingredientes si existen
      for (const [adaptedBase, newName] of activeSubs) {
        instruccion = replaceIngredientInText(instruccion, adaptedBase, newName);
        if (descriptorSensorial) {
          descriptorSensorial = replaceIngredientInText(
            descriptorSensorial,
            adaptedBase,
            newName
          );
        }
        if (consejo) {
          consejo = replaceIngredientInText(consejo, adaptedBase, newName);
        }
      }

      return {
        ...paso,
        instruccion,
        descriptor_sensorial: descriptorSensorial,
        precaucion_termica: precaucionTermica,
        potencia_fuego: (paso as any)?.potencia_fuego || null,
        tiempo_estimado_min: stepScaledTime ?? paso.tiempo_estimado_min,
        consejo_pro: consejo,
      };
    });
  }, [
    safePasos,
    substitutions,
    ratio,
    scaledIngredientes,
    language,
    isAdapted,
    servings,
    effectiveActiveLevel,
    isPro,
    basePorciones,
    isBaking,
  ]);

  // Renderizado unificado de pasos interactivos
  const renderStepsList = () => (
    <ol className="space-y-5 md:space-y-7 pt-1 md:pt-0">
      {reactivePasos.map((paso, idx) => {
        const heat = formatStepHeat(
          paso.temperatura_celsius,
          paso.instruccion,
          (paso as any).potencia_fuego,
          (language as 'es' | 'en') || 'es'
        );

        return (
          <li key={paso?.id || `paso-${idx}`} className="flex gap-3 sm:gap-5 group">
            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] font-serif-recipe font-bold text-sm sm:text-base flex items-center justify-center shrink-0 self-start mt-0.5 shadow-2xs">
              {paso?.orden ?? idx + 1}
            </span>

            <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
              {/* Badge sutil de modo activo cuando el usuario es PRO para reforzar feedback visual instantáneo */}
              {isPro && effectiveActiveLevel && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      effectiveActiveLevel === 'Principiante'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : effectiveActiveLevel === 'Avanzado'
                        ? 'bg-stone-900 text-amber-200 border-stone-800'
                        : 'bg-[#f4efe6] text-[#a86224] border-[#e7dfd5]'
                    }`}
                  >
                    <span>
                      {effectiveActiveLevel === 'Principiante'
                        ? '🌱'
                        : effectiveActiveLevel === 'Avanzado'
                        ? '👨‍🍳'
                        : '🍳'}
                    </span>
                    <span>
                      {effectiveActiveLevel === 'Principiante'
                        ? language === 'en'
                          ? 'Beginner · Guided Step-by-Step'
                          : 'Principiante · Relato Guiado Paso a Paso'
                        : effectiveActiveLevel === 'Avanzado'
                        ? language === 'en'
                          ? 'Advanced · Executive Technique'
                          : 'Avanzado · Técnica Ejecutiva'
                        : language === 'en'
                        ? 'Intermediate · Balanced Standard'
                        : 'Intermedio · Técnica Equilibrada'}
                    </span>
                  </span>
                </div>
              )}

              <p
                className={`text-sm sm:text-lg text-stone-800 leading-relaxed ${
                  effectiveActiveLevel === 'Avanzado'
                    ? 'font-medium tracking-tight'
                    : effectiveActiveLevel === 'Principiante'
                    ? 'font-normal text-stone-900'
                    : 'font-light'
                }`}
              >
                <FormattedText text={paso.instruccion} />
              </p>

              {/* MODO PRINCIPIANTE (PRO): Tarjeta / Badge Sensorial prominente + Advertencia de seguridad térmica */}
              {isPro && effectiveActiveLevel === 'Principiante' && (
                <div className="space-y-2 animate-fade-in">
                  {paso.descriptor_sensorial && (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 via-[#fffcf5] to-amber-100/70 border-2 border-amber-300/90 text-amber-950 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs">
                      <div className="w-7 h-7 rounded-xl bg-[#a86224] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-[#8a4e1b] border border-amber-300">
                            {language === 'en'
                              ? 'Sensory Cue · Color, Texture & Aroma'
                              : 'Guía Sensorial · Color, Textura y Aroma'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                          {paso.descriptor_sensorial}
                        </p>
                      </div>
                    </div>
                  )}

                  {(paso as any).precaucion_termica && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/80 border border-rose-200/90 text-rose-950 text-xs flex items-start gap-2 shadow-2xs">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-snug font-medium">
                        {(paso as any).precaucion_termica}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(paso.tiempo_estimado_min || heat || paso.consejo_pro) && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 text-xs text-stone-600">
                  {paso.tiempo_estimado_min && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#a86224]" />
                      {paso.tiempo_estimado_min} min
                    </span>
                  )}

                  {heat && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                      {heat.isBaking ? (
                        <Thermometer className="w-3.5 h-3.5 text-[#c27835]" />
                      ) : (
                        <Flame className="w-3.5 h-3.5 text-[#e05d26]" />
                      )}
                      {heat.label}
                    </span>
                  )}

                  {paso.consejo_pro && (
                    <div className="w-full mt-1.5 sm:mt-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#e7dfd5] bg-[#faf7f2] text-stone-700 text-xs sm:text-sm font-light">
                      <span className="font-semibold text-[#a86224]">{t('recipe_chef_tip')}</span>{' '}
                      <FormattedText text={paso.consejo_pro} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="pt-2 space-y-6 md:space-y-8">
      {/* ============================================================== */}
      {/* VISTA MÓVIL (< 768px): PESTAÑAS DIRECTAS TIPO APP NATIVA       */}
      {/* ============================================================== */}
      <div className="md:hidden sticky top-2 z-20 bg-stone-100/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#e7dfd5] shadow-xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMobileTab('ingredients')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-serif-recipe text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'ingredients'
              ? 'bg-[#a86224] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <span>🛒</span>
          <span>{t('recipe_section_ingredients')}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
              mobileTab === 'ingredients'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {safeIngredientes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('steps')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-serif-recipe text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'steps'
              ? 'bg-[#a86224] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <span>🍳</span>
          <span>{t('recipe_section_prep')}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
              mobileTab === 'steps'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {safePasos.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 1: INGREDIENTES CON ESCALADO Y MODO COMPRA             */}
      {/* ============================================================== */}
      <section
        className={`rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all ${
          mobileTab !== 'ingredients' ? 'hidden md:block' : 'block'
        }`}
      >
        {/* Cabecera de Acordeón para Escritorio (>= 768px) */}
        <button
          type="button"
          onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
          aria-expanded={isIngredientsOpen}
          className="hidden md:flex w-full min-h-[58px] p-5 sm:p-6 items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_ingredients')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {servings}{' '}
                {servings === 1 ? t('recipe_serving_single') : t('recipe_servings_plural')} ·{' '}
                {safeIngredientes.length} {t('recipe_items')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isIngredientsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isIngredientsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido Unificado de Ingredientes */}
        <div
          className={`p-4 sm:p-6 md:pt-0 ${
            !isIngredientsOpen ? 'block md:hidden' : 'block'
          } space-y-4 md:space-y-5 animate-fade-in ${
            isIngredientsOpen ? 'md:border-t md:border-[#f4efe6]' : ''
          }`}
        >
          <div className="md:pt-4">
            <ServingsScaler
              baseServings={basePorciones || 2}
              currentServings={servings}
              onServingsChange={setServings}
            />
          </div>

          <ShoppingListMode
            recetaId={recetaId}
            tituloReceta={tituloReceta}
            ingredientes={scaledIngredientes}
            onSubstituteChange={handleSubstituteChange}
            userProfile={userProfile}
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECCIÓN 2: PREPARACIÓN Y PASOS EN MODO COCINA                  */}
      {/* ============================================================== */}
      <section
        className={`rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all ${
          mobileTab !== 'steps' ? 'hidden md:block' : 'block'
        }`}
      >
        {/* Cabecera Móvil (< 768px): Compacta con microcontrol [ 🌱 | 🍳 | 👨‍🍳 ] y botón (?) */}
        <div className="flex md:hidden items-center justify-between gap-2 p-4 pb-3 border-b border-[#f4efe6]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold font-serif-recipe text-stone-900 leading-none truncate">
                {t('recipe_section_prep')}
              </h2>
              <FeatureInfoTrigger {...levelInfoProps} align="left" />
            </div>
            <span className="text-[11px] text-stone-500 font-medium mt-1 block truncate">
              {safePasos.length} {t('recipe_steps_count')}
              {scaledTiempoCoccion
                ? ` · ~${scaledTiempoCoccion} ${t('recipe_min_cooking')}`
                : ''}
            </span>
          </div>

          {/* Microcontrol segmentado [ 🌱 | 🍳 | 👨‍🍳 ] */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] shrink-0 shadow-2xs">
            {/* Principiante */}
            <button
              type="button"
              onClick={() => handleLevelSelect('Principiante')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'Principiante'
                  ? 'bg-[#a86224] text-white shadow-xs'
                  : !isPro
                  ? 'text-stone-400 opacity-75 hover:opacity-100 hover:bg-amber-50/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={
                !isPro
                  ? 'Principiante (Exclusivo Miga Pro): Guía sensorial paso a paso'
                  : 'Principiante: Relato guiado paso a paso y pistas sensoriales'
              }
            >
              <span>🌱</span>
              {!isPro && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[#a86224] text-[7px] font-extrabold leading-none flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2 h-2 stroke-[2.5]" />
                </span>
              )}
            </button>

            {/* Intermedio */}
            <button
              type="button"
              onClick={() => handleLevelSelect('Intermedio')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'Intermedio'
                  ? 'bg-[#a86224] text-white shadow-xs'
                  : !isPro
                  ? 'text-stone-400 opacity-75 hover:opacity-100 hover:bg-amber-50/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={
                !isPro
                  ? 'Intermedio (Exclusivo Miga Pro): Técnica equilibrada'
                  : 'Intermedio: Versión técnica equilibrada estándar'
              }
            >
              <span>🍳</span>
              {!isPro && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[#a86224] text-[7px] font-extrabold leading-none flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2 h-2 stroke-[2.5]" />
                </span>
              )}
            </button>

            {/* Avanzado */}
            <button
              type="button"
              onClick={() => handleLevelSelect('Avanzado')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'Avanzado'
                  ? 'bg-[#a86224] text-white shadow-xs'
                  : !isPro
                  ? 'text-stone-400 opacity-75 hover:opacity-100 hover:bg-amber-50/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={
                !isPro
                  ? 'Avanzado (Exclusivo Miga Pro): Técnicas de restaurante'
                  : 'Avanzado: Prosa técnica, sintética y profesional'
              }
            >
              <span>👨‍🍳</span>
              {!isPro && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[#a86224] text-[7px] font-extrabold leading-none flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2 h-2 stroke-[2.5]" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cabecera de Acordeón para Escritorio (>= 768px) */}
        <button
          type="button"
          onClick={() => setIsStepsOpen(!isStepsOpen)}
          aria-expanded={isStepsOpen}
          className="hidden md:flex w-full min-h-[58px] p-5 sm:p-6 items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_prep')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {safePasos.length} {t('recipe_steps_count')}
                {scaledTiempoCoccion
                  ? ` · ~${scaledTiempoCoccion} ${t('recipe_min_cooking')}`
                  : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isStepsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isStepsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido Unificado de Preparación */}
        <div
          className={`p-4 sm:p-6 md:pt-4 ${
            !isStepsOpen ? 'block md:hidden' : 'block'
          } space-y-4 md:space-y-6 animate-fade-in ${
            isStepsOpen ? 'md:border-t md:border-[#f4efe6]' : ''
          }`}
        >
          {/* Selector de Nivel Culinario Reactivo en Escritorio con Tooltip flotante (?) */}
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5]">
            <div className="flex items-center gap-2 flex-wrap">
              <ChefHat className="w-4 h-4 text-[#a86224] shrink-0" />
              <span className="text-xs sm:text-sm font-semibold font-serif-recipe text-stone-900">
                {language === 'en' ? 'Culinary Level' : 'Nivel de Cocinado'}
              </span>
              <FeatureInfoTrigger {...levelInfoProps} align="left" />
              <span className="text-[11px] text-stone-500 hidden lg:inline">
                {!isPro
                  ? language === 'en'
                    ? '· Base video extraction (Unlock levels with Miga Pro)'
                    : '· Extracción base del vídeo (Desbloquea los 3 niveles con Miga Pro)'
                  : effectiveActiveLevel === 'Principiante'
                  ? language === 'en'
                    ? '· Expanded step-by-step guide & sensory cues'
                    : '· Relato expandido paso a paso, guía sensorial y seguridad térmica'
                  : effectiveActiveLevel === 'Intermedio'
                  ? language === 'en'
                    ? '· Standard balanced technical prose'
                    : '· Versión técnica equilibrada estándar'
                  : language === 'en'
                  ? '· Synthetic restaurant-grade phrasing'
                  : '· Versión sintética y técnica de restaurante'}
              </span>
            </div>

            {/* Segmented Control de escritorio: LAS 3 OPCIONES bloqueadas con candado PRO para usuarios Free */}
            <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#e7dfd5] shadow-2xs self-start sm:self-auto">
              {/* Principiante (100% PRO) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('Principiante')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'Principiante'
                    ? 'bg-[#a86224] text-white shadow-xs font-semibold'
                    : !isPro
                    ? 'text-stone-400 opacity-80 hover:opacity-100 hover:bg-amber-50/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  !isPro
                    ? language === 'en'
                      ? 'Beginner (Miga Pro): Step-by-step sensory guide'
                      : 'Principiante (Miga Pro): Guía sensorial paso a paso'
                    : language === 'en'
                    ? 'Beginner: Expanded step-by-step guide and sensory cues'
                    : 'Principiante: Relato expandido paso a paso y guía sensorial'
                }
              >
                <span>🌱</span>
                <span>{language === 'en' ? 'Beginner' : 'Principiante'}</span>
                {!isPro && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-[#a86224] border border-amber-300/80 text-[9px] font-extrabold uppercase">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>

              {/* Intermedio (100% PRO) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('Intermedio')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'Intermedio'
                    ? 'bg-[#a86224] text-white shadow-xs font-semibold'
                    : !isPro
                    ? 'text-stone-400 opacity-80 hover:opacity-100 hover:bg-amber-50/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  !isPro
                    ? language === 'en'
                      ? 'Intermediate (Miga Pro): Balanced technical prose'
                      : 'Intermedio (Miga Pro): Versión técnica equilibrada'
                    : language === 'en'
                    ? 'Intermediate: Balanced standard technical version'
                    : 'Intermedio: Versión técnica equilibrada estándar'
                }
              >
                <span>🍳</span>
                <span>{language === 'en' ? 'Medium' : 'Intermedio'}</span>
                {!isPro && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-[#a86224] border border-amber-300/80 text-[9px] font-extrabold uppercase">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>

              {/* Avanzado (100% PRO) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('Avanzado')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'Avanzado'
                    ? 'bg-[#a86224] text-white shadow-xs font-semibold'
                    : !isPro
                    ? 'text-stone-400 opacity-80 hover:opacity-100 hover:bg-amber-50/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  !isPro
                    ? language === 'en'
                      ? 'Advanced (Miga Pro): Restaurant culinary techniques'
                      : 'Avanzado (Miga Pro): Técnicas de restaurante'
                    : language === 'en'
                    ? 'Advanced: Concise high culinary phrasing'
                    : 'Avanzado: Prosa sintética y alta cocina'
                }
              >
                <span>👨‍🍳</span>
                <span>{language === 'en' ? 'Advanced' : 'Avanzado'}</span>
                {!isPro && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-[#a86224] border border-amber-300/80 text-[9px] font-extrabold uppercase">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {renderStepsList()}
        </div>
      </section>

      {/* Modal de Suscripción Miga Pro al pulsar cualquiera de los 3 niveles bloqueados */}
      {showProLevelModal && (
        <ProSubscriptionModal
          isOpen={showProLevelModal}
          onClose={() => setShowProLevelModal(false)}
          context="feature_locked"
          highlightCulinaryLevels={true}
          title={
            language === 'en'
              ? 'Unlock All 3 Culinary Levels with Miga Pro'
              : 'Desbloquea los 3 Niveles Culinarios con Miga Pro'
          }
          description={
            language === 'en'
              ? 'Subscribe to Miga Pro to switch in 0 ms between Beginner (expanded step-by-step sensory guide & thermal safety), Intermediate (balanced technique), and Advanced (restaurant-grade prose).'
              : 'Suscríbete a Miga Pro para conmutar en 0 ms entre Principiante (relato guiado paso a paso, guía sensorial y alertas térmicas), Intermedio (técnica equilibrada) y Avanzado (técnicas ejecutivas de restaurante).'
          }
          onVipSuccess={() => {
            setShowProLevelModal(false);
          }}
        />
      )}
    </div>
  );
}
