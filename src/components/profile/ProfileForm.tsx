'use client';

import { useState, useTransition } from 'react';
import {
  ChefHat,
  BookOpen,
  Calendar,
  Heart,
  Camera,
  Check,
  User,
  Mail,
  Sparkles,
  Award,
  AlertCircle,
  Save,
} from 'lucide-react';
import { updateUserProfileAction } from '@/app/actions/userPreferences';
import { useProfileStore } from '@/stores/useProfileStore';

interface ChefStats {
  totalRecetas: number;
  totalPlanificadas: number;
  totalCocinados: number;
  totalFavoritas: number;
}

interface ProfileFormProps {
  initialProfile: {
    id: string;
    email: string;
    nombre: string | null;
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
    created_at?: string;
  };
  stats: ChefStats;
}

const NIVELES_CULINARIOS = [
  {
    id: 'Principiante',
    label: 'Principiante',
    badge: '🌱',
    desc: 'Aprendiendo técnicas básicas, cortes y recetas sencillas paso a paso.',
  },
  {
    id: 'Intermedio',
    label: 'Intermedio',
    badge: '🍳',
    desc: 'Manejo cómodo de sofritos, puntos de cocción y combinación de sabores.',
  },
  {
    id: 'Avanzado',
    label: 'Avanzado',
    badge: '👨‍🍳',
    desc: 'Dominio de técnicas complejas, emulsiones, fondos y creatividad culinaria.',
  },
];

const PREFERENCIAS_OPCIONES = [
  { id: 'Sin gluten', label: 'Sin gluten (Gluten-Free)' },
  { id: 'Sin lactosa', label: 'Sin lactosa' },
  { id: 'Vegetariano', label: 'Vegetariano' },
  { id: 'Vegano', label: 'Vegano' },
  { id: 'Sin frutos secos', label: 'Sin frutos secos' },
  { id: 'Bajo en sal', label: 'Bajo en sal' },
  { id: 'Sin marisco', label: 'Sin marisco' },
  { id: 'Keto / Low-Carb', label: 'Keto / Bajo en carbohidratos' },
];

export function ProfileForm({ initialProfile, stats }: ProfileFormProps) {
  const setStoreProfile = useProfileStore((s) => s.setProfile);
  const currentStoreProfile = useProfileStore((s) => s.profile);

  const [nombre, setNombre] = useState(
    initialProfile.nombre || currentStoreProfile?.nombre || ''
  );
  const [nivelCulinario, setNivelCulinario] = useState(
    initialProfile.nivel_culinario || 'Principiante'
  );
  const [preferencias, setPreferencias] = useState<string[]>(
    initialProfile.preferencias_dieteticas || []
  );

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const togglePreferencia = (prefId: string) => {
    setPreferencias((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateUserProfileAction({
        nombre: nombre.trim(),
        nivel_culinario: nivelCulinario,
        preferencias_dieteticas: preferencias,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '¡Perfil y preferencias culinarias actualizados con éxito!',
        });
        // Actualizar Zustand store local para sincronizar el header
        if (currentStoreProfile) {
          setStoreProfile({
            ...currentStoreProfile,
            nombre: nombre.trim(),
            nivel_culinario: nivelCulinario,
            preferencias_dieteticas: preferencias,
          });
        }
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al guardar los cambios.',
        });
      }
    });
  };

  const initials = (nombre || initialProfile.email.split('@')[0] || 'CH')
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = initialProfile.created_at
    ? new Date(initialProfile.created_at).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      })
    : '2026';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* TARJETA 1: Información básica del Chef */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-[#e7dfd5] pb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] font-bold text-3xl shadow-2xs shrink-0">
            {initials}
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold font-serif-recipe text-stone-900 leading-tight">
                {nombre || 'Chef'}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                {nivelCulinario}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Miembro de la cocina desde {formattedDate}
            </p>
          </div>
        </div>

        {/* Campos básicos editables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="chef-nombre"
              className="text-xs font-semibold text-stone-700 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-[#a86224]" />
              <span>Nombre de Chef o Apodo</span>
            </label>
            <input
              id="chef-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre en la cocina"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm text-stone-900 focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#a86224]" />
              <span>Correo electrónico</span>
            </label>
            <input
              type="email"
              value={initialProfile.email}
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-stone-100 border border-stone-200 text-sm text-stone-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* TARJETA 2: Estadísticas Reales de Chef */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[#a86224]" />
          <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
            Estadísticas de Chef
          </h3>
        </div>
        <p className="text-xs text-stone-500">
          Tu actividad culinaria registrada en tiempo real en Recetario
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Métrica 1: Recetas Guardadas */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalRecetas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                Recetas guardadas
              </span>
            </div>
          </div>

          {/* Métrica 2: Días / Comidas planificadas */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-emerald-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalPlanificadas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                Días planificados
              </span>
            </div>
          </div>

          {/* Métrica 3: Platos cocinados (diario) */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-amber-700">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalCocinados}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                Platos cocinados
              </span>
            </div>
          </div>

          {/* Métrica 4: Recetas Favoritas */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-rose-600">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalFavoritas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                Favoritas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 3: Nivel Culinario */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <ChefHat className="w-5 h-5 text-[#a86224]" />
          <div>
            <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
              Nivel Culinario
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Adapta las sugerencias de la IA y la dificultad recomendada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {NIVELES_CULINARIOS.map((nivel) => {
            const isSelected = nivelCulinario === nivel.id;
            return (
              <button
                key={nivel.id}
                type="button"
                onClick={() => setNivelCulinario(nivel.id)}
                className={`p-4 rounded-2xl text-left transition cursor-pointer border flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#f4efe6] border-[#a86224] ring-1 ring-[#a86224]/40 shadow-2xs'
                    : 'bg-[#faf7f2] border-[#e7dfd5] hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{nivel.badge}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif-recipe text-stone-900">
                    {nivel.label}
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                    {nivel.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TARJETA 4: Preferencias Alimentarias (Alergias e Intolerancias) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
              Preferencias Alimentarias
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Alergias, intolerancias y estilos de alimentación para adaptar tus recetas
            </p>
          </div>
          {preferencias.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] shrink-0">
              {preferencias.length} {preferencias.length === 1 ? 'activa' : 'activas'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          {PREFERENCIAS_OPCIONES.map((opcion) => {
            const isChecked = preferencias.includes(opcion.id);
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => togglePreferencia(opcion.id)}
                className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer border flex items-center gap-2 select-none ${
                  isChecked
                    ? 'bg-[#a86224] text-white border-[#a86224] shadow-2xs ring-2 ring-[#a86224]/20'
                    : 'bg-[#faf7f2] text-stone-700 border-[#e7dfd5] hover:bg-[#ebdcc9] hover:border-stone-400'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{opcion.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mensajes de feedback */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Botón de Guardado */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-semibold text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Guardando preferencias...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Preferencias Culinarias</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
