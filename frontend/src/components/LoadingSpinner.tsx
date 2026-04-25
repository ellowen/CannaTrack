export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-2 border-transparent border-t-ink-1 rounded-full animate-spin" />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block mb-4">
          <LoadingSpinner />
        </div>
        <p className="text-sm text-ink-3 font-medium">Cargando...</p>
      </div>
    </div>
  )
}
