import { useMemo } from 'react';

/** Siège renvoyé par l'API (plan des sièges d'un voyage). */
export interface SiegePlan {
  code: string;
  /** 'disponible' | 'reserve' (vendu) | 'selectionne' (paiement en ligne en cours) */
  statut: string;
}

/** Disposition dessinée par la compagnie : rangées de 'C' (chauffeur), '' (vide) ou numéros. */
export type GrillePlan = string[][];

type Case = { type: 'chauffeur' } | { type: 'vide' } | { type: 'siege'; code: string };

/**
 * Disposition automatique d'un minibus (même règle que l'app mobile), l'avant en haut :
 * chauffeur + 2 places, banquette de 4, rangées de 2 + couloir + 1, banquette arrière de 4.
 */
function dispositionMinibus(codes: string[]): Case[][] {
  const rangees: Case[][] = [];
  let i = 0;
  const prendre = (): Case => (i < codes.length ? { type: 'siege', code: codes[i++] } : { type: 'vide' });
  rangees.push([{ type: 'chauffeur' }, { type: 'vide' }, prendre(), prendre()]);
  const restants = codes.length - i;
  if (restants <= 0) return rangees;
  if (restants <= 4) {
    rangees.push([prendre(), prendre(), prendre(), prendre()]);
    return rangees;
  }
  rangees.push([prendre(), prendre(), prendre(), prendre()]);
  const rangeesDe3 = Math.max(0, Math.floor((codes.length - i - 4) / 3));
  for (let r = 0; r < rangeesDe3; r++) rangees.push([prendre(), prendre(), { type: 'vide' }, prendre()]);
  const reste = codes.length - i - 4;
  if (reste > 0) rangees.push([prendre(), reste > 1 ? prendre() : { type: 'vide' }, { type: 'vide' }, { type: 'vide' }]);
  rangees.push([prendre(), prendre(), prendre(), prendre()]);
  return rangees;
}

function dispositionGrille(grille: GrillePlan): Case[][] {
  return grille.map((r) => r.map((c): Case => (c === 'C' ? { type: 'chauffeur' } : c ? { type: 'siege', code: String(c) } : { type: 'vide' })));
}

interface Props {
  sieges: SiegePlan[];
  grille?: GrillePlan | null;
  /** Sièges choisis par le guichetier. */
  selection?: string[];
  onBasculer?: (code: string) => void;
  /** Sièges cochés « à bord » (embarquement) : affichés en vert. */
  aBord?: string[];
}

/** Plan des sièges vu de dessus, avant en haut. Sans `onBasculer`, en lecture seule. */
export function PlanSieges({ sieges, grille, selection = [], onBasculer, aBord }: Props) {
  const parCode = useMemo(() => new Map(sieges.map((s) => [String(s.code), s])), [sieges]);
  const rangees = useMemo(() => {
    if (grille && grille.length) return dispositionGrille(grille);
    const codes = [...sieges].sort((a, b) => Number(a.code) - Number(b.code)).map((s) => String(s.code));
    return dispositionMinibus(codes);
  }, [grille, sieges]);
  const colonnes = Math.max(...rangees.map((r) => r.length), 1);

  return (
    <div className="inline-flex flex-col gap-2 rounded-[22px_22px_14px_14px] border-[1.5px] border-ligne bg-[#F8FAFD] p-4">
      <span className="text-center text-[11px] font-extrabold uppercase tracking-wider text-encre-douce">Avant du véhicule</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colonnes}, 48px)` }}>
        {rangees.flatMap((r, ri) =>
          Array.from({ length: colonnes }, (_, ci) => {
            const c = r[ci] || { type: 'vide' as const };
            const cle = `${ri}-${ci}`;
            if (c.type === 'chauffeur') {
              return (
                <span key={cle} role="img" aria-label="Chauffeur" title="Chauffeur" className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutre-fond text-neutre">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M12 4v6M5 14l5-1M19 14l-5-1" />
                  </svg>
                </span>
              );
            }
            if (c.type === 'vide') return <span key={cle} className="h-12 w-12" aria-hidden />;
            const s = parCode.get(c.code);
            const statut = s?.statut || 'disponible';
            const choisi = selection.includes(c.code);
            const bord = aBord?.includes(c.code);
            const vendu = statut === 'reserve';
            const enCours = statut === 'selectionne';
            const libelle = `Siège ${c.code}, ${bord ? 'à bord' : vendu ? 'vendu' : enCours ? 'paiement en ligne en cours' : choisi ? 'choisi' : 'libre'}`;
            const style = bord
              ? 'bg-succes-vif text-white border-succes-vif'
              : choisi
                ? 'bg-ocean-800 text-white border-ocean-800'
                : vendu
                  ? 'bg-[#DCE4EE] text-[#5A6B82] border-[#DCE4EE]'
                  : enCours
                    ? 'bg-alerte-fond text-alerte border-alerte-vif'
                    : 'bg-white text-ocean-950 border-ocean-200 hover:border-ocean-800 hover:bg-ocean-50';
            const cliquable = !!onBasculer && !vendu && !enCours;
            return (
              <button
                key={cle}
                type="button"
                disabled={!cliquable}
                aria-pressed={onBasculer ? choisi : undefined}
                aria-label={libelle}
                title={libelle}
                onClick={() => cliquable && onBasculer?.(c.code)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-[1.5px] text-[15px] font-extrabold tabular-nums transition-colors ${style} ${cliquable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {c.code}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Légende du plan. */
export function LegendePlan({ embarquement }: { embarquement?: boolean }) {
  const items = embarquement
    ? [
        { c: 'bg-succes-vif', l: 'À bord' },
        { c: 'bg-[#DCE4EE]', l: 'Vendu, pas encore à bord' },
        { c: 'bg-white border-[1.5px] border-ocean-200', l: 'Libre' },
      ]
    : [
        { c: 'bg-white border-[1.5px] border-ocean-200', l: 'Libre' },
        { c: 'bg-ocean-800', l: 'Choisi' },
        { c: 'bg-alerte-fond border-[1.5px] border-alerte-vif', l: 'Paiement en ligne en cours' },
        { c: 'bg-[#DCE4EE]', l: 'Vendu' },
      ];
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-2 p-0">
      {items.map((i) => (
        <li key={i.l} className="flex items-center gap-1.5 text-[13px] font-semibold text-encre-douce">
          <span className={`h-4 w-4 rounded-[5px] ${i.c}`} aria-hidden />
          {i.l}
        </li>
      ))}
    </ul>
  );
}
