'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Heart, Star, Minus, Plus, X } from 'lucide-react';
import { toggleFavoriteAction, updateRatingAction } from '@/app/actions/recipeRating';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeRatingHeaderProps {
  recetaId: string;
  initialFavorite: boolean;
  initialRating: number;
}

function normalizeHalfStar(value: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(5, Math.round(num * 2) / 2));
}

function StarGlyph({
  fillState,
  sizeClass,
}: {
  fillState: 'full' | 'half' | 'empty';
  sizeClass: string;
}) {
  return (
    <span className={`relative inline-flex items-center justify-center ${sizeClass} pointer-events-none`}>
      <Star
        className={`${sizeClass} transition-colors ${
          fillState === 'full'
            ? 'text-amber-500 fill-amber-400'
            : 'text-stone-300'
        }`}
      />
      {fillState === 'half' && (
        <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden flex items-center">
          <Star className={`${sizeClass} text-amber-500 fill-amber-400 shrink-0 max-w-none`} />
        </span>
      )}
    </span>
  );
}

export function RecipeRatingHeader({
  recetaId,
  initialFavorite,
  initialRating,
}: RecipeRatingHeaderProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [rating, setRating] = useState(() => normalizeHalfStar(initialRating));
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const isEn = language === 'en';

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  useEffect(() => {
    setRating(normalizeHalfStar(initialRating));
  }, [initialRating]);

  useEffect(() => {
    if (!mobilePopoverOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMobilePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [mobilePopoverOpen]);

  const handleFavoriteClick = () => {
    const prevFavorite = isFavorite;
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);

    startTransition(async () => {
      const res = await toggleFavoriteAction(recetaId, nextFavorite);
      if (!res?.success) {
        setIsFavorite(prevFavorite);
      }
    });
  };

  const commitRating = (targetScore: number, allowToggleClear = true) => {
    const normalizedTarget = normalizeHalfStar(targetScore);
    const prevRating = rating;
    const nextRating =
      allowToggleClear && rating === normalizedTarget ? 0 : normalizedTarget;

    setRating(nextRating);
    setHoverRating(null);

    startTransition(async () => {
      const res = await updateRatingAction(recetaId, nextRating);
      if (!res?.success) {
        setRating(prevRating);
      } else if (typeof res.rating === 'number') {
        setRating(normalizeHalfStar(res.rating));
      }
    });
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  const getStarFillState = (starIndex: number, value: number): 'full' | 'half' | 'empty' => {
    if (value >= starIndex) return 'full';
    if (value >= starIndex - 0.5) return 'half';
    return 'empty';
  };

  return (
    <div
      ref={containerRef}
      className="relative h-9 flex items-center gap-1.5 sm:gap-2.5 bg-white px-1.5 sm:px-3 rounded-xl border border-[#e7dfd5] shadow-2xs"
    >
      {/* Botón de Favorito (Corazón) */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        title={isFavorite ? t('recipe_favorite_remove') : t('recipe_favorite_add')}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
          isFavorite
            ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
            : 'bg-[#faf7f2] text-stone-400 hover:text-stone-700 hover:bg-[#f4efe6]'
        }`}
      >
        <Heart
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
            isFavorite ? 'fill-rose-500 scale-110' : ''
          }`}
        />
      </button>

      <span className="h-4 w-px bg-[#e7dfd5]" />

      {/* Vista Móvil (< sm): Botón compacto que abre selector táctil de medias estrellas */}
      <button
        type="button"
        onClick={() => setMobilePopoverOpen((prev) => !prev)}
        aria-expanded={mobilePopoverOpen}
        aria-haspopup="true"
        className="flex sm:hidden items-center gap-1 px-1.5 h-7 rounded-lg hover:bg-[#faf7f2] active:scale-95 transition cursor-pointer"
        title={isEn ? 'Rate recipe (0.5 to 5.0)' : 'Valorar receta (0.5 a 5.0)'}
      >
        <StarGlyph
          fillState={
            rating === 0
              ? 'empty'
              : rating % 1 !== 0
              ? 'half'
              : 'full'
          }
          sizeClass="w-3.5 h-3.5"
        />
        <span className="text-xs font-bold text-stone-700 tabular-nums font-serif-recipe">
          {rating > 0 ? rating.toFixed(1) : '·'}
        </span>
      </button>

      {/* Popover táctil móvil para asignar estrellas enteras o medias estrellas cómodamente */}
      {mobilePopoverOpen && (
        <div
          role="dialog"
          aria-label={isEn ? 'Rate recipe' : 'Valorar receta'}
          className="sm:hidden absolute right-0 top-full mt-2 z-50 w-[264px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-[#e7dfd5] shadow-xl p-3 space-y-2.5 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-stone-800">
              {isEn ? 'Rate this recipe' : 'Valorar receta'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full tabular-nums">
                {rating > 0 ? `${rating.toFixed(1)} / 5` : '0.0 / 5'}
              </span>
              <button
                type="button"
                onClick={() => setMobilePopoverOpen(false)}
                aria-label={isEn ? 'Close' : 'Cerrar'}
                className="w-6 h-6 rounded-lg bg-[#faf7f2] text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5 estrellas grandes con mitades táctiles (izquierda = .5, derecha = .0) */}
          <div className="flex items-center justify-between gap-0.5 py-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const halfScore = star - 0.5;
              const fillState = getStarFillState(star, rating);

              return (
                <div
                  key={star}
                  className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-[#faf7f2]/70"
                >
                  <StarGlyph fillState={fillState} sizeClass="w-7 h-7" />

                  {/* Mitad izquierda: media estrella (star - 0.5) */}
                  <button
                    type="button"
                    onClick={() => commitRating(halfScore)}
                    aria-label={`${t('recipe_rate_stars')} ${halfScore.toFixed(1)} ${t('recipe_of_5_stars')}`}
                    className="absolute inset-y-0 left-0 w-1/2 cursor-pointer rounded-l-xl active:bg-amber-100/50 focus:outline-none"
                  />

                  {/* Mitad derecha: estrella completa (star) */}
                  <button
                    type="button"
                    onClick={() => commitRating(star)}
                    aria-label={`${t('recipe_rate_stars')} ${star.toFixed(1)} ${t('recipe_of_5_stars')}`}
                    className="absolute inset-y-0 right-0 w-1/2 cursor-pointer rounded-r-xl active:bg-amber-100/50 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          {/* Ajuste fino -0.5 / +0.5 y botón limpiar */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f0e9df]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={rating <= 0}
                onClick={() => commitRating(rating - 0.5, false)}
                className="h-8 px-2.5 rounded-lg bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Minus className="w-3 h-3" />
                <span>0.5</span>
              </button>
              <button
                type="button"
                disabled={rating >= 5}
                onClick={() => commitRating(rating + 0.5, false)}
                className="h-8 px-2.5 rounded-lg bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>0.5</span>
              </button>
            </div>

            {rating > 0 && (
              <button
                type="button"
                onClick={() => commitRating(0, false)}
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                {isEn ? 'Clear' : 'Quitar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vista Escritorio (>= sm): 5 Estrellas Interactivas con Medias Estrellas precisas */}
      <div
        className="hidden sm:flex items-center gap-0.5"
        onMouseLeave={() => setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const halfScore = star - 0.5;
          const fillState = getStarFillState(star, currentDisplayRating);

          return (
            <div
              key={star}
              className="relative w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#faf7f2] transition-colors"
            >
              <StarGlyph fillState={fillState} sizeClass="w-4 h-4" />

              {/* Zona izquierda: media estrella */}
              <button
                type="button"
                onClick={() => commitRating(halfScore)}
                onMouseEnter={() => setHoverRating(halfScore)}
                title={`${t('recipe_rate_stars')} ${halfScore.toFixed(1)} ${t('recipe_of_5_stars')}`}
                aria-label={`${t('recipe_rate_stars')} ${halfScore.toFixed(1)} ${t('recipe_of_5_stars')}`}
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer focus:outline-none"
              />

              {/* Zona derecha: estrella completa */}
              <button
                type="button"
                onClick={() => commitRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                title={`${t('recipe_rate_stars')} ${star.toFixed(1)} ${t('recipe_of_5_stars')}`}
                aria-label={`${t('recipe_rate_stars')} ${star.toFixed(1)} ${t('recipe_of_5_stars')}`}
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer focus:outline-none"
              />
            </div>
          );
        })}

        {currentDisplayRating > 0 && (
          <span className="text-xs font-bold text-stone-700 tabular-nums font-serif-recipe pl-1 min-w-[26px] text-right">
            {currentDisplayRating.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
