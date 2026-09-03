// ─── tables/index.tsx — Marketplace de tablas nutricionales ───────────────────
export const tablesIndexEs = {
  title: 'Tablas Nutricionales',
  compare: 'Comparar',

  free_count_one: '{{count}} gratuita',
  free_count_other: '{{count}} gratuitas',
  pro_count: '{{count}} Pro',

  pro_banner_title: 'Accede a todas las tablas con Pro',
  pro_banner_subtitle_one: '{{count}} tabla adicional · USD 5/mes',
  pro_banner_subtitle_other: '{{count}} tablas adicionales · USD 5/mes',
  view_arrow: 'Ver →',

  loading: 'Cargando tablas...',

  footer_note: 'Cada tabla fue adaptada al modelo Cultitrack (vege variable + flora 8 semanas).\nLas marcas certificadas muestran su logo y enlace oficial.',

  official_suffix: '· Oficial',
  custom_suffix: '· Personalizada',
  lines_count: '{{count}} lineas',
  vege_weeks_count: '{{count}} sem. vege',
  flora_weeks_count: '{{count}} sem. flora',
  official_site: 'Sitio oficial',
  activate_pro: 'Activar Pro →',
  view_table: 'Ver tabla →',

  revegetar_origin: 'Argentina',
  revegetar_description: 'Linea organica-mineral con 4 gammas (BIO, ECO, LIFE, FUEL). Tabla oficial incluida en el plan Free.',
  topcrop_origin: 'Espana',
  topcrop_description: 'Linea profesional europea con gamas Pro, Medio y Basica. Productos premium de alta concentracion.',
}

export const tablesIndexEn = {
  title: 'Nutrition Tables',
  compare: 'Compare',

  free_count_one: '{{count}} free',
  free_count_other: '{{count}} free',
  pro_count: '{{count}} Pro',

  pro_banner_title: 'Get all tables with Pro',
  pro_banner_subtitle_one: '{{count}} additional table · USD 5/mo',
  pro_banner_subtitle_other: '{{count}} additional tables · USD 5/mo',
  view_arrow: 'View →',

  loading: 'Loading tables...',

  footer_note: 'Each table was adapted to the Cultitrack model (variable veg + 8-week flower).\nCertified brands show their logo and official link.',

  official_suffix: '· Official',
  custom_suffix: '· Custom',
  lines_count: '{{count}} lines',
  vege_weeks_count: '{{count}} wks veg',
  flora_weeks_count: '{{count}} wks flower',
  official_site: 'Official site',
  activate_pro: 'Activate Pro →',
  view_table: 'View table →',

  revegetar_origin: 'Argentina',
  revegetar_description: 'Organic-mineral line with 4 ranges (BIO, ECO, LIFE, FUEL). Official table included in the Free plan.',
  topcrop_origin: 'Spain',
  topcrop_description: 'Professional European line with Pro, Medium and Basic ranges. Premium, high-concentration products.',
}

// ─── tables/new.tsx — Crear tabla nutricional personalizada ───────────────────
export const tablesNewEs = {
  header_title: 'Nueva tabla',
  header_subtitle: 'Carga los productos semana a semana',

  table_name_label: 'Nombre de la tabla',
  table_name_placeholder: 'Ej: Mi mezcla casera',

  title_vege: 'VEGETACION',
  title_flora: 'FLORACION',

  week_label: 'Semana {{week}} — {{stage}}',
  flora_week_label: 'F{{week}} — {{stage}}',
  stage_rooting: 'Enraizado',
  stage_growth: 'Crecimiento',
  stage_preflower: 'Prefloracion',
  stage_stretch: 'Estiramiento',
  stage_bulking: 'Engorde',
  stage_ripening: 'Maduracion',
  stage_flushing: 'Limpieza',

  product_name_placeholder: 'Nombre del producto',
  min_dose_placeholder: 'Dosis min',
  max_dose_placeholder: 'Dosis max',
  add_product: 'Agregar producto',

  products_loaded_one: '{{count}} producto cargado',
  products_loaded_other: '{{count}} productos cargados',

  save_button: 'Guardar tabla →',

  error_title: 'Error',
  error_name_required: 'Ingresa un nombre para la tabla',
  error_no_user: 'No hay usuario autenticado',
  error_no_products: 'Agrega al menos un producto en alguna semana',
  error_save_failed: 'No se pudo guardar',
  success_title: 'Listo',
  success_message: 'Tabla guardada correctamente',
  ok: 'OK',
}

