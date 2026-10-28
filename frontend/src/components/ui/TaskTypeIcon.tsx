/** Icono de linea por tipo de tarea; toma el color del texto (currentColor). */
export default function TaskTypeIcon({ type, className = 'w-5 h-5' }: { type: string; className?: string }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true }
  switch (type) {
    case 'nutrition':
      return <svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
    case 'irrigation':
      return <svg {...p}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
    case 'observation':
      return <svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
    case 'foliar':
      return <svg {...p}><path d="M12 22V12" /><path d="M12 12c0-5 4-8 8-8 0 4-3 8-8 8z" /><path d="M12 12c0-5-4-8-8-8 0 4 3 8 8 8z" /><path d="M5 20c2-2 4.5-3 7-3" /></svg>
    case 'harvest':
      return <svg {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" /></svg>
  }
}
