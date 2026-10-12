'use client';

import { useState, useTransition } from 'react';
import { Heart, Star } from 'lucide-react';
import { toggleFavoriteAction, updateRatingAction } from '@/app/actions/recipeRating';

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

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-2xl border border-[#e7dfd5] shadow-2xs">
      {/* Botón de Favorito (Corazón) */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
          isFavorite
            ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
            : 'bg-[#faf7f2] text-stone-400 hover:text-stone-700 hover:bg-[#f4efe6]'
        }`}
      >
        <Heart
          className={`w-4 h-4 transition-transform ${
            isFavorite ? 'fill-rose-500 scale-110' : ''
          }`}
        />
      </button>

      <span className="h-4 w-px bg-[#e7dfd5]" />

      {/* 5 Estrellas Interactivas (0-5) */}
      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentDisplayRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              title={`Puntuar con ${star} de 5 estrellas`}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#faf7f2] transition-colors cursor-pointer active:scale-95"
            >
              <Star
                className={`w-4 h-4 transition-all ${
                  isFilled
                    ? 'text-amber-500 fill-amber-400 scale-105'
                    : 'text-stone-300 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && (
        <span className="text-xs font-bold text-stone-700 tabular-nums font-serif-recipe pl-0.5">
          {rating}.0
        </span>
      )}
    </div>
  );
}
