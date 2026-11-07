import { Receta, RecetaIngrediente, Paso } from '@/types/recipe';
import {
  scaleIngredientsWithCulinaryHeuristics,
  isBakingOrPastryContext,
} from '@/lib/culinary/scaler';
import { scaleStepQuantities } from '@/lib/culinary/stepQuantityScaler';
import { cleanIngredientName } from '@/lib/nutrition/formatQuantity';
import { MIGA_LOGO_PNG, cleanPdfText } from './exportMealPlanToPdf';

export interface ExportRecipePdfParams {
  receta: Partial<Receta> & { titulo?: string };
  porciones?: number;
  ingredientes: RecetaIngrediente[];
  pasos: Paso[];
  lang?: 'es' | 'en' | string;
  nivelCulinario?: 'Principiante' | 'Intermedio' | 'Avanzado' | string | null;
}

/**
 * Sanitiza texto para fuentes estándar Latin-1 de jsPDF (elimina etiquetas HTML <mark>, emojis y convierte fracciones fuera de Latin-1).
 */
function sanitizeRecipePdfText(raw?: string | null): string {
  if (!raw) return '';
  const withoutTags = raw
    .replace(/<\/?mark>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\u2153/g, '1/3')
    .replace(/\u2154/g, '2/3')
    .replace(/\u215B/g, '1/8')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2022|\u00B7/g, '-');
  return cleanPdfText(withoutTags);
}

/**
 * Formatea una cantidad numérica para impresión limpia en PDF.
 */
function formatPdfAmount(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
    return '1';
  }
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  const intPart = Math.floor(rounded);
  const dec = Math.round((rounded - intPart) * 1000) / 1000;
  const eps = 0.045;
  let frac = '';
  if (Math.abs(dec - 0.25) <= eps) frac = '1/4';
  else if (Math.abs(dec - 0.5) <= eps) frac = '1/2';
  else if (Math.abs(dec - 0.75) <= eps) frac = '3/4';
  else if (Math.abs(dec - 0.333) <= eps) frac = '1/3';
  else if (Math.abs(dec - 0.667) <= eps) frac = '2/3';

  if (frac) {
    return intPart === 0 ? frac : `${intPart} ${frac}`;
  }
  const oneDec = Math.round(rounded * 10) / 10;
  return Number.isInteger(oneDec) ? String(oneDec) : oneDec.toFixed(1);
}

/**
 * Servicio de exportación a PDF para una receta individual con maquetación editorial Miga.
 */
