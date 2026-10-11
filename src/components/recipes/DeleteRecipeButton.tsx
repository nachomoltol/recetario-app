'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { deleteRecipeAction } from '@/app/actions/recipeDelete';

interface DeleteRecipeButtonProps {
  recipeId: string;
  recipeTitle?: string;
  redirectTo?: string;
  variant?: 'button' | 'icon';
  className?: string;
}

export function DeleteRecipeButton({
  recipeId,
  recipeTitle = 'esta receta',
  redirectTo,
  variant = 'button',
  className = '',
}: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteRecipeAction(recipeId);
      if (res.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          title="Eliminar receta"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer ${className}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`min-h-[44px] px-3.5 rounded-xl inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-500 hover:text-red-700 hover:bg-red-50 border border-[#e7dfd5] hover:border-red-200 transition-all cursor-pointer ${className}`}
        >
          <Trash2 className="w-4 h-4 text-stone-400 group-hover:text-red-600" />
          <span>Eliminar receta</span>
        </button>
      )}

      {/* Modal de confirmación Mobile-First */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl border border-[#e7dfd5] p-6 sm:p-7 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => !isPending && setIsOpen(false)}
                disabled={isPending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-[#f4efe6] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900 leading-snug">
                ¿Eliminar {recipeTitle ? `«${recipeTitle}»` : 'esta receta'}?
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Esta acción eliminará de forma irreversible la ficha culinaria, todos sus ingredientes,
                pasos técnicos y las fotografías del diario de cocinado asociadas.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-full sm:w-1/2 min-h-[48px] px-4 rounded-xl text-stone-700 bg-[#f4efe6] hover:bg-[#e7dfd5] font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full sm:w-1/2 min-h-[48px] px-4 rounded-xl text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
