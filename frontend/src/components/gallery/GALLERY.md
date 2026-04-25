# PhotoGallery Component

Galería de fotos para seguimiento visual de plantas con upload, grid responsivo, agrupación por semana y lightbox.

## Características

- **Upload de fotos**: Click o drag-and-drop (futura mejora)
- **Preview antes de guardar**: Modal con vista previa y validación
- **Compresión automática**: Máx 2 MB (configurable)
- **Grid responsivo**: 2 cols mobile, 3 cols tablet, 4 cols desktop
- **Agrupación por semana**: Organiza fotos por VEGE/FLORA + número de semana
- **Lightbox fullscreen**: Swipe left/right, navegación por puntos, zoom
- **Delete con confirmación**: Modal de confirmación antes de eliminar
- **Dark mode**: Soporte completo para light/dark themes
- **Offline-first**: Almacena fotos en localStorage como base64 (temporal)

## Uso

```tsx
import { PhotoGallery } from '@/components/gallery'
import { useWeekLog } from '@/hooks/useWeekLog'

export default function MyComponent() {
  const { logs, addLog, deleteLog } = useWeekLog(plantId)

  function handleAddPhoto(photoDataUrl: string, logDate?: Date) {
    addLog({
      plantId,
      weekLabel: 'VEGE S3',
      logDate: logDate || new Date(),
      notes: '',
      photoDataUrl,
    })
  }

  function handleDeletePhoto(logId: string) {
    deleteLog(logId)
  }

  return (
    <PhotoGallery
      logs={logs}
      onAddPhoto={handleAddPhoto}
      onDeletePhoto={handleDeletePhoto}
    />
  )
}
```

## Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `logs` | `WeekLog[]` | Array de entries del diario (incluyendo fotos) |
| `onAddPhoto` | `(photoDataUrl, logDate?) => void` | Callback al guardar foto |
| `onDeletePhoto` | `(logId: string) => void` | Callback al eliminar foto |

## Flujo de Upload

1. User hace click en "Agregar" o botón empty state
2. File picker abre (accept="image/jpeg,image/png,image/webp")
3. Validaciones:
   - Solo imágenes (JPG, PNG, WebP)
   - Máximo 10 MB (validación inicial)
4. Si valida → `resizeImageFile` comprime a ≤2 MB, 1920×1440 max
5. Preview modal aparece con imagen comprimida
6. User puede:
   - "Cancelar": descarta
   - "Guardar foto": llama `onAddPhoto(dataUrl, now)`
7. Foto se agrega al store y aparece en grid

## Flujo de Delete

1. User hace hover sobre foto → aparecen botones [📷] [🗑️]
2. Click en 🗑️ → modal de confirmación
3. "Cancelar" → cierra modal
4. "Eliminar" → llama `onDeletePhoto(logId)` y refresca grid

## Flujo de Lightbox

1. User hace click en foto o botón [📷] del overlay
2. Lightbox abre fullscreen en esa foto
3. Navegación:
   - **Swipe left/right**: siguiente/anterior
   - **Arrow keys**: izquierda/derecha
   - **Esc**: cerrar
   - **Click foto**: toggle info panel
4. Top bar: contador de fotos (X / Y), botón cerrar
5. Bottom bar: info (semana, fecha, notas), dot indicators
6. Edge rubber-band effect en primer/última foto

## Estilos

- Colores de semana basados en gradientes:
  - VEGE: verde (`linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`)
  - FLORA: naranja (`linear-gradient(135deg, #f97316 0%, #ea580c 100%)`)
- Responsive con Tailwind
- Dark mode soportado (dark: prefixes)
- Transiciones suaves (200ms)
- Tap highlight disabled en buttons para móvil

## Validaciones

| Aspecto | Límite | Error |
|---------|--------|-------|
| Tipo de archivo | JPG, PNG, WebP | "Solo se aceptan imágenes..." |
| Tamaño inicial | 10 MB | "Imagen muy grande..." |
| Tamaño comprimido | 2 MB | (automático, no falla) |
| Resolución máxima | 1920×1440 | (automático) |

## Storage

Actual: localStorage con `WeekLogStore` (zustand + persist)
- Clave: `cannatrack-weeklogs`
- Formato: JSON con dateReviver

Futuro: Supabase Storage
- Cambio en `onAddPhoto`: upload a `/photos/{plantId}/{uuid}.jpg`
- Fetch desde `photoUrl` en vez de `photoDataUrl` base64

## Responsive

```
Mobile (< 768px):   2 cols, 16px gap, 4px padding
Tablet (768-1024px): 3 cols
Desktop (> 1024px):   4 cols
```

## Performance

- Lazy-loading de imágenes (img with src)
- Compresión automática → base64 dataUrl
- Grid virtualizado (futura mejora si >100 fotos)
- No se recalculan estilos innecesariamente (memoization)

## Future Enhancements

- [ ] Drag-and-drop upload
- [ ] Multiple file upload
- [ ] Drag to reorder fotos
- [ ] Watermark con fecha/semana
- [ ] Supabase Storage integration
- [ ] Thumbnails con worker (heavy images)
- [ ] Export as PDF con todas las fotos
- [ ] Comparación side-by-side (VEGE S1 vs FLORA F1)
