'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  BookOpen,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Sparkles,
  ChefHat,
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { signOutAction } from '@/app/actions/auth';

interface UserDropdownMenuProps {
  fallbackName: string;
  email: string;
}

export function UserDropdownMenu({ fallbackName, email }: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = useProfileStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const displayName = profile?.nombre || user?.user_metadata?.nombre || fallbackName;
  const displayEmail = user?.email || email;
  const initials = displayName.slice(0, 2).toUpperCase();

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón trigger del Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 sm:gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl bg-white hover:bg-[#f4efe6] border border-[#e7dfd5] transition-all cursor-pointer shadow-2xs group"
      >
        <div className="w-8 h-8 rounded-xl bg-[#f4efe6] group-hover:bg-white border border-[#e7dfd5] text-[#a86224] font-bold text-xs flex items-center justify-center transition-colors">
          {initials}
        </div>

        <div className="hidden sm:block text-left pr-1">
          <p className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[120px]">
            {displayName}
          </p>
          <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
            Mi Cuenta
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#a86224]' : ''
          }`}
        />
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-3xl bg-white border border-[#e7dfd5] shadow-xl p-3 z-50 animate-fade-in space-y-2">
          {/* Cabecera con datos del usuario */}
          <div className="p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5]/70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#e7dfd5] text-[#a86224] flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-stone-500 truncate" title={displayEmail}>
                {displayEmail}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                  <ChefHat className="w-3 h-3" /> Plan Chef Activo
                </span>
              </div>
            </div>
          </div>

          {/* Opciones del Menú */}
          <div className="space-y-1">
            <Link
              href="/recipes"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <BookOpen className="w-4 h-4 text-[#a86224]" />
              <div className="flex-1">
                <span>Mi Recetario</span>
              </div>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <User className="w-4 h-4 text-stone-500" />
              <div className="flex-1">
                <span>Datos Personales</span>
              </div>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <Settings className="w-4 h-4 text-stone-500" />
              <div className="flex-1">
                <span>Configuración</span>
              </div>
            </Link>

            <Link
              href="/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-[#a86224]" />
                <span>Pasarela de Pago</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Suscripción
              </span>
            </Link>
          </div>

          {/* Separador */}
          <div className="border-t border-[#e7dfd5] pt-1">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition cursor-pointer font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
