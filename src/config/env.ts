/** Variables d'environnement (fichier .env, cf. .env.example). */
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
const apiKey = (import.meta.env.VITE_API_KEY as string | undefined) || '';

if (!apiUrl) console.error('VITE_API_URL manquante : renseignez-la dans le fichier .env');
if (!apiKey) console.error('VITE_API_KEY manquante : renseignez-la dans le fichier .env');

export const env = { apiUrl, apiKey };
