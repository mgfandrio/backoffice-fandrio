import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, LucideIcon } from 'lucide-react';
import { Carte } from '@/components/ui';

/** Briques des tableaux de bord : indicateur, panneau titré, tableau. */

type Ton = 'ocean' | 'succes' | 'alerte' | 'danger' | 'neutre';
const PUCES: Record<Ton, string> = {
  ocean: 'bg-ocean-50 text-ocean-800',
  succes: 'bg-succes-fond text-succes',
  alerte: 'bg-alerte-fond text-alerte',
  danger: 'bg-danger-fond text-danger',
  neutre: 'bg-neutre-fond text-neutre',
};

/** Indicateur chiffré : icône, libellé, valeur, détail et tendance éventuelle. */
export function Kpi({
  icone: Icone,
  libelle,
  valeur,
  unite,
  detail,
  tendance,
  ton = 'ocean',
  marine,
  chargement,
}: {
  icone: LucideIcon;
  libelle: string;
  valeur: string;
  unite?: string;
  detail?: ReactNode;
  /** Variation en %, affichée en vert ou rouge. */
  tendance?: number | null;
  ton?: Ton;
  marine?: boolean;
  chargement?: boolean;
}) {
  return (
    <Carte marine={marine} className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${marine ? 'bg-white/10 text-white' : PUCES[ton]}`}>
          <Icone className="h-5 w-5" aria-hidden />
        </span>
        <span className={`text-[13.5px] font-bold leading-tight ${marine ? 'text-[#DCE8F5]' : 'text-encre-douce'}`}>{libelle}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${marine ? 'text-white' : 'text-encre'}`}>{chargement ? '…' : valeur}</span>
        {unite && !chargement && <span className={`text-sm font-bold ${marine ? 'text-[#DCE8F5]' : 'text-encre-douce'}`}>{unite}</span>}
        {tendance !== undefined && tendance !== null && !chargement && (
          <span
            className={`ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-extrabold ${
              tendance >= 0 ? (marine ? 'bg-[#16A05D]/25 text-[#9BE7BE]' : 'bg-succes-fond text-succes') : marine ? 'bg-[#E04B3F]/25 text-[#FFB4AC]' : 'bg-danger-fond text-danger'
            }`}
          >
            {tendance >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(tendance).toFixed(1).replace('.', ',')} %
          </span>
        )}
      </div>
      {detail && <div className={`text-[13px] font-semibold ${marine ? 'text-[#DCE8F5]' : 'text-encre-douce'}`}>{detail}</div>}
    </Carte>
  );
}

/** Panneau avec un titre, un sous-titre et un lien « voir tout ». */
export function Panneau({
  titre,
  sousTitre,
  lien,
  libelleLien = 'Tout voir',
  droite,
  children,
  className = '',
  sansMarge,
}: {
  titre: string;
  sousTitre?: string;
  lien?: string;
  libelleLien?: string;
  droite?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Contenu collé aux bords (tableaux). */
  sansMarge?: boolean;
}) {
  return (
    <Carte className={`flex min-w-0 flex-col overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start gap-3 border-b border-separateur px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[16px] font-extrabold text-encre">{titre}</h2>
          {sousTitre && <p className="m-0 mt-0.5 text-[13px] font-semibold text-encre-douce">{sousTitre}</p>}
        </div>
        {droite}
        {lien && (
          <Link to={lien} className="rounded-lg px-2 py-1 text-[13px] font-extrabold text-ocean-800 no-underline hover:bg-ocean-50">
            {libelleLien}
          </Link>
        )}
      </div>
      <div className={sansMarge ? '' : 'p-5'}>{children}</div>
    </Carte>
  );
}

/** Tableau lisible : en-têtes contrastés, lignes séparées, défilement horizontal si besoin. */
export function Tableau({ colonnes, children }: { colonnes: { titre: string; droite?: boolean; cache?: boolean }[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#F8FAFD]">
            {colonnes.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={`whitespace-nowrap border-b border-ligne px-4 py-3 text-[12px] font-extrabold uppercase tracking-wide text-encre-douce ${c.droite ? 'text-right' : ''}`}
              >
                {c.cache ? <span className="sr-only">{c.titre}</span> : c.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[14px] text-encre [&>tr:hover]:bg-[#F8FAFD] [&>tr:last-child>td]:border-b-0 [&>tr>td]:border-b [&>tr>td]:border-separateur [&>tr>td]:px-4 [&>tr>td]:py-3">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** Barre de progression. */
export function Barre({ pct, ton = 'ocean' }: { pct: number; ton?: 'ocean' | 'succes' | 'alerte' }) {
  const couleur = { ocean: 'bg-ocean-800', succes: 'bg-succes-vif', alerte: 'bg-alerte-vif' }[ton];
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-ocean-50">
      <span className={`block h-full rounded-full ${couleur}`} style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }} />
    </span>
  );
}
