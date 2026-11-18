import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BellRing, CalendarDays, Plus, Search } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir, useCompteursCompagnie } from '@/api/requetes';
import { Bouton, Carte, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Barre, Tableau } from '@/components/tableau';
import { DetailVoyage } from '@/components/voyages/DetailVoyage';
import { FormulaireVoyage } from '@/components/voyages/FormulaireVoyage';
import { dateISO, heure, jourRelatif, lireDate, pluriel } from '@/utils/format';
import { chauffeurDe, dateHeureCourte, estNonPublie, etatVoyage, libelleType, publicationPrevue, remplissage, statutValeur, trajetDe } from '@/utils/voyage';

/**
 * Planning des voyages (même contenu que l'app mobile) :
 * « À venir » (publiés ou non) et « Passés » (terminés ou annulés), filtres,
 * rappels de publication, planification sur calendrier.
 */

type Vue = 'avenir' | 'passes';

export default function Planning() {
  const [vue, setVue] = useState<Vue>('avenir');
  const [periode, setPeriode] = useState('14');
  const [publication, setPublication] = useState('tous');
  const [issue, setIssue] = useState('tous');
  const [trajet, setTrajet] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [chauffeur, setChauffeur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; id: number | null }>({ ouvert: false, id: null });
  const { planning: rappels } = useCompteursCompagnie();
  const passes = vue === 'passes';

  const q = useQuery({
    queryKey: ['planning', vue, periode],
    queryFn: async () => {
      const auj = new Date();
      const borne = new Date();
      if (periode !== 'tout') borne.setDate(borne.getDate() + (passes ? -1 : 1) * (Number(periode) - 1));
      const params = passes
        ? { passes: 1, date_fin: dateISO(auj), ...(periode !== 'tout' ? { date_debut: dateISO(borne) } : {}), per_page: 200, sort_field: 'voyage_date', sort_direction: 'desc' }
        : { a_venir: 1, date_debut: dateISO(auj), ...(periode !== 'tout' ? { date_fin: dateISO(borne) } : {}), per_page: 200, sort_field: 'voyage_date', sort_direction: 'asc' };
      return ((await obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', params)).data?.voyages || []) as any[];
    },
    refetchInterval: 60_000,
  });
  const voyages = q.data || [];

  // Choix proposés par les filtres (d'après les voyages chargés)
  const choix = useMemo(() => {
    const t = new Map<string, string>();
    const ve = new Map<string, string>();
    const ch = new Map<string, string>();
    voyages.forEach((v) => {
      if (v.trajet?.id) t.set(String(v.trajet.id), trajetDe(v));
      if (v.voiture?.id) ve.set(String(v.voiture.id), `${v.voiture.matricule} · ${[v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')}`);
      if (v.voiture?.chauffeur?.id) ch.set(String(v.voiture.chauffeur.id), chauffeurDe(v));
    });
    const tri = (m: Map<string, string>) => [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    return { trajets: tri(t), vehicules: tri(ve), chauffeurs: tri(ch) };
  }, [voyages]);

  const filtres = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return voyages
      .filter((v) => {
        if (!passes && publication === 'publies' && estNonPublie(v)) return false;
        if (!passes && publication === 'non_publies' && !estNonPublie(v)) return false;
        if (passes && issue === 'termines' && statutValeur(v) !== 3) return false;
        if (passes && issue === 'annules' && statutValeur(v) !== 4) return false;
        if (trajet && String(v.trajet?.id) !== trajet) return false;
        if (vehicule && String(v.voiture?.id) !== vehicule) return false;
        if (chauffeur && String(v.voiture?.chauffeur?.id) !== chauffeur) return false;
        if (r && ![trajetDe(v), v.voiture?.matricule, v.voiture?.marque, chauffeurDe(v)].join(' ').toLowerCase().includes(r)) return false;
        return true;
      })
      .sort((a, b) => (passes ? -1 : 1) * `${a.date} ${a.heure_depart}`.localeCompare(`${b.date} ${b.heure_depart}`));
  }, [voyages, passes, publication, issue, trajet, vehicule, chauffeur, recherche]);

  const jours = useMemo(() => {
    const g: { date: string; items: any[] }[] = [];
    filtres.forEach((v) => {
      const d = String(v.date).slice(0, 10);
      const dernier = g[g.length - 1];
      if (dernier?.date === d) dernier.items.push(v);
      else g.push({ date: d, items: [v] });
    });
    return g;
  }, [filtres]);

  const filtreActif = !!(trajet || vehicule || chauffeur || recherche.trim() || publication !== 'tous' || issue !== 'tous');
  const effacer = () => {
    setTrajet('');
    setVehicule('');
    setChauffeur('');
    setRecherche('');
    setPublication('tous');
    setIssue('tous');
  };
  const changerVue = (v: Vue) => {
    setVue(v);
    effacer();
  };

  const nonPublies = filtres.filter(estNonPublie).length;
  const sansChauffeur = filtres.filter((v) => !v.voiture?.chauffeur).length;
  const annules = filtres.filter((v) => statutValeur(v) === 4).length;
  const billets = filtres.reduce((s, v) => s + (statutValeur(v) === 3 ? Number(v.places_reservees) || 0 : 0), 0);
  const resume = passes
    ? [
        { l: 'Voyages', v: filtres.length },
        { l: 'Terminés', v: filtres.length - annules },
        { l: 'Annulés', v: annules, alerte: annules > 0 },
        { l: 'Billets vendus', v: billets },
      ]
    : [
        { l: 'Voyages', v: filtres.length },
        { l: 'Publiés', v: filtres.length - nonPublies },
        { l: 'Non publiés', v: nonPublies },
        { l: 'Sans chauffeur', v: sansChauffeur, alerte: sansChauffeur > 0 },
      ];
  const r = rappels.data;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Voyages à venir ou passés" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-ligne">
          {(
            [
              ['avenir', 'À venir'],
              ['passes', 'Passés'],
            ] as [Vue, string][]
          ).map(([cle, l]) => (
            <button key={cle} type="button" aria-pressed={vue === cle} onClick={() => changerVue(cle)} className={`h-10 rounded-[9px] px-5 text-[14px] font-bold ${vue === cle ? 'bg-ocean-800 text-white' : 'text-encre-douce hover:bg-fond'}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="m-0 flex-1 text-[13.5px] font-semibold text-encre-douce">{passes ? 'Voyages terminés ou annulés.' : 'Voyages programmés, publiés ou non, avec leur véhicule et leur chauffeur.'}</p>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, id: null })}>
          Planifier des voyages
        </Bouton>
      </div>

      {/* Rappels de publication */}
      {!passes && r && r.total > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-carte border border-alerte-bord bg-alerte-fond p-4">
          <b className="flex items-center gap-2 text-[15px] text-alerte">
            <BellRing className="h-5 w-5" aria-hidden />
            {pluriel(r.total, 'voyage')} en attente de publication
          </b>
          {r.bientot_publies.length > 0 && (
            <div>
              <p className="m-0 mb-1 text-[13px] font-semibold text-encre-douce">Publication automatique dans les {r.jours} prochains jours. Vérifiez la date, l’heure, le véhicule et le chauffeur :</p>
              {r.bientot_publies.map((v: any) => (
                <LigneRappel key={v.id} v={v} detail={v.publication_prevue ? `Sera publié le ${dateHeureCourte(new Date(v.publication_prevue))}` : 'Publication programmée'} onOuvrir={() => setDetail(v)} />
              ))}
            </div>
          )}
          {r.a_publier.length > 0 && (
            <div>
              <p className="m-0 mb-1 text-[13px] font-semibold text-encre-douce">Départ dans les {r.jours} prochains jours, sans date de publication. Publiez-les pour que les clients puissent réserver :</p>
              {r.a_publier.map((v: any) => (
                <LigneRappel key={v.id} v={v} detail="Pas encore publié : à publier" onOuvrir={() => setDetail(v)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-2 overflow-hidden rounded-carte border border-ligne bg-white text-center sm:grid-cols-4">
        {resume.map((x, i) => (
          <div key={x.l} className={`py-3 ${i ? 'border-l border-separateur' : ''}`}>
            <b className={`block text-[22px] tabular-nums ${x.alerte ? 'text-alerte' : 'text-encre'}`}>{q.isLoading ? '…' : x.v}</b>
            <span className="text-[13px] font-bold text-encre-douce">{x.l}</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <Carte className="grid gap-3 p-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <Selecteur libelle="Période" value={periode} onChange={(e) => setPeriode(e.target.value)}>
          {['7', '14', '30'].map((p) => (
            <option key={p} value={p}>
              {passes ? `${p} derniers jours` : `${p} prochains jours`}
            </option>
          ))}
          <option value="tout">Toutes les dates</option>
        </Selecteur>
        {passes ? (
          <Selecteur libelle="Issue" value={issue} onChange={(e) => setIssue(e.target.value)}>
            <option value="tous">Terminés et annulés</option>
            <option value="termines">Terminés</option>
            <option value="annules">Annulés</option>
          </Selecteur>
        ) : (
          <Selecteur libelle="Publication" value={publication} onChange={(e) => setPublication(e.target.value)}>
            <option value="tous">Publiés et non publiés</option>
            <option value="publies">Publiés</option>
            <option value="non_publies">Non publiés</option>
          </Selecteur>
        )}
        <Selecteur libelle="Trajet" value={trajet} onChange={(e) => setTrajet(e.target.value)}>
          <option value="">Tous les trajets</option>
          {choix.trajets.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </Selecteur>
        <Selecteur libelle="Véhicule" value={vehicule} onChange={(e) => setVehicule(e.target.value)}>
          <option value="">Tous les véhicules</option>
          {choix.vehicules.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </Selecteur>
        <Selecteur libelle="Chauffeur" value={chauffeur} onChange={(e) => setChauffeur(e.target.value)}>
          <option value="">Tous les chauffeurs</option>
          {choix.chauffeurs.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </Selecteur>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Trajet, matricule, chauffeur…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        {filtreActif && (
          <div className="flex items-end">
            <Bouton variante="lien" onClick={effacer}>
              Effacer les filtres
            </Bouton>
          </div>
        )}
      </Carte>

      {/* Liste par jour */}
      {q.isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Squelette key={i} className="h-24" />)}</div>
      ) : q.isError ? (
        <Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} />
      ) : jours.length === 0 ? (
        <Carte>
          <Vide icone={CalendarDays} titre={filtreActif ? 'Aucun voyage ne correspond' : passes ? 'Aucun voyage passé sur cette période' : 'Aucun voyage programmé sur cette période'}>
            {filtreActif ? (
              <Bouton variante="lien" onClick={effacer}>
                Effacer les filtres
              </Bouton>
            ) : passes ? (
              'Choisissez une période plus longue.'
            ) : (
              <Bouton compact icone={Plus} onClick={() => setFormulaire({ ouvert: true, id: null })}>
                Planifier des voyages
              </Bouton>
            )}
          </Vide>
        </Carte>
      ) : (
        jours.map((j) => (
          <Carte key={j.date} className="overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-separateur px-5 py-3">
              <h2 className="m-0 text-[15px] font-extrabold capitalize">
                {jourRelatif(j.date)} {lireDate(j.date) && jourRelatif(j.date).length < 12 ? `· ${lireDate(j.date)!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
              </h2>
              <span className="text-[13px] font-bold text-encre-douce">{pluriel(j.items.length, 'voyage')}</span>
            </div>
            <Tableau colonnes={[{ titre: 'Heure' }, { titre: 'Trajet' }, { titre: 'Véhicule' }, { titre: 'Chauffeur' }, { titre: 'Places vendues' }, { titre: 'État' }]}>
              {j.items.map((v) => {
                const rem = remplissage(v);
                const e = etatVoyage(v);
                const prevue = publicationPrevue(v);
                return (
                  <tr key={v.id} onClick={() => setDetail(v)} className="cursor-pointer">
                    <td className="whitespace-nowrap">
                      <b className="block text-[15px] tabular-nums">{heure(v.heure_depart)}</b>
                      <span className="text-[12px] font-semibold text-encre-douce">{libelleType(v.type)}</span>
                    </td>
                    <td>
                      <button type="button" onClick={() => setDetail(v)} className="text-left font-bold text-encre hover:underline">
                        {trajetDe(v)}
                      </button>
                    </td>
                    <td className="font-semibold">{v.voiture?.matricule || '—'}</td>
                    <td className={`font-semibold ${chauffeurDe(v) ? '' : 'text-alerte'}`}>{chauffeurDe(v) || 'Aucun chauffeur'}</td>
                    <td className="min-w-[150px]">
                      <span className="flex items-center gap-2.5">
                        <Barre pct={rem.pct} ton={rem.complet ? 'succes' : 'ocean'} />
                        <b className="min-w-[48px] text-right tabular-nums">
                          {rem.pris}/{rem.total}
                        </b>
                      </span>
                    </td>
                    <td>
                      <Pastille libelle={e.libelle} tonalite={e.tonalite} />
                      {prevue && <span className="mt-1 block text-[12px] font-bold text-ocean-800">le {dateHeureCourte(prevue)}</span>}
                    </td>
                  </tr>
                );
              })}
            </Tableau>
          </Carte>
        ))
      )}
      {!q.isLoading && voyages.length >= 200 && <p className="m-0 text-center text-[13px] font-semibold text-encre-douce">Seuls les 200 voyages les plus proches sont affichés : réduisez la période pour voir le détail.</p>}

      <DetailVoyage voyageId={detail ? Number(detail.id) : null} apercu={detail} onFermer={() => setDetail(null)} onModifier={(id) => setFormulaire({ ouvert: true, id })} />
      <FormulaireVoyage ouvert={formulaire.ouvert} voyageId={formulaire.id} onFermer={() => setFormulaire({ ouvert: false, id: null })} />
    </div>
  );
}

function LigneRappel({ v, detail, onOuvrir }: { v: any; detail: string; onOuvrir: () => void }) {
  return (
    <button type="button" onClick={onOuvrir} className="flex w-full items-center gap-3 border-t border-alerte-bord/60 py-2 text-left first:border-t-0 hover:underline">
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14px] text-encre">
          {trajetDe(v)} · {jourRelatif(v.date)} {heure(v.heure_depart)}
        </b>
        <span className="text-[13px] font-bold text-alerte">{detail}</span>
      </span>
      <span className="text-[13px] font-extrabold text-alerte">Ouvrir</span>
    </button>
  );
}
