import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { session, Utilisateur } from '@/auth/session';

/**
 * Client de l'API FANDRIO : clé API, jeton de l'admin, renouvellement
 * automatique du jeton expiré, messages d'erreur en français.
 */
export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 30000,
  headers: { Accept: 'application/json', 'X-API-KEY': env.apiKey },
});

api.interceptors.request.use((config) => {
  const token = session.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Erreur normalisée : message lisible + erreurs de validation éventuelles. */
export class ErreurApi extends Error {
  constructor(
    message: string,
    public status?: number,
    public erreurs?: Record<string, string[]>
  ) {
    super(message);
  }
}

function normaliser(error: AxiosError<any>): ErreurApi {
  if (!error.response) {
    return new ErreurApi(
      error.code === 'ECONNABORTED' ? 'Le serveur met trop de temps à répondre. Réessayez.' : 'Impossible de joindre le serveur. Vérifiez la connexion internet.'
    );
  }
  const { status, data } = error.response;
  const erreurs = data?.erreurs || data?.errors;
  const premiere = erreurs ? (Object.values(erreurs).flat()[0] as string | undefined) : undefined;
  const message =
    status === 403
      ? data?.message || "Vous n'avez pas accès à cette action."
      : status === 429
        ? 'Trop de requêtes. Patientez un instant puis réessayez.'
        : (status === 422 && premiere) || data?.message || 'Une erreur est survenue.';
  return new ErreurApi(message, status, erreurs);
}

// Renouvellement du jeton : une seule demande à la fois, partagée par les requêtes en échec
let renouvellement: Promise<string | null> | null = null;

async function renouveler(): Promise<string | null> {
  const ancien = session.token();
  if (!ancien) return null;
  try {
    const r = await axios.post(
      `${env.apiUrl}/api/rafraichir-token`,
      {},
      { headers: { Accept: 'application/json', 'X-API-KEY': env.apiKey, Authorization: `Bearer ${ancien}` }, timeout: 15000 }
    );
    const token: string | undefined = r.data?.token;
    const utilisateur: Utilisateur | undefined = r.data?.utilisateur;
    if (!token || !utilisateur) return null;
    session.enregistrer(token, utilisateur, 'maj');
    return token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<any>) => {
    const config = error.config as (InternalAxiosRequestConfig & { _rejoue?: boolean }) | undefined;
    const url = config?.url || '';
    if (error.response?.status === 401 && config && !config._rejoue && session.token() && !url.includes('/api/connexion')) {
      config._rejoue = true;
      renouvellement ??= renouveler().finally(() => {
        renouvellement = null;
      });
      const token = await renouvellement;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
      session.vider('expiree');
    }
    return Promise.reject(normaliser(error));
  }
);

export function messageErreur(e: unknown, defaut = 'Une erreur est survenue.'): string {
  if (e instanceof Error && e.message) return e.message;
  return defaut;
}
