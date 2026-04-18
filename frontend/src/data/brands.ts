import type { Brand } from '@/types/plant'

export const REVEGETAR_BRAND: Brand = {
  id: 'revegetar',
  name: 'REVEGETAR',
  website: 'https://revegetar.com.ar',
  plan: 'listing',
}

export const TOPCROP_BRAND: Brand = {
  id: 'topcrop',
  name: 'Top Crop',
  website: 'https://topcropfert.com',
  plan: 'listing',
}

// Futuras marcas se agregan aquí como nuevos objetos Brand
// Ej: BIOBIZZ_BRAND, GHE_BRAND, etc.
export const ALL_BRANDS: Brand[] = [REVEGETAR_BRAND, TOPCROP_BRAND]
