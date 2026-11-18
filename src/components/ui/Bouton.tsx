import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LucideIcon } from 'lucide-react';

type Variante = 'principal' | 'secondaire' | 'danger' | 'succes' | 'lien';

const VARIANTES: Record<Variante, string> = {
  principal: 'bg-ocean-800 text-white hover:bg-ocean-950 disabled:bg-ocean-800/50',
  secondaire: 'bg-white text-ocean-950 border border-ocean-100 hover:bg-ocean-50 disabled:opacity-50',
  danger: 'bg-white text-danger border border-danger-bord hover:bg-danger-fond disabled:opacity-50',
  succes: 'bg-succes-vif text-white hover:bg-succes disabled:opacity-50',
  lien: 'bg-transparent text-ocean-800 hover:text-ocean-950 hover:underline !px-0',
};

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variante?: Variante;
  icone?: LucideIcon;
  chargement?: boolean;
  compact?: boolean;
  /** Raccourci clavier affiché à droite (ex. « F2 »). */
  touche?: string;
  /** Lien interne : rend un <Link> stylé comme un bouton. */
  vers?: string;
}

export function Bouton({ children, variante = 'principal', icone: Icone, chargement, compact, touche, vers, className = '', disabled, type = 'button', ...reste }: Props) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-champ font-extrabold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-500 disabled:cursor-not-allowed ${
    compact ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-sm'
  } ${VARIANTES[variante]} ${className}`;
  const contenu = (
    <>
      {chargement ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : Icone && <Icone className="h-[18px] w-[18px]" aria-hidden />}
      {children}
      {touche && <kbd className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${variante === 'principal' ? 'bg-white/20' : 'bg-fond text-encre-douce'}`}>{touche}</kbd>}
    </>
  );
  if (vers) {
    return (
      <Link to={vers} className={classes}>
        {contenu}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || chargement} aria-busy={chargement || undefined} {...reste}>
      {contenu}
    </button>
  );
}
