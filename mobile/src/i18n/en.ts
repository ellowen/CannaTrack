import { authEn, onboardingEn } from './screens/auth'
import { homeEn, tasksTabEn } from './screens/home'
import { plantsTabEn, plantNewEn } from './screens/plants'
import { plantDetailEn, plantEditEn } from './screens/plantDetail'
import { plantDiaryEn, plantDiagnosisEn, plantMeasurementsEn, plantTimelineEn } from './screens/plantSub'
import { tablesIndexEn, tablesNewEn, tablesDetailEn, tablesCompareEn } from './screens/tables'
import { diagnoseTabEn, profileTabEn, achievementsEn } from './screens/misc'
import { completeTaskSheetEn, harvestSheetEn, paywallModalEn } from './screens/components'
import {
  plantCardEn, tabBarEn, swipeableTaskItemEn, errorBoundaryEn, offlineIndicatorEn,
} from './screens/sharedComponents'

const en = {
  common: {
    save: 'Save',
    saved: 'Saved',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    loading: 'Loading...',
    edit: 'Edit',
    add: 'Add',
    back: 'Back',
    yes: 'Yes',
    no: 'No',
  },

  settings: {
    title: 'Settings',
    username_label: 'Username',
    username_empty_error: 'Username cannot be empty',
    username_max_error: 'Maximum 30 characters',
    username_save_error: 'Error saving',
    preferences: 'Preferences',
    dark_mode: 'Dark mode',
    theme_dark: 'Dark theme',
    theme_light: 'Light theme',
    notifications: 'Notifications',
    notifications_reminder_at: 'Reminder at {{time}}',
    reminder_time: 'Reminder time',
    language: 'Language',
    nutrition_tables: 'Nutrition Tables',
    nutrition_tables_desc: 'REVEGETAR, Top Crop and more',
    about: 'About',
    privacy_policy: 'Privacy Policy',
    terms_of_service: 'Terms of Service',
    sign_out: 'Sign out',
    sign_out_title: 'Sign out',
    sign_out_confirm: 'Are you sure?',
    delete_account: 'Delete account',
    delete_account_confirm_title: 'Delete account',
    delete_account_confirm_desc: 'Your profile, plants, history and photos will be permanently deleted. This cannot be undone.',
    delete_account_error_title: 'Could not delete account',
    delete_account_error_desc: 'Please try again later.',
  },

  auth: authEn,
  onboarding: onboardingEn,
  home: homeEn,
  tasksTab: tasksTabEn,
  plantsTab: plantsTabEn,
  plantNew: plantNewEn,
  plantDetail: plantDetailEn,
  plantEdit: plantEditEn,
  plantDiary: plantDiaryEn,
  plantDiagnosis: plantDiagnosisEn,
  plantMeasurements: plantMeasurementsEn,
  plantTimeline: plantTimelineEn,
  tablesIndex: tablesIndexEn,
  tablesNew: tablesNewEn,
  tablesDetail: tablesDetailEn,
  tablesCompare: tablesCompareEn,
  diagnoseTab: diagnoseTabEn,
  profileTab: profileTabEn,
  achievements: achievementsEn,
  completeTaskSheet: completeTaskSheetEn,
  harvestSheet: harvestSheetEn,
  paywallModal: paywallModalEn,
  plantCard: plantCardEn,
  tabBar: tabBarEn,
  swipeableTaskItem: swipeableTaskItemEn,
  errorBoundary: errorBoundaryEn,
  offlineIndicator: offlineIndicatorEn,
}

export default en
