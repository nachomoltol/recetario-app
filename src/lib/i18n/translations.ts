export type Language = 'es' | 'en';

export const TRANSLATIONS = {
  es: {
    // Header & Global Nav
    header_title: 'Recetario Inteligente',
    header_subtitle: 'Modo Cocina Mobile-First',
    header_meal_plan: 'Plan Semanal',
    header_my_account: 'Mi Cuenta',
    header_active_plan: 'Plan Chef Activo',
    nav_home: 'Inicio',
    nav_recipes: 'Recetario',
    nav_collection: 'Colección',
    nav_plan: 'Plan Semanal',
    nav_settings: 'Configuración',
    nav_logout: 'Cerrar sesión',

    // Home & Capture Card
    home_tag: 'Cuaderno Gastronómico Personal',
    home_greeting: 'Hola',
    home_subtitle: 'Pega cualquier vídeo de cocina para extraer sus pasos y calcular sus ingredientes al instante.',
    capture_tab_url: 'Enlace de Vídeo',
    capture_tab_text: 'Texto o Pasos',
    capture_tab_file: 'Subir Foto o PDF',
    capture_placeholder_url: 'Pega enlace de TikTok, Reels o Facebook...',
    capture_placeholder_text: 'Pega los ingredientes y pasos de la receta...',
    capture_btn_process: 'Estandarizar Receta con IA',
    capture_btn_processing: 'Analizando con IA...',
    capture_loading_long_video:
      'Los vídeos largos requieren tiempo de generación mientras la IA visualiza el metraje y estructura los pasos. Por favor, mantén la app encendida',
    capture_empty_title: 'Tu recetario aún está vacío',
    capture_empty_desc:
      'Pega un enlace de vídeo en el cuadro de captura superior o compártelo directamente desde tu móvil para estandarizar tu primer plato.',
    capture_tab_latest: 'Última receta capturada',
    capture_tab_viewed: 'Última receta vista',
    capture_success: '¡Receta extraída, estandarizada y guardada en tu recetario!',

    // Profile & Showcase PRO
    profile_title: 'Datos Personales',
    profile_subtitle: 'Perfil Culinario y Modelo Clínico',
    profile_chef_name: 'Nombre de Chef o Apodo',
    profile_email: 'Correo electrónico',
    profile_member_since: 'Miembro de la cocina desde',
    profile_stats_title: 'Estadísticas de Chef',
    profile_stats_desc: 'Tu actividad culinaria registrada en tiempo real en Recetario',
    profile_stat_recipes: 'Recetas guardadas',
    profile_stat_planned: 'Días planificados',
    profile_stat_cooked: 'Platos cocinados',
    profile_stat_favorites: 'Favoritas',

    // Escaparate PRO (Dropdowns clínicos)
    clinical_showcase_title: 'Modelo Clínico & Patrón Alimentario',
    clinical_showcase_desc:
      'Personaliza el cortafuegos médico de la IA para adaptar automáticamente cada receta a tu salud.',
    clinical_objective_label: 'Objetivo Clínico',
    clinical_pattern_label: 'Patrón Alimentario',
    clinical_pro_badge: 'Exclusivo PRO',
    clinical_locked_title: 'Cortafuegos y Adaptación Médica con Rigor Clínico',
    clinical_locked_desc:
      'Personaliza el motor de IA con tu objetivo médico y patrón alimentario. Al activar PRO, nuestro algoritmo excluye de forma estricta los ingredientes proinflamatorios, recalcula alérgenos y sustituye equivalencias respetando tu salud digestiva, hormonal y metabólica.',
    clinical_upgrade_btn: 'Mejorar a PRO',
    clinical_save_btn: 'Guardar Preferencias Culinarias',
    clinical_saving_btn: 'Guardando preferencias...',
    clinical_success_msg: '¡Perfil y preferencias culinarias actualizados con éxito!',

    // Nivel Culinario
    level_title: 'Nivel Culinario',
    level_desc: 'Adapta las sugerencias de la IA y la dificultad recomendada',

    // Modal PRO
    pro_modal_title: 'Desbloquea el Rigor Clínico con Recetario PRO',
    pro_modal_subtitle: 'Adaptación médica en tiempo real, capturas ilimitadas y rigor nutricional.',
  },
  en: {
    // Header & Global Nav
    header_title: 'Smart Cookbook',
    header_subtitle: 'Mobile-First Cooking Mode',
    header_meal_plan: 'Meal Plan',
    header_my_account: 'My Account',
    header_active_plan: 'Chef Plan Active',
    nav_home: 'Home',
    nav_recipes: 'Cookbook',
    nav_collection: 'Collection',
    nav_plan: 'Meal Plan',
    nav_settings: 'Settings',
    nav_logout: 'Sign Out',

    // Home & Capture Card
    home_tag: 'Personal Culinary Journal',
    home_greeting: 'Hello',
    home_subtitle: 'Paste any cooking video to extract its steps and compute ingredients instantly.',
    capture_tab_url: 'Video Link',
    capture_tab_text: 'Recipe Text',
    capture_tab_file: 'Upload Photo or PDF',
    capture_placeholder_url: 'Paste TikTok, Reels, or Facebook link...',
    capture_placeholder_text: 'Paste ingredients and preparation steps...',
    capture_btn_process: 'Standardize Recipe with AI',
    capture_btn_processing: 'Analyzing with AI...',
    capture_loading_long_video:
      'Long videos take time to generate while the AI watches the footage and structures the steps. Please keep the app open',
    capture_empty_title: 'Your cookbook is still empty',
    capture_empty_desc:
      'Paste a video link in the box above or share directly from your phone to standardize your first dish.',
    capture_tab_latest: 'Latest captured recipe',
    capture_tab_viewed: 'Latest viewed recipe',
    capture_success: 'Recipe extracted, standardized, and saved to your cookbook!',

    // Profile & Showcase PRO
    profile_title: 'Personal Info',
    profile_subtitle: 'Culinary Profile & Clinical Model',
    profile_chef_name: 'Chef Name or Nickname',
    profile_email: 'Email address',
    profile_member_since: 'Kitchen member since',
    profile_stats_title: 'Chef Stats',
    profile_stats_desc: 'Your cooking activity tracked in real-time in Smart Cookbook',
    profile_stat_recipes: 'Saved recipes',
    profile_stat_planned: 'Planned days',
    profile_stat_cooked: 'Cooked meals',
    profile_stat_favorites: 'Favorites',

    // Escaparate PRO (Dropdowns clínicos)
    clinical_showcase_title: 'Clinical Model & Dietary Pattern',
    clinical_showcase_desc:
      'Configure the medical AI firewall to automatically tailor every recipe to your health needs.',
    clinical_objective_label: 'Clinical Objective',
    clinical_pattern_label: 'Dietary Pattern',
    clinical_pro_badge: 'PRO Exclusive',
    clinical_locked_title: 'Medical Firewall & Clinical Adaptation',
    clinical_locked_desc:
      'Customize the AI engine with your medical goal and eating pattern. With PRO, our algorithm strictly excludes pro-inflammatory ingredients, recalculates allergens, and adapts cooking steps to protect your digestive, metabolic, and hormonal health.',
    clinical_upgrade_btn: 'Upgrade to PRO',
    clinical_save_btn: 'Save Culinary Preferences',
    clinical_saving_btn: 'Saving preferences...',
    clinical_success_msg: 'Profile and culinary preferences updated successfully!',

    // Nivel Culinario
    level_title: 'Culinary Level',
    level_desc: 'Adapts AI suggestions and recommended difficulty',

    // Modal PRO
    pro_modal_title: 'Unlock Clinical Rigor with Smart Cookbook PRO',
    pro_modal_subtitle: 'Real-time medical adaptation, unlimited captures, and clinical nutrition.',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.es;

export function getTranslation(lang: Language, key: TranslationKey): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.es;
  return dict[key] || TRANSLATIONS.es[key] || key;
}
