import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { Bouton, Champ, Dialogue, Selecteur } from '@/components/ui';
import { dispositionMinibus } from '@/components/sieges/PlanSieges';

/**
 * Éditeur du plan de sièges (mêmes règles que l'app mobile) : cliquez une case vide
 * pour y mettre un siège, un siège pour le retirer. Numérotation automatique de
 * l'avant vers l'arrière, de gauche à droite. Cases : 'C' chauffeur, 'S' siège, '-' vide.
 */

type Case = 'C' | 'S' | '-';
type Grille = Case[][];
type PlaceChauffeur = 'gauche' | 'droite' | 'aucun';

export const grilleDepuisApi = (g: string[][]): Grille => g.map((r) => r.map((c): Case => (c === 'C' ? 'C' : c ? 'S' : '-')));

/** Minibus « 2 + 1 » : exactement la disposition automatique de l'app mobile. */
function modeleMinibus(n: number): Grille {
  const codes = Array.from({ length: Math.max(n, 1) }, (_, i) => String(i + 1));
  return dispositionMinibus(codes).map((r) => r.map((c): Case => (c.type === 'chauffeur' ? 'C' : c.type === 'siege' ? 'S' : '-')));
}

/** Bus « gauche + couloir + droite », chauffeur devant à gauche, banquette arrière pleine. */
function modeleBus(n: number, gauche: number, droite: number): Grille {
  const largeur = gauche + 1 + droite;
  const g: Grille = [['C', ...Array<Case>(largeur - 1).fill('-')]];
  let restant = Math.max(n, 1);
  const banquette = restant > largeur ? largeur : 0;
  restant -= banquette;
  while (restant > 0) {
    const r: Case[] = [];
    for (let c = 0; c < largeur; c++) {
      if (c === gauche) r.push('-');
      else if (restant > 0) {
        r.push('S');
        restant--;
      } else r.push('-');
    }
    g.push(r);
  }
  if (banquette) g.push(Array<Case>(largeur).fill('S'));
  return g;
}

const compter = (g: Grille) => g.reduce((t, r) => t + r.filter((c) => c === 'S').length, 0);
function placeChauffeur(g: Grille): PlaceChauffeur {
  const r = g[0] || [];
  if (r[0] === 'C') return 'gauche';
  if (r[r.length - 1] === 'C') return 'droite';
  return g.some((l) => l.includes('C')) ? 'gauche' : 'aucun';
}

