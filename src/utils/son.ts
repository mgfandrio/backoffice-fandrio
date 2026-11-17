/**
 * Bips de l'embarquement : aigu court = billet accepté, deux graves = refus.
 * Utile quand l'agent regarde le voyageur plutôt que l'écran.
 */
let contexte: AudioContext | null = null;

function bip(frequence: number, duree: number, debut = 0) {
  try {
    contexte ??= new AudioContext();
    const t = contexte.currentTime + debut;
    const o = contexte.createOscillator();
    const g = contexte.createGain();
    o.type = 'sine';
    o.frequency.value = frequence;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g).connect(contexte.destination);
    o.start(t);
    o.stop(t + duree + 0.02);
  } catch {
    /* son indisponible : sans conséquence */
  }
}

export const sons = {
  ok: () => bip(1046, 0.14),
  attention: () => bip(660, 0.18),
  refus: () => {
    bip(220, 0.18);
    bip(220, 0.18, 0.24);
  },
};
