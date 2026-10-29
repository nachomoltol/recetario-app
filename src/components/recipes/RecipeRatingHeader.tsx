'use client';

import { useState, useTransition } from 'react';
import { Heart, Star } from 'lucide-react';
import { toggleFavoriteAction, updateRatingAction } from '@/app/actions/recipeRating';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeRatingHeaderProps {
  recetaId: string;
  initialFavorite: boolean;
  initialRating: number;
}

export function RecipeRatingHeader({
  recetaId,
  initialFavorite,
  initialRating,
}: RecipeRatingHeaderProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const t = useLanguageStore((s) => s.t);

  const handleFavoriteClick = () => {
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);

    startTransition(async () => {
      await toggleFavoriteAction(recetaId, nextFavorite);
    });
  };

  const handleStarClick = (score: number) => {
    // Si toca la misma estrella ya seleccionada, permite quitarla o cambiar
    const nextRating = rating === score ? 0 : score;
    setRating(nextRating);

    startTransition(async () => {
      await updateRatingAction(recetaId, nextRating);
    });
  };

  const handleCycleRatingMobile = () => {
    const nextRating = rating >= 5 ? 0 : rating + 1;
    setRating(nextRating);
    startTransition(async () => {
      await updateRatingAction(recetaId, nextRating);
    });
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="h-9 flex items-center gap-1.5 sm:gap-2.5 bg-white px-1.5 sm:px-3 rounded-xl border border-[#e7dfd5] shadow-2xs">
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

      {/* Vista Móvil (< sm): Microbadge táctil de valoración */}
      <button
        type="button"
        onClick={handleCycleRatingMobile}
        className="flex sm:hidden items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-[#faf7f2] transition cursor-pointer"
        title="Toca para valorar (1-5)"
      >
        <Star
          className={`w-3.5 h-3.5 ${
            rating > 0 ? 'text-amber-500 fill-amber-400' : 'text-stone-300'
          }`}
        />
        <span className="text-xs font-bold text-stone-700 font-serif-recipe">
          {rating > 0 ? `${rating}.0` : '·'}
        </span>
      </button>

      {/* Vista Escritorio (>= sm): 5 Estrellas Interactivas (0-5) */}
      <div className="hidden sm:flex items-center gap-0.5" onMouseLeave={() => setHoverRating(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentDisplayRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              title={`${t('recipe_rate_stars')} ${star} ${t('recipe_of_5_stars')}`}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#faf7f2] transition-colors cursor-pointer active:scale-95"
            >
              <Star
                className={`w-3.5 h-3.5 transition-all ${
                  isFilled
                    ? 'text-amber-500 fill-amber-400 scale-105'
                    : 'text-stone-300 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}

        {rating > 0 && (
          <span className="text-xs font-bold text-stone-700 tabular-nums font-serif-recipe pl-1">
            {rating}.0
          </span>
        )}
      </div>
    </div>
  );
}