export const tablesNewEn = {
  header_title: 'New table',
  header_subtitle: 'Load the products week by week',

  table_name_label: 'Table name',
  table_name_placeholder: 'E.g.: My custom mix',

  title_vege: 'VEGETATIVE',
  title_flora: 'FLOWERING',

  week_label: 'Week {{week}} — {{stage}}',
  flora_week_label: 'F{{week}} — {{stage}}',
  stage_rooting: 'Rooting',
  stage_growth: 'Growth',
  stage_preflower: 'Preflower',
  stage_stretch: 'Stretch',
  stage_bulking: 'Bulking',
  stage_ripening: 'Ripening',
  stage_flushing: 'Flush',

  product_name_placeholder: 'Product name',
  min_dose_placeholder: 'Min dose',
  max_dose_placeholder: 'Max dose',
  add_product: 'Add product',

  products_loaded_one: '{{count}} product loaded',
  products_loaded_other: '{{count}} products loaded',

  save_button: 'Save table →',

  error_title: 'Error',
  error_name_required: 'Enter a name for the table',
  error_no_user: 'No authenticated user',
  error_no_products: 'Add at least one product to some week',
  error_save_failed: 'Could not save',
  success_title: 'Done',
  success_message: 'Table saved successfully',
  ok: 'OK',
}

// ─── tables/[id].tsx — Detalle de tabla nutricional ────────────────────────────
export const tablesDetailEs = {
  not_found: 'Tabla no encontrada',

  stage_rooting: 'Enraizamiento',
  stage_growth: 'Crecimiento',
  stage_preflower: 'Pre-floracion',
  stage_stretch: 'Estiramiento',
  stage_bulking: 'Engorde',
  stage_ripening: 'Maduracion',
  stage_flushing: 'Limpieza',
  stage_harvested: 'Cosecha',

  week_row_label: 'Semana {{week}} — {{stage}}',
  day_range: 'Dia {{start}}–{{end}}',
  ec_range: 'EC {{min}}–{{max}}',
  ph_range: 'pH {{min}}–{{max}}',
  water_only: 'Solo agua — limpieza de sales',

  vege_cycle_title: 'Ciclo Vegetativo',
  flora_cycle_title: 'Ciclo de Floracion',
  weeks_count: '— {{count}} semanas',

  note_label: 'NOTA',
}

export const tablesDetailEn = {
  not_found: 'Table not found',

  stage_rooting: 'Rooting',
  stage_growth: 'Growth',
  stage_preflower: 'Preflower',
  stage_stretch: 'Stretch',
  stage_bulking: 'Bulking',
  stage_ripening: 'Ripening',
  stage_flushing: 'Flush',
  stage_harvested: 'Harvest',

  week_row_label: 'Week {{week}} — {{stage}}',
  day_range: 'Day {{start}}–{{end}}',
  ec_range: 'EC {{min}}–{{max}}',
  ph_range: 'pH {{min}}–{{max}}',
  water_only: 'Water only — salt flush',

  vege_cycle_title: 'Vegetative Cycle',
  flora_cycle_title: 'Flowering Cycle',
  weeks_count: '— {{count}} weeks',

  note_label: 'NOTE',
}

// ─── tables/compare.tsx — Comparativa de tablas nutricionales ─────────────────
export const tablesCompareEs = {
  title: 'Comparativa',
  subtitle: 'EC · pH por etapa',

  filter_all: 'Ciclo completo',
  filter_vege: 'Vegetativo',
  filter_flora: 'Floracion',

  stage_rooting: 'Enraizamiento',
  stage_growth: 'Crecimiento',
  stage_preflower: 'Pre-floracion',
  stage_stretch: 'Estiramiento',
  stage_bulking: 'Engorde',
  stage_ripening: 'Maduracion',
  stage_flushing: 'Limpieza',

  cycle_badge_vege: 'VEGE',
  cycle_badge_flora: 'FLORA',

  column_stage: 'Etapa',
  legend_ec: 'EC (mS/cm)',
  legend_ph: 'pH',

  pro_cta: 'Activa Pro para ver las tablas de todas las marcas',
}

export const tablesCompareEn = {
  title: 'Comparison',
  subtitle: 'EC · pH by stage',

  filter_all: 'Full cycle',
  filter_vege: 'Vegetative',
  filter_flora: 'Flowering',

  stage_rooting: 'Rooting',
  stage_growth: 'Growth',
  stage_preflower: 'Preflower',
  stage_stretch: 'Stretch',
  stage_bulking: 'Bulking',
  stage_ripening: 'Ripening',
  stage_flushing: 'Flush',

  cycle_badge_vege: 'VEG',
  cycle_badge_flora: 'FLOWER',

  column_stage: 'Stage',
  legend_ec: 'EC (mS/cm)',
  legend_ph: 'pH',

  pro_cta: "Activate Pro to see every brand's tables",
}
