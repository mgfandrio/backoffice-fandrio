import { forwardRef, ReactNode, SelectHTMLAttributes, useId } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  libelle: string;
  /** Libellé masqué (lu par les lecteurs d'écran seulement), pour les barres de filtres. */
  libelleCache?: boolean;
  erreur?: string;
  aide?: ReactNode;
  children: ReactNode;
}

/** Liste déroulante au style Océan (filtres et choix du back-office). */
export const Selecteur = forwardRef<HTMLSelectElement, Props>(function Selecteur({ libelle, libelleCache, erreur, aide, className = '', children, ...reste }, ref) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={libelleCache ? 'sr-only' : 'text-[12.5px] font-bold text-encre-douce'}>
        {libelle}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={erreur ? true : undefined}
        className={`h-11 w-full min-w-0 rounded-champ border-[1.5px] bg-white px-3 text-[14px] font-bold text-encre outline-none focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50 disabled:cursor-not-allowed disabled:bg-fond disabled:text-gris ${
          erreur ? 'border-danger' : 'border-champ'
        }`}
        {...reste}
      >
        {children}
      </select>
      {erreur ? <span className="text-xs font-bold text-danger">{erreur}</span> : aide && <span className="text-xs font-semibold text-encre-douce">{aide}</span>}
    </div>
  );
});
