export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semánticos — cambian con el tema via CSS vars
        brand: {
          400:    'var(--brand-400)',
          subtle: 'var(--brand-subtle)',
          border: 'var(--brand-border)',
          dim:    'var(--brand-dim)',
          // Estáticos (para uso con opacidad: brand-500/20 etc.)
          200: '#A8DAB0',
          300: '#6DC278',
          500: '#2A8E39',
          600: '#1B6D28',
          700: '#0F4F1A',
        },
        app: {
          bg:             'var(--app-bg)',
          card:           'var(--app-card)',
          elevated:       'var(--app-elevated)',
          overlay:        'var(--app-overlay)',
          border:         'var(--app-border)',
          'border-strong':'var(--app-border-strong)',
        },
        ink: {
          1: 'var(--ink-1)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        flora: {
          bg:     'var(--flora-bg)',
          text:   'var(--flora-text)',
          border: 'var(--flora-border)',
        },
        vege: {
          bg:     'var(--vege-bg)',
          text:   'var(--vege-text)',
          border: 'var(--vege-border)',
        },
        task: {
          nutrition:   '#22C55E',
          irrigation:  '#3B82F6',
          observation: '#F59E0B',
          foliar:      '#A855F7',
          harvest:     '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        card:          'var(--shadow-card)',
        'card-md':     'var(--shadow-card-md)',
        'card-lg':     'var(--shadow-card-lg)',
        'glow-brand':  'var(--shadow-glow-brand)',
        'glow-amber':  'var(--shadow-glow-amber)',
      },
    },
  },
  plugins: [],
}
