import { HTMLAttributes } from 'react';

/**
 * Carte blanche, ou bleu marine (`marine`) pour l'indicateur principal.
 * Le fond vient de la variante, jamais de `className` (deux fonds Tailwind
 * sur un même élément : c'est l'ordre du CSS qui gagne, pas l'ordre des classes).
 */
export function Carte({ className = '', marine, ...reste }: HTMLAttributes<HTMLDivElement> & { marine?: boolean }) {
  return (
    <div
      className={`rounded-carte border shadow-[0_1px_2px_rgba(6,42,74,0.06),0_6px_18px_-8px_rgba(6,42,74,0.18)] ${marine ? 'border-ocean-950 bg-ocean-950 text-white' : 'border-ligne bg-white'} ${className}`}
      {...reste}
    />
  );
}
