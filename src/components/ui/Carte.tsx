import { HTMLAttributes } from 'react';

/**
 * Carte blanche, ou bleu marine (`marine`) pour l'indicateur principal.
 * Le fond vient de la variante, jamais de `className` (deux fonds Tailwind
 * sur un même élément : c'est l'ordre du CSS qui gagne, pas l'ordre des classes).
 */
export function Carte({ className = '', marine, ...reste }: HTMLAttributes<HTMLDivElement> & { marine?: boolean }) {
  return <div className={`rounded-carte border ${marine ? 'border-ocean-950 bg-ocean-950 text-white' : 'border-ligne bg-white'} ${className}`} {...reste} />;
}
