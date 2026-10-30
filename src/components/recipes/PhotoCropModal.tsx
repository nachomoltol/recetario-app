'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Check, X, Loader2, Move } from 'lucide-react';

export interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void | Promise<void>;
  aspectRatio?: number; // Relación ancho / alto (por defecto 16 / 9)
  outputWidth?: number; // Ancho del canvas de salida (por defecto 1600)
  outputHeight?: number; // Alto del canvas de salida (por defecto 900)
  title?: string;
  subtitle?: string;
}

export function PhotoCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 16 / 9,
  outputWidth = 1600,
  outputHeight = 900,
  title = 'Encuadra tu plato',
  subtitle = 'Arrastra con el dedo y usa el zoom para centrar tu creación',
}: PhotoCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Referencias para seguimiento de arrastre y pinch-to-zoom
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef(1);

  // Medir contenedor y reaccionar a cambios de pantalla/orientación
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const el = containerRef.current;
    const updateSize = () => {
      if (el) {
        const rect = el.getBoundingClientRect();
        setContainerSize({
          width: rect.width || el.clientWidth,
          height: rect.height || el.clientHeight,
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  // Cargar imagen en memoria cuando cambia imageSrc
  useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImageElement(null);
      setIsImageLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width || containerRef.current.clientWidth,
          height: rect.height || containerRef.current.clientHeight,
        });
      }
      setImageElement(img);
      setIsImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Dimensiones efectivas del contenedor e imagen
  const effectiveContainerW = containerSize.width || containerRef.current?.clientWidth || 0;
  const effectiveContainerH = containerSize.height || containerRef.current?.clientHeight || 0;
  const imgNaturalW = imageElement?.naturalWidth || 1;
  const imgNaturalH = imageElement?.naturalHeight || 1;

  // Escala base para cubrir el contenedor completo (cover)
  const baseScale =
    effectiveContainerW > 0 && effectiveContainerH > 0 && imageElement
      ? Math.max(effectiveContainerW / imgNaturalW, effectiveContainerH / imgNaturalH)
      : 1;

  // Calcular dimensiones y cotas de la imagen en el visor
  const getBounds = useCallback(() => {
    const curCW = containerRef.current?.clientWidth || containerSize.width;
    const curCH = containerRef.current?.clientHeight || containerSize.height;

    if (!curCW || !curCH || !imageElement) {
      return { containerW: 0, containerH: 0, baseScale: 1, scale: 1, maxOffsetX: 0, maxOffsetY: 0 };
    }

    const curImgW = imageElement.naturalWidth || 1;
    const curImgH = imageElement.naturalHeight || 1;

    // Escala base para cubrir el contenedor completo (cover)
    const bScale = Math.max(curCW / curImgW, curCH / curImgH);
    const currentScale = bScale * zoom;

    const displayedW = curImgW * currentScale;
    const displayedH = curImgH * currentScale;

    // Límites de arrastre para no dejar huecos negros en los bordes
    const maxOffsetX = Math.max(0, (displayedW - curCW) / 2);
    const maxOffsetY = Math.max(0, (displayedH - curCH) / 2);

    return { containerW: curCW, containerH: curCH, baseScale: bScale, scale: currentScale, maxOffsetX, maxOffsetY };
  }, [containerSize.width, containerSize.height, imageElement, zoom]);

  // Clampear offset a los límites válidos
  const clampOffset = useCallback(
    (newX: number, newY: number) => {
      const { maxOffsetX, maxOffsetY } = getBounds();
      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY)),
      };
    },
    [getBounds]
  );

  // Re-clampear offset cuando cambia el zoom
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
  }, [zoom, clampOffset]);

  // Manejo de interacción de ratón (Escritorio)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(clampOffset(initialOffsetRef.current.x + dx, initialOffsetRef.current.y + dy));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejo de interacción táctil con 1 dedo (Pan) y 2 dedos (Pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setIsPinching(false);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setOffset(clampOffset(initialOffsetRef.current.x + dx, initialOffsetRef.current.y + dy));
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const newZoom = Math.max(1, Math.min(3, Math.round(initialZoomRef.current * ratio * 100) / 100));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPinching(false);
    initialPinchDistRef.current = null;
  };

  // Zoom con rueda de ratón en escritorio
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.max(1, Math.min(3, Math.round((prev + delta) * 100) / 100)));
  };

  // Generación final del recorte con Canvas nativo de alta resolución
  const handleConfirmCrop = async () => {
    if (!imageElement || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const { containerW, containerH, scale } = getBounds();
      const imgW = imageElement.naturalWidth;
      const imgH = imageElement.naturalHeight;

      if (containerW <= 0 || containerH <= 0 || scale <= 0) {
        throw new Error('Dimensiones no válidas para recorte.');
      }

      // Cálculo inverso exacto de coordenadas fuente en la imagen original
      const displayedW = imgW * scale;
      const displayedH = imgH * scale;

      const imgTopLeftInViewX = containerW / 2 + offset.x - displayedW / 2;
      const imgTopLeftInViewY = containerH / 2 + offset.y - displayedH / 2;

      const sx = (0 - imgTopLeftInViewX) / scale;
      const sy = (0 - imgTopLeftInViewY) / scale;
      const sw = containerW / scale;
      const sh = containerH / scale;

      // Asegurar que las coordenadas de origen estén dentro de los límites físicos de la imagen
      const safeSx = Math.max(0, Math.min(imgW - 1, sx));
      const safeSy = Math.max(0, Math.min(imgH - 1, sy));
      const safeSw = Math.max(1, Math.min(sw, imgW - safeSx));
      const safeSh = Math.max(1, Math.min(sh, imgH - safeSy));

      // Crear canvas off-screen con dimensiones de salida de alta resolución
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto Canvas 2D.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Dibujar porción recortada directamente desde la imagen original
      ctx.drawImage(
        imageElement,
        safeSx,
        safeSy,
        safeSw,
        safeSh,
        0,
        0,
        outputWidth,
        outputHeight
      );

      // Exportar como JPEG al 85% de calidad
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Fallo al generar el archivo JPEG.'));
              return;
            }
            try {
              await onCropComplete(blob);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          'image/jpeg',
          0.85
        );
      });
    } catch (err) {
      console.error('Error al encuadrar la fotografía:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-[#1c1917] text-white rounded-3xl border border-stone-800 p-4 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 sm:space-y-5 flex flex-col max-h-[92vh]">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-white">
              {title}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visor de recorte interactivo (16:9) */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-stone-800 bg-black shadow-inner flex items-center justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ aspectRatio: `${aspectRatio}` }}
            className="w-full relative overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing flex items-center justify-center bg-stone-950"
          >
            {!isImageLoaded ? (
              <div className="flex flex-col items-center justify-center gap-2 text-stone-500 py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#a86224]" />
                <span className="text-xs">Cargando imagen...</span>
              </div>
            ) : (
              <>
                {/* Imagen manipulable con CSS Transform para máxima fluidez a 60fps */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc || ''}
                  alt="Encuadre"
                  draggable={false}
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${baseScale * zoom})`,
                    transformOrigin: 'center center',
                    willChange: 'transform',
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                  className={`pointer-events-none select-none ${
                    isDragging || isPinching ? 'transition-none' : 'transition-transform duration-100 ease-out'
                  }`}
                />

                {/* Rejilla guía fotográfica (Regla de los Tercios) translúcida */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Indicador sutil de arrastre */}
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] text-stone-300 font-medium flex items-center gap-1.5 pointer-events-none border border-white/10">
                  <Move className="w-3 h-3 text-[#c27835]" />
                  <span>Arrastra para encuadrar</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Barra de control de Zoom */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Aumento / Zoom</span>
            <span className="font-mono text-stone-300 font-medium">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, Math.round((prev - 0.2) * 100) / 100))}
              disabled={zoom <= 1 || isProcessing}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isProcessing}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#a86224] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Math.round((prev + 0.2) * 100) / 100))}
              disabled={zoom >= 3 || isProcessing}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={!isImageLoaded || isProcessing}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-[#a86224] hover:bg-[#8e511c] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Encuadrando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Guardar plato</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

