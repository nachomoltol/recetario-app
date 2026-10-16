'use client';

import { useState, useTransition } from 'react';
import {
  Tag,
  Plus,
  X,
  Edit2,
  Check,
  UtensilsCrossed,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { updateRecipeTagsAction } from '@/app/actions/recipeTags';

export const CATEGORIAS_GASTRONOMICAS_PRESET = [
  'Pasta',
  'Carnes',
  'Aves',
  'Pescados y Mariscos',
  'Vegano',
  'Vegetariano',
  'Arroces',
  'Ensaladas',
  'Guisos y Legumbres',
  'Sopas y Cremas',
  'Postres y Dulces',
  'Panadería y Masas',
  'Tapas y Snacks',
];

export const MOMENTOS_CONSUMO_PRESET = [
  'Desayuno',
  'Almuerzo',
  'Cena',
  'Snack',
  'Postre',
  'Pre-entreno',
  'Post-entreno',
  'Batch Cooking',
  'Rápido (<20m)',
];

interface RecipeTagsEditorProps {
  recetaId: string;
  initialTags: string[];
}

export function RecipeTagsEditor({ recetaId, initialTags }: RecipeTagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isEditing, setIsEditing] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isGastronomic = (tag: string) => {
    try {
      const t = String(tag || '').toLowerCase().trim();
      return CATEGORIAS_GASTRONOMICAS_PRESET.some(
        (p) => p.toLowerCase() === t || t.includes(p.toLowerCase())
      );
    } catch {
      return false;
    }
  };

  const isMoment = (tag: string) => {
    try {
      const t = String(tag || '').toLowerCase().trim();
      return MOMENTOS_CONSUMO_PRESET.some(
        (p) => p.toLowerCase() === t || t.includes(p.toLowerCase())
      );
    } catch {
      return false;
    }
  };

  const handleAddTag = (newTag: string) => {
    const trimmed = String(newTag || '').trim();
    if (!trimmed) return;
    if (tags.some((t) => String(t || '').toLowerCase() === trimmed.toLowerCase())) return;
    setTags([...tags, trimmed]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateRecipeTagsAction({
        recetaId,
        etiquetas: tags,
      });

      if (res.success && res.etiquetas) {
        setTags(res.etiquetas);
        setIsEditing(false);
        setSaveMessage('Etiquetas guardadas con éxito');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        alert(res.error || 'Error al guardar etiquetas');
      }
    });
  };

  const handleCancel = () => {
    setTags(initialTags || []);
    setIsEditing(false);
  };

  const gastronomicTags = tags.filter((t) => isGastronomic(t));
  const momentTags = tags.filter((t) => isMoment(t) && !isGastronomic(t));
  const otherTags = tags.filter((t) => !isGastronomic(t) && !isMoment(t));

  return (
    <div className="space-y-3">
      {/* Barra de Etiquetas en Vista de Lectura */}
      {!isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          {tags.length === 0 ? (
            <span className="text-xs text-stone-400 italic">Sin categorías asignadas</span>
          ) : (
            <>
              {/* Categorías Gastronómicas (Terracota / Ámbar) */}
              {gastronomicTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] shadow-2xs"
                >
                  <UtensilsCrossed className="w-3 h-3 shrink-0" />
                  <span>{tag}</span>
                </span>
              ))}

              {/* Momentos de Consumo & Funcionales (Verde Salvia / Oliva) */}
              {momentTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#edf3ee] text-[#2e6b3e] border border-[#d8e5da] shadow-2xs"
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{tag}</span>
                </span>
              ))}

              {/* Otras Etiquetas */}
              {otherTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200"
                >
                  <Tag className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{tag}</span>
                </span>
              ))}
            </>
          )}

          {/* Botón para editar o añadir categorías */}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-[#f4efe6] border border-[#e7dfd5] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3 h-3 text-[#a86224]" />
            <span>{tags.length === 0 ? 'Añadir categorías' : 'Editar'}</span>
          </button>

          {saveMessage && (
            <span className="text-xs text-[#2e6b3e] font-medium animate-in fade-in">
              ✓ {saveMessage}
            </span>
          )}
        </div>
      ) : (
        /* Panel de Edición Interactivo y Táctil */
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#f4efe6] pb-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#a86224]" />
                <span>Gestor de Categorías y Momentos</span>
              </h4>
              <p className="text-xs text-stone-500">
                Personaliza la clasificación gastronómica y los momentos de consumo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="min-h-[40px] px-4 rounded-xl text-xs font-semibold text-white bg-[#a86224] hover:bg-[#8e511c] transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-3" />
                )}
                <span>Guardar</span>
              </button>
            </div>
          </div>

          {/* Etiquetas activas con botón de eliminar táctil */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-700 block">
              Etiquetas activas ({tags.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-xs text-stone-400 italic">No hay etiquetas seleccionadas.</span>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="w-4 h-4 rounded-full text-[#a86224] hover:bg-[#eae1d2] flex items-center justify-center cursor-pointer"
                      title={`Eliminar ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Sugerencias rápidas: Categorías Gastronómicas */}
          <div className="space-y-2 pt-2 border-t border-[#f4efe6]">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#a86224]" />
              <span>Sugerencias Gastronómicas (Toca para añadir):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_GASTRONOMICAS_PRESET.map((cat) => {
                const isSelected = tags.some((t) => t.toLowerCase() === cat.toLowerCase());
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => (isSelected ? handleRemoveTag(cat) : handleAddTag(cat))}
                    className={`min-h-[32px] px-2.5 py-1 rounded-full text-xs transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#c27835] text-white font-semibold'
                        : 'bg-stone-50 hover:bg-[#f4efe6] text-stone-700 border border-stone-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-stone-400" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sugerencias rápidas: Momentos de Consumo & Funcionales */}
          <div className="space-y-2 pt-2 border-t border-[#f4efe6]">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2e6b3e]" />
              <span>Momentos de Consumo & Etiquetas Funcionales:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MOMENTOS_CONSUMO_PRESET.map((mom) => {
                const isSelected = tags.some((t) => t.toLowerCase() === mom.toLowerCase());
                return (
                  <button
                    key={mom}
                    type="button"
                    onClick={() => (isSelected ? handleRemoveTag(mom) : handleAddTag(mom))}
                    className={`min-h-[32px] px-2.5 py-1 rounded-full text-xs transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#2e6b3e] text-white font-semibold'
                        : 'bg-stone-50 hover:bg-[#edf3ee] text-stone-700 border border-stone-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-stone-400" />}
                    <span>{mom}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Añadir etiqueta personalizada */}
          <div className="pt-2 border-t border-[#f4efe6]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTag(customTagInput);
                setCustomTagInput('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Escribe otra etiqueta o dieta (ej. Sin gluten, Keto...)"
                className="flex-1 min-h-[42px] px-3.5 rounded-xl text-xs sm:text-sm bg-[#faf7f2] border border-[#e7dfd5] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#a86224]"
              />
              <button
                type="submit"
                disabled={!customTagInput.trim()}
                className="min-h-[42px] px-4 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white transition disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
