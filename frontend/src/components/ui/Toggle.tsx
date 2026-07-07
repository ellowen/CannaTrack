import { clsx } from 'clsx'

interface ToggleProps {
  enabled: boolean
  onChange: () => void
  disabled?: boolean
}

export default function Toggle({ enabled, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors tap-highlight-none',
        disabled ? 'opacity-40 pointer-events-none' : 'active:scale-95',
        enabled ? 'bg-brand-400' : 'bg-app-border'
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
