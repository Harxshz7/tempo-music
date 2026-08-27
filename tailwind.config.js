/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'neo-bg': '#FFFDF5',
        'neo-black': '#000000',
        'neo-accent': '#FF6B6B',
        'neo-secondary': '#FFD93D',
        'neo-muted': '#C4B5FD',
      },
      fontFamily: { 
        'space-grotesk': ['SpaceGrotesk_700Bold'], 
        'space-grotesk-black': ['SpaceGrotesk_900Black'] 
      },
      borderWidth: { 
        4: '4px', 
        8: '8px' 
      }
    },
  },
  plugins: [],
};
