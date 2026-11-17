import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { env } from '@/config/env';

/**
 * Temps réel (Laravel Reverb), sur les mêmes canaux que l'app mobile.
 * Si Reverb n'est pas configuré, rien n'est ouvert : les écrans se rafraîchissent
 * alors périodiquement (cf. useSiegesEnDirect).
 */

let instance: Echo | null = null;

function echo(): Echo | null {
  if (!env.reverb.key || !env.reverb.host) return null;
  if (!instance) {
    (window as any).Pusher = Pusher;
    const tls = env.reverb.scheme === 'https';
    instance = new Echo({
      broadcaster: 'reverb',
      key: env.reverb.key,
      wsHost: env.reverb.host,
      wsPort: env.reverb.port,
      wssPort: env.reverb.port,
      forceTLS: tls,
      enabledTransports: tls ? ['wss'] : ['ws', 'wss'],
    });
  }
  return instance;
}

export const tempsReelDisponible = () => !!env.reverb.key && !!env.reverb.host;

/** Statut envoyé par l'API (1 vendu, 2 libre, 3 bloqué pendant un paiement en ligne). */
export function statutSiege(statut: unknown): 'reserve' | 'disponible' | 'selectionne' | null {
  return statut === 1 ? 'reserve' : statut === 3 ? 'selectionne' : statut === 2 ? 'disponible' : null;
}

/**
 * Suit les sièges d'un voyage : appelle `onSiege(code, statut)` à chaque changement
 * (vente en ligne, paiement en cours, siège libéré). Sans temps réel, appelle
 * `recharger` toutes les 5 secondes.
 */
export function useSiegesEnDirect(voyageId: number | null | undefined, onSiege: (code: string, statut: 'reserve' | 'disponible' | 'selectionne') => void, recharger: () => void) {
  const rappel = useRef(onSiege);
  const rechargement = useRef(recharger);
  rappel.current = onSiege;
  rechargement.current = recharger;

  useEffect(() => {
    if (!voyageId) return;
    const e = echo();
    if (!e) {
      const t = window.setInterval(() => rechargement.current(), 5000);
      return () => window.clearInterval(t);
    }
    const canal = `sieges.voyage.${voyageId}`;
    e.channel(canal).listen('.siege.updated', (evt: any) => {
      const s = statutSiege(evt?.data?.statut);
      if (s && evt?.siege_numero != null) rappel.current(String(evt.siege_numero), s);
    });
    // Relecture complète toutes les 5 s tant que Reverb n'est pas joignable,
    // puis toutes les 30 s par sécurité (connexion perdue, événement manqué)
    let tic = 0;
    const t = window.setInterval(() => {
      tic += 1;
      const connecte = (e.connector as any)?.pusher?.connection?.state === 'connected';
      if (!connecte || tic % 6 === 0) rechargement.current();
    }, 5000);
    return () => {
      window.clearInterval(t);
      e.leaveChannel(canal);
    };
  }, [voyageId]);
}
