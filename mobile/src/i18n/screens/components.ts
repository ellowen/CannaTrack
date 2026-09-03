// Traducciones para componentes compartidos: CompleteTaskSheet, HarvestSheet, PaywallModal.
// NOTA: no mergear directamente en es.ts/en.ts (otros agentes tocan esos archivos en paralelo).

export const completeTaskSheetEs = {
  type_nutrition: 'Nutricion',
  type_irrigation: 'Riego',
  type_foliar: 'Foliar',
  type_observation: 'Observacion',
  type_harvest: 'Cosecha',

  status_ok: 'Ideal',
  status_warn: 'Cerca',
  status_bad: 'Fuera',

  task_completed_label: '{{label}} completada ✓',
  target_label: 'Objetivo: EC {{ecMin}}–{{ecMax}} · pH {{phMin}}–{{phMax}}',

  recipe_title_one: '🧪 Receta · {{count}} producto',
  recipe_title_other: '🧪 Receta · {{count}} productos',

  recipe_for_volume_one: 'Para {{liters}}L ({{count}} maceta × {{potVolume}}L)',
  recipe_for_volume_other: 'Para {{liters}}L ({{count}} macetas × {{potVolume}}L)',

  measurement_label: '💧 Medicion (opcional)',

  notes_placeholder_with_measure: 'Observaciones adicionales... (opcional)',
  notes_placeholder_default: 'Observaciones, estado de la planta... (opcional)',

  skip_button: 'Saltar',
  confirm_save_measure: 'Guardar EC/pH ✓',
  confirm_save_note: 'Guardar nota ✓',
  confirm_confirm: 'Confirmar ✓',

  task_completed_overlay: 'Tarea completada',

  discard_changes_title: 'Descartar cambios',
  discard_changes_message: 'Tienes datos sin guardar. ¿Estás seguro?',
  discard_button: 'Descartar',
}

export const completeTaskSheetEn = {
  type_nutrition: 'Nutrition',
  type_irrigation: 'Watering',
  type_foliar: 'Foliar',
  type_observation: 'Observation',
  type_harvest: 'Harvest',

  status_ok: 'Ideal',
  status_warn: 'Close',
  status_bad: 'Off',

  task_completed_label: '{{label}} completed ✓',
  target_label: 'Target: EC {{ecMin}}–{{ecMax}} · pH {{phMin}}–{{phMax}}',

  recipe_title_one: '🧪 Recipe · {{count}} product',
  recipe_title_other: '🧪 Recipe · {{count}} products',

  recipe_for_volume_one: 'For {{liters}}L ({{count}} pot × {{potVolume}}L)',
  recipe_for_volume_other: 'For {{liters}}L ({{count}} pots × {{potVolume}}L)',

  measurement_label: '💧 Measurement (optional)',

  notes_placeholder_with_measure: 'Additional notes... (optional)',
  notes_placeholder_default: 'Notes, plant condition... (optional)',

  skip_button: 'Skip',
  confirm_save_measure: 'Save EC/pH ✓',
  confirm_save_note: 'Save note ✓',
  confirm_confirm: 'Confirm ✓',

  task_completed_overlay: 'Task completed',

  discard_changes_title: 'Discard changes',
  discard_changes_message: 'You have unsaved data. Are you sure?',
  discard_button: 'Discard',
}

export const harvestSheetEs = {
  discard_changes_title: 'Descartar cambios',
  discard_changes_message: 'Tienes datos sin guardar. ¿Estás seguro?',
  discard_button: 'Descartar',

  stat_grow_total: 'Grow total',
  stat_tasks_done: 'Tareas ✓',
  stat_avg_ec: 'EC media',
  stat_avg_ph: 'pH medio',

  tab_harvest: '✂️ Cosechar',
  tab_discard: '🗑️ Descartar',

  grams_label: 'Gramos cosechados (opcional)',
  grams_placeholder: 'ej: 45.5',

  desc_harvest: '🎉 Excelente trabajo! La planta pasara al historial de cosechas.',
  desc_discard: '⚠️ La planta se marcara como descartada. No se puede deshacer.',

  confirm_harvest: '✂️ Confirmar cosecha  +100 XP',
  confirm_discard: '🗑️ Confirmar descarte',
}

export const harvestSheetEn = {
  discard_changes_title: 'Discard changes',
  discard_changes_message: 'You have unsaved data. Are you sure?',
  discard_button: 'Discard',

  stat_grow_total: 'Total grow',
  stat_tasks_done: 'Tasks ✓',
  stat_avg_ec: 'Avg EC',
  stat_avg_ph: 'Avg pH',

  tab_harvest: '✂️ Harvest',
  tab_discard: '🗑️ Discard',

  grams_label: 'Grams harvested (optional)',
  grams_placeholder: 'e.g. 45.5',

  desc_harvest: '🎉 Great job! The plant will move to your harvest history.',
  desc_discard: '⚠️ The plant will be marked as discarded. This cannot be undone.',

  confirm_harvest: '✂️ Confirm harvest  +100 XP',
  confirm_discard: '🗑️ Confirm discard',
}

export const paywallModalEs = {
  feature_unlimited_plants: 'Plantas ilimitadas',
  feature_ai_diagnosis: '30 diagnosticos IA por mes',
  feature_all_tables: 'Todas las tablas nutricionales',
  feature_photo_history: 'Historial fotografico completo',
  feature_export_soon: 'Exportar historial (proximamente)',

  subtitle: 'Todo lo que necesitas para el cultivo perfecto',

  purchase_success_title: 'Plan Pro activado',
  purchase_success_message: 'Bienvenido a Cultitrack Pro.',
  purchase_success_button: 'Empezar',
  purchase_error_title: 'No se pudo completar',

  restore_success_title: 'Compra restaurada',
  restore_success_message: 'Tu plan Pro fue restaurado.',
  restore_success_button: 'Continuar',
  restore_error_title: 'Error',
  restore_none_title: 'Sin compras previas',
  restore_none_message: 'No encontramos ninguna compra de Pro en tu cuenta.',

  purchase_cta: 'Activar Pro - USD 5/mes',
  purchase_cta_sub: 'Cancela cuando quieras',
  restore_button: 'Restaurar compra',
  dismiss_button: 'Ahora no',

  legal_disclaimer: 'Al suscribirte aceptas los Terminos de Servicio y la Politica de Privacidad.',
}

export const paywallModalEn = {
  feature_unlimited_plants: 'Unlimited plants',
  feature_ai_diagnosis: '30 AI diagnoses per month',
  feature_all_tables: 'All nutrition tables',
  feature_photo_history: 'Full photo history',
  feature_export_soon: 'Export history (coming soon)',

  subtitle: 'Everything you need for the perfect grow',

  purchase_success_title: 'Pro plan activated',
  purchase_success_message: 'Welcome to Cultitrack Pro.',
  purchase_success_button: 'Get started',
  purchase_error_title: 'Could not complete purchase',

  restore_success_title: 'Purchase restored',
  restore_success_message: 'Your Pro plan was restored.',
  restore_success_button: 'Continue',
  restore_error_title: 'Error',
  restore_none_title: 'No previous purchases',
  restore_none_message: 'We could not find any Pro purchase on your account.',

  purchase_cta: 'Activate Pro - USD 5/mo',
  purchase_cta_sub: 'Cancel anytime',
  restore_button: 'Restore purchase',
  dismiss_button: 'Not now',

  legal_disclaimer: 'By subscribing you agree to the Terms of Service and Privacy Policy.',
}
