/** Variables d'environnement (fichier .env, cf. .env.example). */
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
const apiKey = (import.meta.env.VITE_API_KEY as string | undefined) || '';

if (!apiUrl) console.error('VITE_API_URL manquante : renseignez-la dans le fichier .env');
if (!apiKey) console.error('VITE_API_KEY manquante : renseignez-la dans le fichier .env');

/** Temps réel (Laravel Reverb). Sans clé : actualisation périodique à la place. */
const reverb = {
  key: (import.meta.env.VITE_REVERB_KEY as string | undefined) || '',
  host: (import.meta.env.VITE_REVERB_HOST as string | undefined) || '',
  port: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
  scheme: ((import.meta.env.VITE_REVERB_SCHEME as string | undefined) || 'http').toLowerCase(),
};

export const env = { apiUrl, apiKey, reverb };
