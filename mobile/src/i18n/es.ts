import { authEs, onboardingEs } from './screens/auth'
import { homeEs, tasksTabEs } from './screens/home'
import { plantsTabEs, plantNewEs } from './screens/plants'
import { plantDetailEs, plantEditEs } from './screens/plantDetail'
import { plantDiaryEs, plantDiagnosisEs, plantMeasurementsEs, plantTimelineEs } from './screens/plantSub'
import { tablesIndexEs, tablesNewEs, tablesDetailEs, tablesCompareEs } from './screens/tables'
import { diagnoseTabEs, profileTabEs, achievementsEs } from './screens/misc'
import { completeTaskSheetEs, harvestSheetEs, paywallModalEs } from './screens/components'
import {
  plantCardEs, tabBarEs, swipeableTaskItemEs, errorBoundaryEs, offlineIndicatorEs,
} from './screens/sharedComponents'

const es = {
  common: {
    save: 'Guardar',
    saved: 'Guardado',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    loading: 'Cargando...',
    edit: 'Editar',
    add: 'Agregar',
    back: 'Volver',
    yes: 'Si',
    no: 'No',
  },

  settings: {
    title: 'Configuracion',
    username_label: 'Nombre de usuario',
    username_empty_error: 'El nombre no puede estar vacio',
    username_max_error: 'Maximo 30 caracteres',
    username_save_error: 'Error al guardar',
    preferences: 'Preferencias',
    dark_mode: 'Modo oscuro',
    theme_dark: 'Tema oscuro',
    theme_light: 'Tema claro',
    notifications: 'Notificaciones',
    notifications_reminder_at: 'Recordatorio a las {{time}}',
    reminder_time: 'Hora del recordatorio',
    language: 'Idioma',
    nutrition_tables: 'Tablas Nutricionales',
    nutrition_tables_desc: 'REVEGETAR, Top Crop y mas',
    about: 'Acerca de',
    privacy_policy: 'Politica de Privacidad',
    terms_of_service: 'Terminos de Servicio',
    sign_out: 'Cerrar sesion',
    sign_out_title: 'Cerrar sesion',
    sign_out_confirm: '¿Estas seguro?',
    delete_account: 'Eliminar cuenta',
    delete_account_confirm_title: 'Eliminar cuenta',
    delete_account_confirm_desc: 'Se van a borrar tu perfil, tus plantas, historial y fotos de forma permanente. Esta accion no se puede deshacer.',
    delete_account_error_title: 'No se pudo eliminar la cuenta',
    delete_account_error_desc: 'Intenta de nuevo mas tarde.',
  },

  auth: authEs,
  onboarding: onboardingEs,
  home: homeEs,
  tasksTab: tasksTabEs,
  plantsTab: plantsTabEs,
  plantNew: plantNewEs,
  plantDetail: plantDetailEs,
  plantEdit: plantEditEs,
  plantDiary: plantDiaryEs,
  plantDiagnosis: plantDiagnosisEs,
  plantMeasurements: plantMeasurementsEs,
  plantTimeline: plantTimelineEs,
  tablesIndex: tablesIndexEs,
  tablesNew: tablesNewEs,
  tablesDetail: tablesDetailEs,
  tablesCompare: tablesCompareEs,
  diagnoseTab: diagnoseTabEs,
  profileTab: profileTabEs,
  achievements: achievementsEs,
  completeTaskSheet: completeTaskSheetEs,
  harvestSheet: harvestSheetEs,
  paywallModal: paywallModalEs,
  plantCard: plantCardEs,
  tabBar: tabBarEs,
  swipeableTaskItem: swipeableTaskItemEs,
  errorBoundary: errorBoundaryEs,
  offlineIndicator: offlineIndicatorEs,
}

export default es
