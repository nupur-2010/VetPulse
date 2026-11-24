/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm pastoral primary (meadow green)
        primary: {
          DEFAULT: '#2d5a27',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#2d5a27',
          800: '#1e3a1a',
          900: '#142610',
        },
        // Sunset accent
        sunset: {
          DEFAULT: '#e87f2a',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#e87f2a',
          600: '#ea580c',
          700: '#c2410c',
        },
        // Sky blue
        sky: {
          DEFAULT: '#87ceeb',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
        },
        // Earthy grass
        grass: {
          DEFAULT: '#7cb342',
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#7cb342',
          600: '#65a30d',
          700: '#4d7c0f',
        },
        // Warm cream background
        cream: {
          DEFAULT: '#faf5eb',
          50: '#ffffff',
          100: '#fefdfb',
          200: '#faf5eb',
          300: '#f5efe0',
          400: '#ebe3d0',
          500: '#ddd5bf',
        },
        // Warm brown
        earth: {
          DEFAULT: '#8b6914',
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#8b6914',
          600: '#854d0e',
          700: '#713f12',
        },
        surface: '#fefdfb',
        background: '#faf5eb',
        text: '#3d2914',
        warning: '#d97706',
        critical: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
        'sway': 'sway 4s ease-in-out infinite',
        'sway-reverse': 'sway 4s ease-in-out infinite reverse',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'breeze': 'breeze 5s ease-in-out infinite',
        'drift': 'drift 12s linear infinite',
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'count-up': 'countUp 2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        breeze: {
          '0%, 100%': { transform: 'translateX(0px) skewX(0deg)' },
          '25%': { transform: 'translateX(3px) skewX(1deg)' },
          '75%': { transform: 'translateX(-3px) skewX(-1deg)' },
        },
        drift: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-sunset': 'linear-gradient(135deg, #87ceeb 0%, #f4a020 50%, #e87f2a 100%)',
        'gradient-pasture': 'linear-gradient(180deg, #87ceeb 0%, #7cb342 60%, #2d5a27 100%)',
        'gradient-warm': 'linear-gradient(180deg, #fef9c3 0%, #fed7aa 50%, #faf5eb 100%)',
        'gradient-earth': 'linear-gradient(135deg, #2d5a27 0%, #7cb342 100%)',
        'gradient-sky': 'linear-gradient(180deg, #0ea5e9 0%, #87ceeb 50%, #bae6fd 100%)',
      },
    },
  },
  plugins: [],
}
