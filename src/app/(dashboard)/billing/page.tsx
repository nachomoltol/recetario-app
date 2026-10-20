import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { BillingPlanView, BillingHeaderTitle } from '@/components/subscription/BillingPlanView';

export const dynamic = 'force-dynamic';

interface BillingPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  const resolvedParams = await searchParams;
  const isLimitParam = resolvedParams?.limit === 'reached';
  const hasReachedLimit =
    profile?.plan_suscripcion !== 'pro' && (profile?.capturas_mes_actual ?? 0) >= 50;

  const isLimitReached = Boolean(isLimitParam || hasReachedLimit);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/recipes"
              className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-stone-200 transition"
              title="Volver al recetario"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <BillingHeaderTitle />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <UserDropdownMenu
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#a86224]" />
            </div>
          }
        >
          <BillingPlanView
            userEmail={user.email || ''}
            initialLimitReached={isLimitReached}
          />
        </Suspense>
      </main>
    </div>
  );
}
