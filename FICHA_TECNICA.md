# Ficha Técnica — Recetario App

Documento de memoria técnica y volcado del estado actual del proyecto antes de la migración de entorno.

---

## 1. Arquitectura y Stack Tecnológico

El proyecto está concebido como una Progressive Web App / Web App de alto rendimiento, orientada a la extracción, estandarización y gestión inteligente de recetas culinarias personales.

- **Frontend & Framework:**
  - **Next.js 16.4.0 (App Router):** Enrutamiento dinámico, Server Components, Server Actions y soporte Turbopack.
  - **React 19.3.0:** Concurrencia nativa, transiciones y manejo de estado optimista.
  - **Tailwind CSS v4:** Motor de estilos con paleta cromática editorial y gastronómica (*Lino / Terracotta / Stone*).
  - **Iconografía & UI:** `lucide-react`, microanimaciones y diseño adaptado a dispositivos móviles.

- **Backend & Base de Datos:**
  - **Supabase (PostgreSQL 17):** Base de datos relacional con Row Level Security (RLS) en todas las tablas sensibles.
  - **Supabase SSR (`@supabase/ssr` 0.12.7):** Manejo estricto de sesiones basadas en cookies seguras en middleware, client y server actions.
  - **Supabase Admin (`@supabase/supabase-js` 2.117.3):** Uso de `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en contextos de servidor seguros (webhooks de Stripe, canje VIP).

- **Motor de Inteligencia Artificial (IA Multimodal):**
  - **Google Gemini Flash Lite 3.1 (`@google/genai` 2.28.0):** Modelo multimodal de baja latencia utilizado para procesar recetas desde enlaces sociales, transcripciones de vídeo, documentos y notas manuscritas, extrayendo ingredientes estandarizados, instrucciones paso a paso e información nutricional calculada.

- **Pasarela de Pagos & Suscripciones:**
  - **Stripe (`stripe` 23.0.0):** Checkout Sessions en modo suscripción recurrente mensual/anual y procesamiento de eventos mediante Webhooks autenticados.

- **Procesamiento y Extracción Multimedia:**
  - `yt-dlp-exec`, `btch-downloader`, `rahad-all-downloader-v2`, `cheerio`.

---

## 2. Hitos Completados

1. **Autenticación y Sesión de Usuario:**
   - Flujos completos de inicio de sesión (`/login`), registro (`/register`) y confirmación de sesión mediante intercambio de código en `/auth/callback`.
   - Control de acceso por sesión vía `middleware.ts`.
   - Perfil de usuario con raciones por defecto, nivel culinario, objetivos calóricos y preferencias dietéticas/alérgenos.

2. **Generador y Extractor de Recetas con IA:**
   - Captura y análisis de recetas desde URLs de **TikTok, Instagram, Facebook, YouTube y páginas web**, así como subida de archivos (imágenes/documentos).
   - Inyección de perfil clínico y restricciones alimentarias en el motor de adaptación culinaria.
   - Normalización de ingredientes frente a catálogo maestro (`ingredientes_maestro`) y cálculo aproximado de macronutrientes.

3. **Corrección del Comportamiento de Scroll (Scroll Fix):**
   - Resolución del rebote de scroll hacia el input principal tras la generación de recetas, garantizando un desplazamiento suave y natural directo al contenido de la ficha culinaria creada.

4. **Integración Completa de Pagos con Stripe:**
   - **Ruta de Checkout (`/api/stripe/checkout`):** Genera la sesión en Stripe asociando el `client_reference_id` con el `user.id` de Supabase.
   - **Ruta de Webhook (`/api/stripe/webhook`):** Verificación de firma criptográfica con `STRIPE_WEBHOOK_SECRET` y exclusión de redirección de sesión en `middleware.ts`. Al recibirse `checkout.session.completed`, se asciende el usuario a `plan_suscripcion = 'pro'` en la base de datos de manera atómica.
   - **Página de Facturación (`/billing`) y Modal Pro (`ProSubscriptionModal`):** Interfaz completa con beneficios claros (capturas ilimitadas, motor clínico, cero anuncios) y textos dinámicos según el contexto (`limit_reached` vs `feature_locked`).

5. **Modo VIP Automático:**
   - Server Action `redeemVipCodeAction` con validación segura mediante cliente de administración para el código `NACHOVIP`, permitiendo habilitar el plan PRO para usuarios de prueba y revisión interna.

---

## 3. Estado Actual y Pendiente Inmediato

### Próxima Tarea Prioritaria
1. **Automatización y Consolidación de Storage y Edición de Recetas:**
   - **Script SQL (`setup_storage.sql`):** Automatización definitiva en el entorno de migración para la creación del bucket público `recetas_fotos`, la columna `foto_url TEXT` en la tabla `recetas`, y sus políticas RLS de lectura pública y escritura autenticada.
   - **Captura directa desde cámara:** Asegurar el uso de `<input type="file" accept="image/*" capture="environment">` para forzar la apertura directa de la cámara trasera en dispositivos móviles, acompañado de la compresión y redimensionado de imágenes en cliente antes de la subida.
   - **Modo de Edición de Receta:** Permitir al usuario corregir el título y las cantidades/nombres de ingredientes en la ficha generada antes de dar por buena la extracción multimodal.

### Pendiente en Segunda Fase
2. **Monetización con Google AdMob:**
   - Integración de bloques de anuncios y recompensas publicitarias en entorno móvil/PWA para usuarios en plan gratuito (`gratis`), pausada temporalmente a favor del perfeccionamiento de la experiencia de usuario y el core de edición.
