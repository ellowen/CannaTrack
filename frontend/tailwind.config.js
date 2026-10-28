export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semánticos — cambian con el tema via CSS vars
        brand: {
          // color-mix para que funcionen las variantes con opacidad (bg-brand-400/90): con un var() pelado Tailwind no genera la regla
          400:    'color-mix(in srgb, var(--brand-400) calc(<alpha-value> * 100%), transparent)',
          subtle: 'var(--brand-subtle)',
          border: 'var(--brand-border)',
          dim:    'var(--brand-dim)',
            // Texto sobre fondo brand-400 (oscuro en ambos temas: blanco sobre el verde da ~2:1)
          'on':   'var(--on-brand)',
          // Texto verde de marca sobre fondo de pagina: contraste >= 4.5:1 en claro
          text:   'var(--brand-text)',
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
          nutrition:   '#6BBF78',
          irrigation:  '#6BA3D6',
          observation: '#D9A441',
          foliar:      '#A98BD0',
          harvest:     '#D8715C',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces Variable', 'Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
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
