/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0c0c0c',
          card: '#141414',
          border: '#222222',
          muted: '#555555',
          green: '#00ff41',
          'green-glow': '#00ff4133',
          amber: '#ffb000',
          'amber-glow': '#ffb00033',
          cyan: '#00f0ff',
          'cyan-glow': '#00f0ff33',
          white: '#f0f0f0',
          'white-glow': '#ffffff33',
        },
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Courier New"',
          'Courier',
          'monospace',
        ],
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 8s linear infinite',
        pulseSlow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};