export function EditeurPlan({ ouvert, voitureId, titre, grilleInitiale, placesActuelles, onFermer, onEnregistre }: { ouvert: boolean; voitureId: number; titre: string; grilleInitiale: string[][] | null; placesActuelles: number; onFermer: () => void; onEnregistre: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const depart = useMemo(() => (grilleInitiale?.length ? grilleDepuisApi(grilleInitiale) : modeleMinibus(placesActuelles || 16)), [grilleInitiale, placesActuelles]);
  const [grille, setGrille] = useState<Grille>(depart);
  const [modele, setModele] = useState('minibus');
  const [placesModele, setPlacesModele] = useState(String(placesActuelles || 16));
  const [confirmer, setConfirmer] = useState<null | 'modele' | 'enregistrer' | 'abandon'>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) {
      setGrille(depart);
      setPlacesModele(String(placesActuelles || 16));
      d.showModal();
    }
    if (!ouvert && d.open) d.close();
  }, [ouvert, depart, placesActuelles]);

  const largeur = grille[0]?.length || 4;
  const places = compter(grille);
  const modifie = JSON.stringify(grille) !== JSON.stringify(depart);
  const chauffeur = placeChauffeur(grille);
  const numeros = useMemo(() => {
    let n = 0;
    return grille.map((r) => r.map((c) => (c === 'S' ? ++n : 0)));
  }, [grille]);

  const basculer = (r: number, c: number) => setGrille((g) => g.map((l, i) => (i !== r ? l : l.map((x, j) => (j !== c || x === 'C' ? x : x === 'S' ? '-' : 'S')))));
  const changerLargeur = (n: number) =>
    setGrille((g) =>
      g.map((l) => {
        if (n > l.length) return [...l, ...Array<Case>(n - l.length).fill('-')];
        const coupe = l.slice(0, n);
        if (l[l.length - 1] === 'C' && !coupe.includes('C')) coupe[n - 1] = 'C';
        return coupe;
      })
    );
  const ajouterRangee = () => setGrille((g) => (g.length >= 25 ? g : [...g, (g[g.length - 1] || []).map((c): Case => (c === 'C' ? '-' : c))]));
  const retirerRangee = () => setGrille((g) => (g.length > 1 ? g.slice(0, -1) : g));
  const deplacerChauffeur = (p: PlaceChauffeur) =>
    setGrille((g) =>
      g.map((l, i) => {
        const sans = l.map((c): Case => (c === 'C' ? '-' : c));
        if (i !== 0 || p === 'aucun') return sans;
        sans[p === 'gauche' ? 0 : sans.length - 1] = 'C';
        return sans;
      })
    );
  const appliquerModele = () => {
    const n = Math.max(1, Math.min(100, Number(placesModele) || 16));
    setGrille(modele === 'bus22' ? modeleBus(n, 2, 2) : modele === 'bus21' ? modeleBus(n, 2, 1) : modeleMinibus(n));
    setConfirmer(null);
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.put(`/api/adminCompagnie/plans-sieges/voiture/${voitureId}/grille`, { grille });
      setConfirmer(null);
      onEnregistre();
      onFermer();
    } catch (e) {
      setConfirmer(null);
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };
  const fermer = () => (modifie ? setConfirmer('abandon') : onFermer());

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        fermer();
      }}
      className="h-[min(860px,calc(100vh-32px))] w-[min(980px,calc(100vw-32px))] max-w-none rounded-[20px] border-0 bg-fond p-0 text-encre backdrop:bg-ocean-950/50"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-ligne bg-white px-5 py-4">
          <h2 className="m-0 text-lg font-extrabold">Plan de sièges · {titre}</h2>
          <p className="m-0 mt-0.5 text-[13.5px] font-semibold text-encre-douce">Cliquez une case vide pour ajouter un siège, un siège pour le retirer. La numérotation se fait toute seule.</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-wrap gap-5 overflow-auto p-5">
          {/* Réglages */}
          <div className="flex w-full max-w-[300px] flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-carte border border-ligne bg-white p-4">
              <b className="text-[14px]">Partir d’un modèle</b>
              <Selecteur libelle="Disposition" value={modele} onChange={(e) => setModele(e.target.value)}>
                <option value="minibus">Minibus (2 + 1)</option>
                <option value="bus22">Bus (2 + 2)</option>
                <option value="bus21">Bus (2 + 1)</option>
              </Selecteur>
              <Champ libelle="Nombre de places" inputMode="numeric" value={placesModele} onChange={(e) => setPlacesModele(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              <Bouton variante="secondaire" onClick={() => setConfirmer('modele')}>
                Appliquer ce modèle
              </Bouton>
            </div>
            <div className="flex flex-col gap-3 rounded-carte border border-ligne bg-white p-4">
              <b className="text-[14px]">Ajuster</b>
              <Selecteur libelle="Colonnes (largeur)" value={String(largeur)} onChange={(e) => changerLargeur(Number(e.target.value))}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} colonnes
                  </option>
                ))}
              </Selecteur>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-bold text-encre-douce">Rangées : {grille.length}</span>
                <div className="flex gap-2">
                  <Bouton variante="secondaire" compact icone={Minus} onClick={retirerRangee} disabled={grille.length <= 1}>
                    Retirer
                  </Bouton>
                  <Bouton variante="secondaire" compact icone={Plus} onClick={ajouterRangee} disabled={grille.length >= 25}>
                    Ajouter
                  </Bouton>
                </div>
              </div>
              <Selecteur libelle="Place du chauffeur" value={chauffeur} onChange={(e) => deplacerChauffeur(e.target.value as PlaceChauffeur)}>
                <option value="gauche">Devant à gauche</option>
                <option value="droite">Devant à droite</option>
                <option value="aucun">Pas de case chauffeur</option>
              </Selecteur>
            </div>
          </div>

          {/* Grille */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="inline-flex flex-col gap-2 rounded-[22px_22px_14px_14px] border-[1.5px] border-ligne bg-white p-4">
              <span className="text-center text-[11px] font-extrabold uppercase tracking-wider text-encre-douce">Avant du véhicule</span>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${largeur}, 48px)` }}>
                {grille.map((r, ri) =>
                  r.map((c, ci) =>
                    c === 'C' ? (
                      <span key={`${ri}-${ci}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutre-fond text-[11px] font-extrabold text-neutre" title="Chauffeur">
                        Chauff.
                      </span>
                    ) : (
                      <button
                        key={`${ri}-${ci}`}
                        type="button"
                        onClick={() => basculer(ri, ci)}
                        aria-label={c === 'S' ? `Siège ${numeros[ri][ci]} : retirer` : `Rangée ${ri + 1}, case ${ci + 1} : ajouter un siège`}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-[15px] font-extrabold tabular-nums transition-colors ${
                          c === 'S' ? 'border-[1.5px] border-ocean-800 bg-ocean-800 text-white hover:bg-ocean-950' : 'border-[1.5px] border-dashed border-champ bg-[#F8FAFD] text-gris-clair hover:border-ocean-500 hover:text-ocean-800'
                        }`}
                      >
                        {c === 'S' ? numeros[ri][ci] : '+'}
                      </button>
                    )
                  )
                )}
              </div>
            </div>
            <p className="m-0 text-[14px] font-bold">
              {places} place{places > 1 ? 's' : ''}
              {places !== placesActuelles && <span className="text-alerte"> (actuellement {placesActuelles})</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-ligne bg-white px-5 py-3">
          <Bouton onClick={() => (places === placesActuelles ? enregistrer() : setConfirmer('enregistrer'))} chargement={envoi && confirmer === null} disabled={places === 0} className="flex-1">
            Enregistrer le plan
          </Bouton>
          <Bouton variante="secondaire" onClick={fermer}>
            Annuler
          </Bouton>
        </div>
      </div>

      <Dialogue ouvert={confirmer === 'modele'} titre="Remplacer le plan ?" confirmer="Remplacer" onConfirmer={appliquerModele} onFermer={() => setConfirmer(null)}>
        Le plan actuel sera remplacé par ce modèle ({Number(placesModele) || 16} places). Vous pourrez ensuite l’ajuster case par case.
      </Dialogue>
      <Dialogue ouvert={confirmer === 'enregistrer'} titre={`Passer à ${places} places ?`} confirmer="Enregistrer" chargement={envoi} onConfirmer={enregistrer} onFermer={() => setConfirmer(null)}>
        Le véhicule passe de {placesActuelles} à {places} places. Les voyages à venir de ce véhicule sont mis à jour ; les billets déjà vendus gardent leur numéro de siège.
      </Dialogue>
      <Dialogue ouvert={confirmer === 'abandon'} titre="Abandonner les modifications ?" confirmer="Abandonner" danger onConfirmer={() => { setConfirmer(null); onFermer(); }} onFermer={() => setConfirmer(null)}>
        Le plan n’a pas été enregistré.
      </Dialogue>
      <Dialogue ouvert={!!erreur} titre="Plan non enregistré" onFermer={() => setErreur(null)}>
        {erreur}
      </Dialogue>
    </dialog>
  );
}
