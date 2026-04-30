import type { ImagePickerAsset } from 'expo-image-picker'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Valida un asset de ImagePicker antes de subirlo.
 * Chequea tipo (solo imagenes) y tamano (max 5 MB).
 */
export function validatePhoto(asset: ImagePickerAsset): PhotoValidationResult {
  // Tipo
  if (asset.type && asset.type !== 'image') {
    return { ok: false, error: 'Solo se permiten imagenes (JPG, PNG, HEIC).' }
  }

  if (asset.mimeType && !ALLOWED_MIME.includes(asset.mimeType.toLowerCase())) {
    return { ok: false, error: `Formato no soportado (${asset.mimeType}). Usa JPG o PNG.` }
  }

  // Tamano — preferimos fileSize si esta disponible
  if (asset.fileSize != null) {
    if (asset.fileSize > MAX_BYTES) {
      const mb = (asset.fileSize / 1024 / 1024).toFixed(1)
      return { ok: false, error: `La foto pesa ${mb} MB. El maximo es 5 MB.` }
    }
    return { ok: true }
  }

  // Fallback: estimacion por longitud del base64 (base64 = 4/3 del original)
  if (asset.base64) {
    const estimatedBytes = Math.ceil(asset.base64.length * 0.75)
    if (estimatedBytes > MAX_BYTES) {
      const mb = (estimatedBytes / 1024 / 1024).toFixed(1)
      return { ok: false, error: `La foto es demasiado grande (~${mb} MB). El maximo es 5 MB.` }
    }
  }

  return { ok: true }
}
