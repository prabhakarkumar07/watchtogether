/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0A0B10',
          soft: '#12141F',
          panel: '#171A26',
        },
        marquee: {
          violet: '#8B5CF6',
          amber: '#FFC857',
          live: '#34D399',
          coral: '#FF6B6B',
        },
        ink: {
          DEFAULT: '#F3F1FF',
          muted: '#9CA3B8',
          faint: '#5B6178',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'beam-gradient':
          'radial-gradient(120% 120% at 50% -10%, rgba(139,92,246,0.25) 0%, rgba(10,11,16,0) 60%)',
        'ticket-notch':
          'radial-gradient(circle at 0 50%, transparent 8px, black 8.5px), radial-gradient(circle at 100% 50%, transparent 8px, black 8.5px)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 24px 0 rgba(139, 92, 246, 0.35)',
        'glow-amber': '0 0 24px 0 rgba(255, 200, 87, 0.35)',
      },
      keyframes: {
        pulseBulb: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: 0, transform: 'translateX(16px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
      },
      animation: {
        bulb: 'pulseBulb 2.4s ease-in-out infinite',
        'float-in': 'floatIn 0.35s ease-out',
        'slide-in': 'slideInRight 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
