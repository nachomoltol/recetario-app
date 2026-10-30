import { PlannedSlotItem, UnifiedShoppingItem } from '@/app/actions/mealPlanner';
import { ConsolidatedShoppingItem } from '@/lib/culinary/consolidateShoppingItems';

export interface ExportPdfDayInfo {
  dateStr: string;
  dayName: string;
  dayNum: number;
}

export interface ExportMealPlanPdfParams {
  dateRangeLabel: string;
  days: ExportPdfDayInfo[];
  plans: PlannedSlotItem[];
  shoppingItems: (UnifiedShoppingItem | ConsolidatedShoppingItem)[];
  defaultServings?: number;
  language?: string;
}

/**
 * Servicio puro de exportación a PDF Pro con maquetación editorial Miga.
 * Genera un PDF vectorial A4 de alta calidad:
 * - Página 1: Matriz del Menú Semanal (Planning Grid)
 * - Páginas 2+: Lista de la Compra Unificada organizada por pasillos con casillas para tachar
 */
export async function exportMealPlanToPdf(params: ExportMealPlanPdfParams): Promise<void> {
  const {
    dateRangeLabel,
    days,
    plans,
    shoppingItems,
    defaultServings = 4,
    language = 'es',
  } = params;

  const isEn = language === 'en';

  // Importación dinámica bajo demanda para evitar bloat en el bundle inicial
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

  // Paleta de Colores Miga Editorial
  const COLOR_BRAND = [168, 98, 36] as [number, number, number]; // #a86224
  const COLOR_DARK = [44, 40, 37] as [number, number, number]; // #2c2825
  const COLOR_MUTED = [120, 113, 108] as [number, number, number]; // #78716c
  const COLOR_BG_ALT = [250, 247, 242] as [number, number, number]; // #faf7f2
  const COLOR_BORDER = [231, 223, 213] as [number, number, number]; // #e7dfd5

  // =========================================================================
  // PÁGINA 1: MENÚ Y PLANIFICACIÓN SEMANAL
  // =========================================================================

  // Cabecera Editorial
  let currentY = 16;

  // Marca / Logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_BRAND);
  doc.text('M I G A', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    isEn ? 'Culinary Planning & Smart Cookbook' : 'Organización Culinaria & Recetario Inteligente',
    marginX + 45,
    currentY - 1.5
  );

  currentY += 8;

  // Título del documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text(isEn ? 'Weekly Meal Plan' : 'Planificación Semanal de Comidas', marginX, currentY);

  currentY += 5;

  // Metadatos (rango de fechas, raciones, fecha de emisión)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  const periodText = `${isEn ? 'Period:' : 'Período:'} ${dateRangeLabel}`;
  const dinersText = `${isEn ? 'Servings:' : 'Comensales base:'} ${defaultServings} ${isEn ? 'servings' : 'raciones'}`;
  doc.text(`${periodText}  ·  ${dinersText}`, marginX, currentY);

  currentY += 4;

  // Línea decorativa sutil
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 6;

  // Momentos de comida a mostrar en la matriz
  const slotRows: { slotKey: string; label: string }[] = [
    { slotKey: 'desayuno', label: isEn ? 'Breakfast' : 'Desayuno' },
    { slotKey: 'almuerzo', label: isEn ? 'Lunch' : 'Almuerzo' },
    { slotKey: 'cena', label: isEn ? 'Dinner' : 'Cena' },
    { slotKey: 'snack_postre', label: isEn ? 'Snack / Dessert' : 'Snack / Postre' },
  ];

  // Preparar encabezados de la tabla (Momento + cada día)
  const tableHead = [
    [
      isEn ? 'Meal' : 'Momento',
      ...days.map((d) => `${d.dayName}\n${d.dayNum}`),
    ],
  ];

  // Construir las filas de la tabla
  const tableBody = slotRows.map((slotInfo) => {
    const row = [slotInfo.label];

    for (const day of days) {
      const dayPlans = plans.filter((p) => p.fecha === day.dateStr);

      if (slotInfo.slotKey === 'almuerzo') {
        const almuerzo1 = dayPlans.find((p) => p.slot === 'almuerzo_1');
        const almuerzo2 = dayPlans.find((p) => p.slot === 'almuerzo_2');
        const almuerzoUnico = dayPlans.find((p) => p.slot === 'almuerzo');

        const parts: string[] = [];
        const title1 = almuerzo1?.receta?.titulo || (almuerzo1 as any)?.recetas?.titulo;
        const title2 = almuerzo2?.receta?.titulo || (almuerzo2 as any)?.recetas?.titulo;
        const titleUnico = almuerzoUnico?.receta?.titulo || (almuerzoUnico as any)?.recetas?.titulo;

        if (title1) {
          parts.push(`1º: ${title1}`);
        }
        if (title2) {
          parts.push(`2º: ${title2}`);
        }
        if (parts.length === 0 && titleUnico) {
          parts.push(titleUnico);
        }

        row.push(parts.length > 0 ? parts.join('\n\n') : '—');
      } else {
        const match = dayPlans.find((p) => p.slot === slotInfo.slotKey);
        const title = match?.receta?.titulo || (match as any)?.recetas?.titulo;
        row.push(title || '—');
      }
    }

    return row;
  });

  // Renderizar la tabla de planificación semanal
  runAutoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
      textColor: COLOR_DARK,
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLOR_BRAND,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: COLOR_BG_ALT,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        fillColor: [245, 240, 232],
        cellWidth: 26,
      },
    },
    margin: { left: marginX, right: marginX },
  });

  // =========================================================================
  // PÁGINA 2+: LISTA DE LA COMPRA CONSOLIDADA POR PASILLOS
  // =========================================================================
  doc.addPage();
  currentY = 16;

  // Cabecera Lista de la Compra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_BRAND);
  doc.text('M I G A', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    isEn ? 'Unified Grocery Shopping List' : 'Lista de la Compra Unificada',
    marginX + 45,
    currentY - 1.5
  );

  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_DARK);
  doc.text(
    isEn ? 'Supermarket Aisles Checklist' : 'Pasillos de Supermercado & Checklist',
    marginX,
    currentY
  );

  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    isEn
      ? `Consolidated for ${dateRangeLabel} · Check off items as you buy`
      : `Consolidada para ${dateRangeLabel} · Marca las casillas al comprar`,
    marginX,
    currentY
  );

  currentY += 4;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 6;

  // Separar ítems normales de ítems de despensa
  const regularItems = (shoppingItems || []).filter(
    (item) => item.unidad !== 'Comprobar despensa' && item.cantidadTotal > 0
  );
  const pantryItems = (shoppingItems || []).filter(
    (item) => item.unidad === 'Comprobar despensa' || item.cantidadTotal === 0
  );

  // Agrupar los ítems normales por pasillo
  const aisleMap = new Map<string, (UnifiedShoppingItem | ConsolidatedShoppingItem)[]>();
  for (const item of regularItems) {
    const aisle = item.pasillo_supermercado || (isEn ? 'Other' : 'Varios');
    if (!aisleMap.has(aisle)) {
      aisleMap.set(aisle, []);
    }
    aisleMap.get(aisle)!.push(item);
  }

  // Ordenar alfabéticamente los pasillos
  const sortedAisles = Array.from(aisleMap.keys()).sort();

  // Construir filas de la tabla de compra
  const shoppingTableBody: any[] = [];

  for (const aisle of sortedAisles) {
    // Fila divisoria de pasillo
    shoppingTableBody.push([
      {
        content: `📍 ${aisle.toUpperCase()}`,
        colSpan: 4,
        styles: {
          fillColor: [245, 239, 230],
          textColor: COLOR_BRAND,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
      },
    ]);

    const itemsInAisle = aisleMap.get(aisle)!;
    for (const it of itemsInAisle) {
      const cantidadFormatted = `${it.cantidadTotal} ${it.unidad}`;
      const recetasText = (it.recetasNombres || []).length > 0
        ? (it.recetasNombres || []).join(', ')
        : '—';

      shoppingTableBody.push([
        '[   ]',
        it.nombre,
        cantidadFormatted,
        recetasText,
      ]);
    }
  }

  // Añadir sección final de Despensa / Condimentos si existen
  if (pantryItems.length > 0) {
    shoppingTableBody.push([
      {
        content: isEn
          ? '🧂 CHECK IN PANTRY (Already in stock or to taste)'
          : '🧂 REVISAR EN DESPENSA (Básicos, condimentos o al gusto)',
        colSpan: 4,
        styles: {
          fillColor: [240, 235, 225],
          textColor: [120, 90, 40],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
      },
    ]);

    for (const it of pantryItems) {
      const recetasText = (it.recetasNombres || []).length > 0
        ? (it.recetasNombres || []).join(', ')
        : '—';

      shoppingTableBody.push([
        '[   ]',
        it.nombre,
        isEn ? 'In pantry' : 'En despensa',
        recetasText,
      ]);
    }
  }

  runAutoTable(doc, {
    startY: currentY,
    head: [
      [
        isEn ? 'Check' : 'Comprar',
        isEn ? 'Ingredient' : 'Ingrediente',
        isEn ? 'Amount' : 'Cantidad',
        isEn ? 'Recipes' : 'Recetas de origen',
      ],
    ],
    body: shoppingTableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
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
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: COLOR_MUTED },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { textColor: COLOR_MUTED, fontSize: 7.5 },
    },
    margin: { left: marginX, right: marginX },
  });

  // =========================================================================
  // PIE DE PÁGINA EN TODAS LAS HOJAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);

    const footerText = isEn
      ? `Page ${i} of ${totalPages}  ·  Created with Miga`
      : `Página ${i} de ${totalPages}  ·  Creado con Miga (Planificador Inteligente)`;

    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Descarga directa en el navegador
  const cleanRange = dateRangeLabel.replace(/[\/\s—-]+/g, '_');
  const filename = `Miga_Plan_Semanal_${cleanRange}.pdf`;
  doc.save(filename);
}
