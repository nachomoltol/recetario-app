'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Calendar } from 'lucide-react';

export function BottomNavigation() {
  const pathname = usePathname();

  // No mostrar en pantallas de autenticación o callbacks
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth')
  ) {
    return null;
  }

  const navItems = [
    {
      label: 'Inicio',
      href: '/',
      icon: Home,
      isActive: pathname === '/' || pathname === '/recipes',
    },
    {
      label: 'Recetario',
      href: '/recipes/collection',
      icon: BookOpen,
      isActive: pathname.startsWith('/recipes/collection') || pathname.startsWith('/collection'),
    },
    {
      label: 'Plan semanal',
      href: '/meal-planner',
      icon: Calendar,
      isActive: pathname.startsWith('/meal-planner'),
    },
  ];

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#e7dfd5] shadow-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer min-w-[72px] min-h-[48px] ${
                item.isActive
                  ? 'text-[#a86224] font-bold bg-[#f4efe6]/80'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.isActive ? 'text-[#a86224]' : 'text-stone-400'}`} />
              <span className="text-[11px] leading-tight tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
