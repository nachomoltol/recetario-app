'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  BookOpen,
  Calendar,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Sparkles,
  ChefHat,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Shield,
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { signOutAction, deleteAccountAction } from '@/app/actions/auth';

interface UserDropdownMenuProps {
  fallbackName: string;
  email: string;
}

export function UserDropdownMenu({ fallbackName, email }: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = useProfileStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await deleteAccountAction();
      if (res?.error) {
        setDeleteError(res.error);
        setIsDeleting(false);
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error al eliminar la cuenta');
      setIsDeleting(false);
    }
  };

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
        className="flex items-center gap-2.5 sm:gap-3 px-4 py-2 sm:px-3 sm:py-2 rounded-2xl bg-white hover:bg-[#f4efe6] border border-[#e7dfd5] transition-all cursor-pointer shadow-2xs group shrink-0"
      >
        <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-[#f4efe6] group-hover:bg-white border border-[#e7dfd5] text-[#a86224] font-bold text-sm sm:text-xs flex items-center justify-center transition-colors shrink-0">
          {initials}
        </div>

        <div className="text-left pr-1 min-w-0">
          <p className="text-sm xs:text-base sm:text-xs font-semibold text-stone-900 leading-tight truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[120px]">
            {displayName}
          </p>
          <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
            {t('header_my_account')}
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-transform duration-200 shrink-0 ${
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
                  <ChefHat className="w-3 h-3" /> {t('header_active_plan')}
                </span>
              </div>
            </div>
          </div>

          {/* Opciones del Menú */}
          <div className="space-y-1">
            <Link
              href="/recipes/collection"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <BookOpen className="w-4 h-4 text-[#a86224]" />
              <div className="flex-1">
                <span>{t('nav_collection_full')}</span>
              </div>
            </Link>

            <Link
              href="/meal-planner"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <Calendar className="w-4 h-4 text-[#a86224]" />
              <div className="flex-1">
                <span>{t('nav_meal_planner_full')}</span>
              </div>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <User className="w-4 h-4 text-stone-500" />
              <div className="flex-1">
                <span>{t('nav_personal_data')}</span>
              </div>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <Settings className="w-4 h-4 text-stone-500" />
              <div className="flex-1">
                <span>{t('nav_settings_full')}</span>
              </div>
            </Link>

            <Link
              href="/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-[#a86224]" />
                <span>{t('nav_payment_gateway')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> {t('nav_subscription')}
              </span>
            </Link>

            <Link
              href="/privacidad"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer font-medium"
            >
              <Shield className="w-4 h-4 text-stone-500" />
              <div className="flex-1">
                <span>Política de Privacidad</span>
              </div>
            </Link>
          </div>

          {/* Separador */}
          <div className="border-t border-[#e7dfd5] pt-1 space-y-0.5">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition cursor-pointer font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav_logout')}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowDeleteModal(true);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium"
            >
              <Trash2 className="w-4 h-4 text-stone-400" />
              <span>{t('user_delete_account')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Cuenta */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7dfd5] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-900 font-serif-recipe leading-tight">
                  {t('user_delete_confirm_title')}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed font-light">
                  {t('user_delete_confirm_desc')}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition cursor-pointer disabled:opacity-50"
              >
                {t('user_delete_cancel_btn')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('user_deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('user_delete_confirm_btn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
