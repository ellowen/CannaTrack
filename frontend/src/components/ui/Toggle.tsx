import { clsx } from 'clsx'

interface ToggleProps {
  enabled: boolean
  onChange: () => void
  disabled?: boolean
}

export default function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'relative shrink-0 w-[52px] h-[30px] rounded-full transition-colors duration-200',
        'tap-highlight-none disabled:opacity-40 disabled:pointer-events-none',
        enabled ? 'bg-brand-400' : 'bg-app-elevated border border-app-border-strong'
      )}
    >
      <span
        className={clsx(
          'absolute top-[3px] left-[3px] w-6 h-6 bg-white rounded-full shadow-md',
          'transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-[22px]' : 'translate-x-0'
        )}
      />
    </button>
  )
}
