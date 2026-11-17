/**
 * Thème Océan : mêmes couleurs que l'app mobile (app-fandrio/app/theme/ocean.ts).
 * Changer une couleur ici la change dans tout le back-office.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: { 950: '#062A4A', 800: '#0B4F8A', 500: '#2E8FE0', 300: '#5FB0F2', 200: '#B9D1EA', 100: '#D2E3F3', 50: '#EBF2F9' },
        fond: '#F4F7FB',
        surface: '#FFFFFF',
        encre: { DEFAULT: '#0F1B2D', douce: '#33445C' },
        gris: { DEFAULT: '#5A6B82', clair: '#7A8AA0' },
        ligne: '#E3EAF2',
        separateur: '#EEF2F7',
        champ: '#D9E3EE',
        marine: { texte: '#A9C3DE', menu: '#C9D8EA', section: '#7F9BBB' },
        succes: { DEFAULT: '#0F6B40', fond: '#E6F4EC', vif: '#16A05D' },
        alerte: { DEFAULT: '#8F4F05', fond: '#FDF1E1', vif: '#E4A13A', bord: '#F2D3A6' },
        danger: { DEFAULT: '#A8201A', fond: '#FDECEA', bord: '#F3C7C3' },
        neutre: { DEFAULT: '#4A5A70', fond: '#EEF1F5' },
      },
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
      borderRadius: { carte: '16px', champ: '12px' },
    },
  },
  plugins: [],
};