export async function exportRecipeToPdf(params: ExportRecipePdfParams): Promise<void> {
  const {
    receta,
    porciones,
    ingredientes = [],
    pasos = [],
    lang = 'es',
    nivelCulinario = 'Intermedio',
  } = params;

  const isEn = lang === 'en';
  const baseServings = Number(receta?.porciones) > 0 ? Number(receta.porciones) : 2;
  const targetServings = Number(porciones) > 0 ? Number(porciones) : baseServings;

  // Importación dinámica bajo demanda para no penalizar el bundle inicial
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const runAutoTable = (autoTableModule as any).default || autoTableModule;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const logoX = marginX;
  const logoY = 12;
  const logoW = 10;
  const logoH = 10;
  const textStartX = logoX + logoW + 4;
  let currentY = logoY + logoH + 6;

  // Paleta de Colores Miga Editorial
  const COLOR_BRAND = [168, 98, 36] as [number, number, number]; // #a86224
  const COLOR_DARK = [44, 40, 37] as [number, number, number]; // #2c2825
  const COLOR_MUTED = [120, 113, 108] as [number, number, number]; // #78716c
  const COLOR_BG_ALT = [250, 247, 242] as [number, number, number]; // #faf7f2
  const COLOR_BORDER = [231, 223, 213] as [number, number, number]; // #e7dfd5

  // =========================================================================
  // 1. CABECERA EDITORIAL MIGA
  // =========================================================================
  try {
    doc.addImage(MIGA_LOGO_PNG, 'PNG', logoX, logoY, logoW, logoH);
  } catch (err) {
    console.warn('No se pudo incrustar el logo en el PDF:', err);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_BRAND);
  doc.text('M I G A', textStartX, logoY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    isEn ? 'Smart Culinary Cookbook - Recipe Sheet' : 'Recetario Inteligente - Ficha Culinaria',
    textStartX,
    logoY + 9
  );

  currentY = logoY + logoH + 7;

  // Título de la receta (con ajuste multilínea automático)
  const cleanTitle = sanitizeRecipePdfText(receta?.titulo || (isEn ? 'Recipe' : 'Receta'));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_DARK);
  const titleLines = doc.splitTextToSize(cleanTitle, contentWidth);
  doc.text(titleLines, marginX, currentY);
  currentY += titleLines.length * 6 + 1;

  // Descripción breve opcional
  if (receta?.descripcion) {
    const cleanDesc = sanitizeRecipePdfText(receta.descripcion);
    if (cleanDesc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_MUTED);
      const descLines = doc.splitTextToSize(cleanDesc, contentWidth);
      doc.text(descLines, marginX, currentY);
      currentY += descLines.length * 4.2 + 2;
    }
  }

  // =========================================================================
  // 2. METADATOS: RACIONES ESCALADAS, TIEMPO, DIFICULTAD Y NIVEL
  // =========================================================================
  const tiempoMin = receta?.tiempo_total_min || receta?.tiempo_coccion_min || 15;
  const dificultadText = sanitizeRecipePdfText(
    receta?.dificultad ? String(receta.dificultad) : isEn ? 'Medium' : 'Media'
  );
  const levelLabel = sanitizeRecipePdfText(
    nivelCulinario ? String(nivelCulinario) : isEn ? 'Intermediate' : 'Intermedio'
  );

  const metaParts: string[] = [
    `${isEn ? 'Servings:' : 'Raciones:'} ${targetServings}`,
    `${isEn ? 'Total time:' : 'Tiempo total:'} ${tiempoMin} min`,
    `${isEn ? 'Difficulty:' : 'Dificultad:'} ${dificultadText}`,
    `${isEn ? 'Culinary level:' : 'Nivel culinario:'} ${levelLabel}`,
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_BRAND);
  doc.text(metaParts.join('   |   '), marginX, currentY);
  currentY += 4;

  // Información nutricional por ración (si existe)
  const hasNutrition =
    receta?.calorias_por_porcion != null ||
    receta?.proteinas_por_porcion != null ||
    receta?.carbohidratos_por_porcion != null ||
    receta?.grasas_por_porcion != null;

  if (hasNutrition) {
    const nutParts: string[] = [];
    if (receta?.calorias_por_porcion != null) {
      nutParts.push(`${Math.round(Number(receta.calorias_por_porcion))} kcal`);
    }
    if (receta?.proteinas_por_porcion != null) {
      nutParts.push(
        `${isEn ? 'Protein' : 'Proteinas'}: ${Math.round(Number(receta.proteinas_por_porcion))}g`
      );
    }
    if (receta?.carbohidratos_por_porcion != null) {
      nutParts.push(
        `${isEn ? 'Carbs' : 'Carbohidratos'}: ${Math.round(Number(receta.carbohidratos_por_porcion))}g`
      );
    }
    if (receta?.grasas_por_porcion != null) {
      nutParts.push(
        `${isEn ? 'Fats' : 'Grasas'}: ${Math.round(Number(receta.grasas_por_porcion))}g`
      );
    }
    if (receta?.fibra_por_porcion != null) {
      nutParts.push(
        `${isEn ? 'Fiber' : 'Fibra'}: ${Math.round(Number(receta.fibra_por_porcion))}g`
      );
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `${isEn ? 'Nutrition per serving:' : 'Nutricion por racion:'} ${nutParts.join('  -  ')}`,
      marginX,
      currentY
    );
    currentY += 4;
  }

  // Línea divisoria editorial
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 6;

  // =========================================================================
  // 3. TABLA DE INGREDIENTES ESCALADOS
  // =========================================================================
  const isBaking = isBakingOrPastryContext({
    titulo: receta?.titulo || '',
    rol_plato: receta?.rol_plato,
    categorias: receta?.etiquetas,
    ingredientes,
  });

  const scaledIngredientes = scaleIngredientsWithCulinaryHeuristics(
    ingredientes,
    baseServings,
    targetServings,
    {
      titulo: receta?.titulo || '',
      rol_plato: receta?.rol_plato,
      categorias: receta?.etiquetas,
      isBaking,
    }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text(
    isEn
      ? `Ingredients (${targetServings} ${targetServings === 1 ? 'serving' : 'servings'})`
      : `Ingredientes (${targetServings} ${targetServings === 1 ? 'racion' : 'raciones'})`,
    marginX,
    currentY
  );
  currentY += 3;

  const ingredientsBody = scaledIngredientes.map((ing) => {
    const cleanName = sanitizeRecipePdfText(
      cleanIngredientName(ing.nombre_limpio || ing.nombre_crudo || '')
    );
    const unitRaw = sanitizeRecipePdfText(ing.unidad || '');
    const isToTaste =
      /al\s*gusto|to\s*taste|pizca|pinch/i.test(unitRaw) || ing.rol_culinario === 'invariable';
    const qtyStr = isToTaste
      ? unitRaw || (isEn ? 'To taste' : 'Al gusto')
      : `${formatPdfAmount(ing.cantidad_escalada ?? ing.cantidad)} ${unitRaw}`.trim();
    const notesStr = sanitizeRecipePdfText(ing.notas || '');

    return ['[   ]', cleanName || '-', qtyStr, notesStr || '-'];
  });

  if (ingredientsBody.length > 0) {
    runAutoTable(doc, {
      startY: currentY,
      head: [
        [
          isEn ? 'Check' : 'Lista',
          isEn ? 'Ingredient' : 'Ingrediente',
          isEn ? 'Quantity' : 'Cantidad',
          isEn ? 'Notes' : 'Notas',
        ],
      ],
      body: ingredientsBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.5,
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        textColor: COLOR_DARK,
        valign: 'middle',
      },
      headStyles: {
        fillColor: COLOR_BRAND,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: COLOR_BG_ALT,
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: COLOR_MUTED },
        1: { cellWidth: 78, fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { textColor: COLOR_MUTED, fontSize: 8 },
      },
      margin: { left: marginX, right: marginX },
    });

    currentY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 8
      : currentY + 20;
  }

  // =========================================================================
  // 4. PREPARACIÓN PASO A PASO SEGÚN NIVEL CULINARIO
  // =========================================================================
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text(
    isEn ? 'Step-by-Step Preparation' : 'Preparacion Paso a Paso',
    marginX,
    currentY
  );
  currentY += 3;

  const sortedPasos = [...pasos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const normLevel = (nivelCulinario || 'Intermedio').toString().trim().toLowerCase();

  const stepsBody = sortedPasos.map((paso, idx) => {
    const stepNum = paso.orden || idx + 1;

    let rawInstruction = paso.instruccion || '';
    if (normLevel === 'principiante' || normLevel === 'beginner') {
      rawInstruction = paso.instruccion_principiante || paso.instruccion || '';
    } else if (normLevel === 'avanzado' || normLevel === 'advanced') {
      rawInstruction = paso.instruccion_avanzada || paso.instruccion || '';
    }

    const ratio = targetServings / (baseServings || 2);
    const scaledText =
      ratio !== 1 && scaledIngredientes.length > 0
        ? scaleStepQuantities(
            rawInstruction,
            scaledIngredientes,
            ratio,
            isEn ? 'en' : 'es',
            targetServings
          )
        : rawInstruction;

    const detailsParts: string[] = [];
    if (paso.tiempo_estimado_min && paso.tiempo_estimado_min > 0) {
      detailsParts.push(`${paso.tiempo_estimado_min} min`);
    }
    if (paso.temperatura_celsius && paso.temperatura_celsius > 0) {
      detailsParts.push(`${paso.temperatura_celsius} C`);
    } else if (paso.potencia_fuego) {
      detailsParts.push(`${ isEn ? 'Heat' : 'Fuego' }: ${sanitizeRecipePdfText(paso.potencia_fuego)}`);
    }

    let fullStepText = sanitizeRecipePdfText(scaledText);
    if (paso.consejo_pro) {
      const cleanTip = sanitizeRecipePdfText(paso.consejo_pro);
      if (cleanTip) {
        fullStepText += `\n\n${isEn ? 'Chef Tip:' : 'Consejo Pro:'} ${cleanTip}`;
      }
    }

    return [
      String(stepNum),
      fullStepText || '-',
      detailsParts.length > 0 ? detailsParts.join('\n') : '-',
    ];
  });

  if (stepsBody.length > 0) {
    runAutoTable(doc, {
      startY: currentY,
      head: [
        [
          '#',
          isEn ? 'Instruction' : 'Instruccion',
          isEn ? 'Time / Heat' : 'Tiempo / Fuego',
        ],
      ],
      body: stepsBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 3,
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        textColor: COLOR_DARK,
        valign: 'top',
      },
      headStyles: {
        fillColor: COLOR_BRAND,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: COLOR_BG_ALT,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: COLOR_BRAND },
        1: { cellWidth: 140 },
        2: { cellWidth: 30, halign: 'center', fontSize: 8, textColor: COLOR_MUTED },
      },
      margin: { left: marginX, right: marginX },
    });
  }

  // =========================================================================
  // 5. PIE DE PÁGINA CON NUMERACIÓN Y FECHA DE GENERACIÓN
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);

    const footerText = isEn
      ? `Page ${i} of ${totalPages}  ·  Generated on ${dateStr}  ·  Created with Miga`
      : `Pagina ${i} de ${totalPages}  ·  Generado el ${dateStr}  ·  Creado con Miga`;

    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Nombre de archivo normalizado: [titulo-receta]-Miga.pdf
  const tituloNormalizado =
    (cleanTitle || 'receta')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'Receta';

  doc.save(`${tituloNormalizado}-Miga.pdf`);
}
