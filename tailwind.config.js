/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App surfaces
        app: {
          bg:     '#090A0F',
          panel:  '#0F1117',
          raised: '#161820',
          hover:  '#1C1E28',
          border: '#232530',
          'border-subtle': '#1A1C26',
        },
        // Accent colors
        accent: {
          blue:   '#3B82F6',
          'blue-dim': '#1D4ED8',
          green:  '#22C55E',
          amber:  '#F59E0B',
          red:    '#EF4444',
          violet: '#8B5CF6',
        },
        // Text hierarchy
        text: {
          primary:   '#E8E9F0',
          secondary: '#8B8FA8',
          muted:     '#545769',
          inverse:   '#090A0F',
        },
        // Status
        status: {
          online:  '#22C55E',
          away:    '#F59E0B',
          offline: '#545769',
          error:   '#EF4444',
          live:    '#EF4444',
        },
        // Light mode (keep existing for compat)
        void: {
          DEFAULT: '#090A0F',
          soft:    '#0F1117',
          panel:   '#161820',
        },
        marquee: {
          violet: '#8B5CF6',
          amber:  '#F59E0B',
          live:   '#22C55E',
          coral:  '#EF4444',
        },
        ink: {
          DEFAULT: '#E8E9F0',
          muted:   '#8B8FA8',
          faint:   '#545769',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'panel-lg': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        glow: '0 0 20px rgba(59,130,246,0.2)',
        'glow-green': '0 0 12px rgba(34,197,94,0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        speaking: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(34,197,94,0.6)' },
          '50%':      { boxShadow: '0 0 0 4px rgba(34,197,94,0.3)' },
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        speaking:     'speaking 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
