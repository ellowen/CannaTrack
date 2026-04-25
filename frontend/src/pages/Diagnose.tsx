export default function Diagnose() {
  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-1">Diagnóstico por IA</h1>
        <p className="text-sm text-ink-3 mt-1">Analiza fotos de tus plantas</p>
      </header>

      <div className="py-12 text-center">
        <div className="w-16 h-16 bg-app-border rounded-full mx-auto mb-4 flex items-center justify-center opacity-50">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <p className="text-ink-2 font-medium mb-2">Próximamente</p>
        <p className="text-sm text-ink-3">La función de diagnóstico por IA estará disponible en breve</p>
      </div>
    </div>
  )
}
