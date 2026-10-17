import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  UserCheck,
  Cpu,
  HeartPulse,
  CreditCard,
  Trash2,
  Mail,
  Lock,
  Globe,
  Radio,
  FileText,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Miga',
  description:
    'Política de Privacidad y Protección de Datos de la aplicación Miga. Información detallada sobre el tratamiento de datos personales, servicios de terceros y derechos del usuario.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacidadPage() {
  const ultimaActualizacion = '17 de octubre de 2026';

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans">
      {/* Barra de cabecera */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-[#f4efe6] transition cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <img
                src="/miga-logo.svg"
                alt="Miga Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-500 hidden sm:inline-block">
                Legal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-stone-500 bg-[#faf7f2] border border-[#e7dfd5] px-3 py-1 rounded-full">
              Actualizado: {ultimaActualizacion}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 tracking-tight">
              Política de Privacidad
            </h1>
            <p className="text-sm sm:text-base text-stone-600 mt-2 font-light leading-relaxed">
              En <strong className="font-semibold text-stone-900">Miga</strong> (en adelante, &ldquo;la Aplicación&rdquo; o &ldquo;nosotros&rdquo;) nos comprometemos firmemente a proteger tu privacidad y tratar tus datos personales con absoluta transparencia, conforme al Reglamento General de Protección de Datos (RGPD UE 2016/679) y las directrices de Google Play Store.
            </p>
          </div>
        </div>

        {/* 1. Responsable del Tratamiento */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              1. Responsable del Tratamiento
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            El responsable del tratamiento de los datos recabados mediante la aplicación Miga es el equipo de desarrollo de Miga App. Para cualquier duda, ejercicio de derechos o aclaración sobre esta política, puedes contactar directamente a través del correo electrónico:{' '}
            <a
              href="mailto:info@migaapp.com"
              className="font-medium text-[#a86224] underline hover:text-[#8e511c]"
            >
              info@migaapp.com
            </a>.
          </p>
        </section>

        {/* 2. Datos que Recopilamos */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              2. Datos Personales que Recopilamos
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Recopilamos únicamente la información estrictamente necesaria para garantizar el funcionamiento, personalización y seguridad de tu recetario digital:
          </p>
          <ul className="space-y-2.5 text-sm text-stone-600 font-light list-disc pl-5">
            <li>
              <strong className="font-semibold text-stone-800">Identificadores de Cuenta:</strong> Correo electrónico y nombre de usuario o nombre de chef que proporcionas voluntariamente al registrarte para autenticar tu acceso y vincular tus recetas.
            </li>
            <li>
              <strong className="font-semibold text-stone-800">Contraseñas:</strong> Las contraseñas se almacenan mediante algoritmos de cifrado unidireccional (hash criptográfico seguro) a través de Supabase Auth; nunca tenemos acceso a tu contraseña en texto plano.
            </li>
            <li>
              <strong className="font-semibold text-stone-800">Contenido Culinario Aportado:</strong> Enlaces URL de publicaciones en redes sociales (TikTok, Instagram Reels, YouTube, blogs culinarios), imágenes y transcripciones que decides importar a tu recetario personal.
            </li>
            <li>
              <strong className="font-semibold text-stone-800">Datos Técnicos y de Registro:</strong> Dirección IP, versión del sistema operativo (Android/Web), tipo de navegador y registros de error básicos destinados al mantenimiento del servicio y prevención de abusos.
            </li>
          </ul>
        </section>

        {/* 3. Servicios de Terceros */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              3. Proveedores de Servicios y Terceros
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Para ofrecer una experiencia culinaria inteligente y segura, Miga se apoya en proveedores tecnológicos líderes que cumplen con estrictos estándares de privacidad y seguridad:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#a86224]" />
                <h3 className="text-sm font-bold text-stone-900">Supabase Inc.</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Infraestructura de base de datos en la nube (PostgreSQL), autenticación de cuentas y almacenamiento seguro de archivos con cifrado TLS y políticas de seguridad a nivel de fila (Row Level Security).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#a86224]" />
                <h3 className="text-sm font-bold text-stone-900">Stripe Inc.</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Pasarela de pagos certificada PCI-DSS Nivel 1 para la gestión de suscripciones PRO. Miga jamás almacena ni tiene acceso a números de tarjetas de crédito o datos bancarios del usuario.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#a86224]" />
                <h3 className="text-sm font-bold text-stone-900">Google AdMob</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Plataforma de publicidad móvil que permite visualizar anuncios (incluidos anuncios con recompensa para desbloquear créditos de recetas gratuitos). AdMob puede emplear identificadores publicitarios conforme a las políticas de privacidad de Google.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#a86224]" />
                <h3 className="text-sm font-bold text-stone-900">APIs de IA (Google Gemini)</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                Procesamiento y extracción de ingredientes, cantidades y pasos a partir de las fuentes que importas. Las llamadas a las APIs de IA no utilizan los datos personales del usuario para entrenar modelos públicos generales.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Perfilado Nutricional y Alergias (Motor Clínico) */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <HeartPulse className="w-4 h-4 text-amber-700" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              4. Preferencias Dietéticas, Alergias y Datos de Salud
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            En la sección de perfil de Miga puedes especificar voluntariamente tus preferencias alimentarias (ej. vegetariana, vegana, celiaquía) y alérgenos conocidos (como gluten, frutos secos, mariscos, etc.).
          </p>
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-stone-700 text-xs sm:text-sm leading-relaxed space-y-2">
            <p>
              <strong className="font-semibold text-amber-900">Garantía de Uso Exclusivo:</strong> Estos datos se tratan única y exclusivamente dentro de la aplicación mediante nuestro motor de análisis culinario para adaptar los ingredientes de las recetas a tus necesidades y advertirte de posibles alérgenos.
            </p>
            <p>
              <strong className="font-semibold text-amber-900">No Venta a Terceros:</strong> Bajo ninguna circunstancia vendemos, cedemos, alquilamos ni compartimos tus datos de preferencias dietéticas, intolerancias o salud con anunciantes, terceros o brokers de datos.
            </p>
          </div>
        </section>

        {/* 5. Eliminación de Datos y Derechos del Usuario */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              5. Tus Derechos y Eliminación Total de Cuenta
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Conforme a la legislación vigente (RGPD y estándares de Google Play), dispones de pleno control sobre tu información y gozas de los siguientes derechos:
          </p>
          <ul className="space-y-2 text-sm text-stone-600 font-light list-disc pl-5">
            <li><strong>Derecho de Acceso y Rectificación:</strong> Puedes consultar y modificar tus datos personales o recetas en cualquier momento desde tu perfil.</li>
            <li><strong>Derecho de Supresión (Derecho al Olvido):</strong> Tienes derecho a solicitar el borrado completo de todos tus datos.</li>
            <li><strong>Derecho de Oposición y Limitación del Tratamiento:</strong> Puedes solicitar que no tratemos tus datos para determinadas finalidades accesorias.</li>
          </ul>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              ¿Cómo eliminar tu cuenta y tus datos?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Puedes ejecutar el borrado instantáneo e irreversible de tu cuenta directamente dentro de la aplicación móvil o web:
            </p>
            <ol className="text-xs text-stone-600 font-light list-decimal pl-5 space-y-1">
              <li>Inicia sesión y abre el menú de usuario (icono de chef en la esquina superior).</li>
              <li>Selecciona la opción <strong className="font-semibold text-rose-700">Eliminar Cuenta</strong>.</li>
              <li>Confirma en el cuadro de diálogo. Tu cuenta, recetas, planificaciones, fotos y registros serán eliminados de inmediato y de forma permanente de nuestras bases de datos de Supabase.</li>
            </ol>
            <p className="text-xs text-stone-500 pt-1">
              Alternativamente, puedes solicitar la eliminación manual de tus datos enviando un correo a{' '}
              <a href="mailto:info@migaapp.com" className="underline font-medium text-stone-700">
                info@migaapp.com
              </a>.
            </p>
          </div>
        </section>

        {/* 6. Seguridad de la Información */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              6. Seguridad y Retención
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Implementamos medidas técnicas y organizativas rigurosas para proteger tus datos personales, incluyendo cifrado en tránsito mediante HTTPS/TLS, autenticación segura basada en tokens JWT y aislamiento de datos de cada usuario mediante políticas de seguridad por fila (RLS) en la base de datos.
          </p>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Conservamos tus datos mientras mantengas tu cuenta activa. Si decides cerrarla o solicitar su eliminación, la información se suprime de manera definitiva.
          </p>
        </section>

        {/* 7. Contacto */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              7. Contacto y Consultas
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed font-light">
            Si tienes dudas, comentarios o requerimientos sobre nuestra Política de Privacidad o el tratamiento de tus datos, puedes escribirnos en cualquier momento a:
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-xs sm:text-sm font-semibold text-[#a86224]">
            <Mail className="w-4 h-4" />
            <a href="mailto:info@migaapp.com" className="hover:underline">
              info@migaapp.com
            </a>
          </div>
        </section>

        {/* Botón de Retorno */}
        <div className="pt-4 pb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-sm transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Miga</span>
          </Link>
        </div>
      </main>

      {/* Footer Legal */}
      <footer className="border-t border-[#e7dfd5] bg-white py-6 text-center text-xs text-stone-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Miga &copy; 2026 · Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-stone-700 transition">
              Inicio
            </Link>
            <span className="text-stone-300">·</span>
            <Link href="/privacidad" className="font-semibold text-stone-700">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
