import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeftRight, BellRing, CheckCircle2, Download, Hourglass, Wallet } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import type { Tonalite } from '@/components/ui';
import { Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, jourRelatif, pluriel } from '@/utils/format';
import { dateFr } from '@/utils/periodes';

/**
 * Versements aux chauffeurs des voitures de particuliers : la part du
 * chauffeur, voyage par voyage, figée au départ avec la voiture et le
 * chauffeur de l'instant. « Marquer comme réglé » une fois la voiture partie
 * à 50 % ou plus, ou une fois le voyage passé.
 */

const ETATS: Record<string, { libelle: string; tonalite: Tonalite }> = {
  en_vente: { libelle: 'Pas encore parti', tonalite: 'neutre' },
  en_attente: { libelle: 'Parti sous 50 %', tonalite: 'info' },
  a_regler: { libelle: 'À régler', tonalite: 'alerte' },
  retard: { libelle: 'En retard', tonalite: 'danger' },
  regle: { libelle: 'Réglé', tonalite: 'succes' },
};
const FILTRES_ETAT: Record<string, string> = {
  en_cours: 'À régler et en cours',
  a_regler: 'Réglables maintenant',
  retard: 'En retard',
  regles: 'Réglés',
  tous: 'Tous les versements',
};

/** Pourquoi le bouton est inactif. */
function raisonInactif(v: any): string {
  if (v.etat === 'en_vente') return 'Disponible au départ de la voiture, dès 50 % de remplissage';
  if (v.etat === 'en_attente') return 'Parti sous 50 % : réglable demain, une fois la date du voyage passée';
  return '';
}

export default function Versements() {
  const queryClient = useQueryClient();
  const [etat, setEtat] = useState('en_cours');
  const [voiture, setVoiture] = useState('');
  const [chauffeur, setChauffeur] = useState('');
  const [trajet, setTrajet] = useState('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const params = { etat, voit_id: voiture || undefined, chauffeur: chauffeur || undefined, traj_id: trajet || undefined, du: du || undefined, au: au || undefined };
  const q = useInfiniteQuery({
    queryKey: ['versements', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/adminCompagnie/versements', { ...params, page: pageParam, per_page: 30 })).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
    placeholderData: (p) => p,
  });
  const premiere = q.data?.pages?.[0];
  const r = premiere?.resume;
  const t = premiere?.totaux_filtre;
  const options = premiere?.filtres;
  const lignes: any[] = useMemo(() => (q.data?.pages || []).flatMap((p: any) => p?.versements || []), [q.data]);
  const filtresActifs = !!(voiture || chauffeur || trajet || du || au);

  const exporter = async () => {
    setExportEnCours(true);
    try {
      const d = (await obtenir('/api/adminCompagnie/versements', { ...params, tout: 1 })).data;
      const { exporterVersements } = await import('@/utils/excelVersements');
      await exporterVersements(d.versements || [], [FILTRES_ETAT[etat], voiture && options?.voitures?.find((v: any) => String(v.id) === voiture)?.matricule, chauffeur, trajet && options?.trajets?.find((x: any) => String(x.id) === trajet)?.libelle, du && `du ${dateFr(du)}`, au && `au ${dateFr(au)}`].filter(Boolean).join(' · '));
    } catch (e) {
      setMessage({ titre: 'Téléchargement impossible', texte: messageErreur(e) });
    } finally {
      setExportEnCours(false);
    }
  };

  if (q.isError && !premiere) return <div className="p-4 sm:px-7 sm:py-6"><Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} /></div>;

  return (
    <div className="flex flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Wallet} libelle="À verser aux chauffeurs" valeur={ariary(r?.a_regler, false)} unite="Ar" detail={r ? `${pluriel(r.nb_a_regler, 'voyage')} réglable${r.nb_a_regler > 1 ? 's' : ''} · ${pluriel(r.nb_en_vente, 'voyage')} pas encore parti${r.nb_en_vente > 1 ? 's' : ''}` : undefined} chargement={!r} />
        <Kpi icone={AlertTriangle} ton={r?.nb_retard ? 'danger' : 'neutre'} libelle="En retard" valeur={r ? pluriel(r.nb_retard, 'voyage') : '…'} detail={r?.nb_retard ? `${ariary(r.retard)} : voyage passé, pas encore réglé` : 'Aucun versement en retard'} chargement={!r} />
        <Kpi icone={CheckCircle2} ton="succes" libelle="Réglé ce mois-ci" valeur={ariary(r?.regles_mois, false)} unite="Ar" detail={r ? `${pluriel(r.nb_regles_mois, 'voyage')} · part compagnie ${ariary(r.part_compagnie_mois)}` : undefined} chargement={!r} />
      </section>

      <Carte className="flex flex-wrap items-end gap-3.5 p-4">
        <Selecteur libelle="Afficher" value={etat} onChange={(e) => setEtat(e.target.value)} className="min-w-[200px] flex-1">
          {Object.entries(FILTRES_ETAT).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Selecteur>
        <Selecteur libelle="Voiture (matricule)" value={voiture} onChange={(e) => setVoiture(e.target.value)} className="min-w-[170px] flex-1">
          <option value="">Toutes les voitures</option>
          {(options?.voitures || []).map((v: any) => (
            <option key={v.id} value={v.id}>{v.matricule}</option>
          ))}
        </Selecteur>
        <Selecteur libelle="Chauffeur" value={chauffeur} onChange={(e) => setChauffeur(e.target.value)} className="min-w-[180px] flex-1">
          <option value="">Tous les chauffeurs</option>
          {(options?.chauffeurs || []).map((n: string) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Selecteur>
        <Selecteur libelle="Trajet" value={trajet} onChange={(e) => setTrajet(e.target.value)} className="min-w-[200px] flex-1">
          <option value="">Tous les trajets</option>
          {(options?.trajets || []).map((x: any) => (
            <option key={x.id} value={x.id}>{x.libelle}</option>
          ))}
        </Selecteur>
        <label className="flex w-[165px] flex-none flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Voyages du</span>
          <input type="date" value={du} max={au || undefined} onChange={(e) => setDu(e.target.value)} className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
        </label>
        <label className="flex w-[165px] flex-none flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">au</span>
          <input type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
        </label>
        <div className="flex gap-2">
          {filtresActifs && (
            <Bouton variante="secondaire" onClick={() => { setVoiture(''); setChauffeur(''); setTrajet(''); setDu(''); setAu(''); }}>
              Effacer les filtres
            </Bouton>
          )}
          <Bouton variante="secondaire" icone={Download} chargement={exportEnCours} disabled={!lignes.length} onClick={exporter}>
            Excel
          </Bouton>
        </div>
      </Carte>

      <Panneau
        titre="Voyages des voitures de particuliers"
        sousTitre="Le bouton s’active une fois la voiture partie avec au moins 50 % de remplissage, ou une fois la date du voyage passée"
        droite={t && <span className="text-[13px] font-bold text-encre-douce">{pluriel(t.nb, 'voyage')} · chauffeurs {ariary(t.part_chauffeur)}</span>}
        sansMarge
      >
        {!premiere ? (
          <div className="p-5"><Squelette className="h-40" /></div>
        ) : lignes.length === 0 ? (
          <Vide icone={ArrowLeftRight} titre="Aucun versement">
            {filtresActifs || etat !== 'tous' ? 'Aucun versement ne correspond à ces filtres.' : 'Les versements apparaissent pour les voitures déclarées « à un particulier » dans « Véhicules ».'}
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Départ' }, { titre: 'Trajet' }, { titre: 'Voiture · chauffeur' }, { titre: 'Remplissage' }, { titre: 'Part compagnie', droite: true }, { titre: 'Part chauffeur', droite: true }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {lignes.map((v) => (
              <tr key={v.id}>
                <td className="whitespace-nowrap">
                  <b className="block tabular-nums">{v.heure}</b>
                  <span className="text-[12px] font-semibold text-encre-douce">{jourRelatif(v.date)}</span>
                </td>
                <td className="font-bold">{v.trajet.libelle}</td>
                <td>
                  <b className="block tabular-nums">{v.voiture.matricule}</b>
                  <span className="text-[12px] font-semibold text-encre-douce">{v.chauffeur.nom || 'Sans chauffeur'} · compagnie {String(v.taux_compagnie).replace('.', ',')} %</span>
                </td>
                <td className="min-w-[130px]">
                  <span className="flex items-center gap-2">
                    <span className="relative block h-2 w-[80px] overflow-hidden rounded-full bg-ocean-50">
                      <span className={`block h-full rounded-full ${v.remplissage >= 50 ? 'bg-succes-vif' : 'bg-alerte-vif'}`} style={{ width: `${Math.min(v.remplissage, 100)}%` }} />
                      <span className="absolute inset-y-0 left-1/2 w-0.5 bg-ocean-950/40" />
                    </span>
                    <b className="tabular-nums">{v.nb_sieges}/{v.nb_places}</b>
                  </span>
                </td>
                <td className="whitespace-nowrap text-right tabular-nums text-encre-douce">{ariary(v.part_compagnie)}</td>
                <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(v.part_chauffeur)}</td>
                <td>
                  <Pastille libelle={ETATS[v.etat].libelle} tonalite={ETATS[v.etat].tonalite} />
                  <span className="mt-0.5 block text-[12px] font-semibold text-encre-douce">
                    {v.etat === 'regle' ? `Le ${dateFr(v.regle_le)} à ${String(v.regle_le).slice(11, 16)} par ${v.regle_par || '—'}` : v.rappel_le && v.etat === 'retard' ? 'Rappel envoyé' : ''}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right">
                  {v.etat === 'regle' ? (
                    <Bouton compact variante="secondaire" onClick={() => setDetail(v)}>Voir</Bouton>
                  ) : (
                    <span title={raisonInactif(v)}>
                      <Bouton compact variante={v.reglable ? 'succes' : 'secondaire'} disabled={!v.reglable} onClick={() => setDetail(v)}>
                        Marquer comme réglé
                      </Bouton>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Tableau>
        )}
        {q.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => q.fetchNextPage()} chargement={q.isFetchingNextPage}>Afficher plus de voyages</Bouton>
          </div>
        )}
      </Panneau>
      <p className="m-0 text-[12.5px] font-semibold text-encre-douce">
        La voiture, le chauffeur et le pourcentage sont enregistrés au départ de chaque voyage : l’historique ne change pas si la voiture change de chauffeur ensuite. Les voitures de la compagnie n’ont pas de versement.
      </p>

      <PanneauVersement
        versement={detail}
        onFermer={() => setDetail(null)}
        onRegle={(msg) => {
          setDetail(null);
          queryClient.invalidateQueries({ queryKey: ['versements'] });
          setMessage({ titre: 'Versement réglé', texte: msg });
        }}
      />
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}

function PanneauVersement({ versement: v, onFermer, onRegle }: { versement: any; onFermer: () => void; onRegle: (message: string) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    setConfirmer(false);
    setErreur('');
  }, [v]);

  const regler = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      const r = await api.post(`/api/adminCompagnie/versements/${v.id}/regler`);
      onRegle(r.data?.message || 'Le versement est réglé.');
    } catch (e) {
      setErreur(messageErreur(e));
      setConfirmer(false);
    } finally {
      setEnvoi(false);
    }
  };

  const enLigne = v ? v.commission_fandrio / 0.05 : 0;
  const aPartager = v ? v.montant_ventes - v.commission_fandrio : 0;
  const ligne = 'flex justify-between gap-3 border-b border-dashed border-ligne py-2.5 text-[14px]';

  return (
    <Tiroir
      ouvert={!!v}
      titre="Versement du voyage"
      sousTitre={v ? `${v.trajet.libelle} · ${dateFr(v.date)} ${v.heure} · ${v.voiture.matricule}` : undefined}
      onFermer={onFermer}
      pied={
        v && (
          <>
            <Bouton variante="secondaire" onClick={onFermer}>Fermer</Bouton>
            {v.etat !== 'regle' && (
              <Bouton variante="succes" icone={CheckCircle2} className="ml-auto" disabled={!v.reglable} onClick={() => setConfirmer(true)}>
                Marquer comme réglé
              </Bouton>
            )}
          </>
        )
      }
    >
      {v && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ocean-50 px-4 py-3">
            <span className="min-w-0 flex-1">
              <b className="block text-[14.5px]">{v.chauffeur.nom || 'Sans chauffeur'}</b>
              <span className="text-[12.5px] font-semibold tabular-nums text-encre-douce">{[v.chauffeur.telephone, `voiture ${v.voiture.matricule}`].filter(Boolean).join(' · ')}</span>
            </span>
            <Pastille libelle={`Compagnie : ${String(v.taux_compagnie).replace('.', ',')} %`} tonalite="marine" />
          </div>

          <div>
            <div className={ligne}><span>Sièges vendus</span><b className="tabular-nums">{v.nb_sieges} sur {v.nb_places} · {v.remplissage} %</b></div>
            <div className={ligne}><span>Ventes</span><b className="tabular-nums">{ariary(v.montant_ventes)}</b></div>
            <div className={ligne}><span>Commission FANDRIO (5 % des {ariary(enLigne)} vendus en ligne)</span><b className="tabular-nums">− {ariary(v.commission_fandrio)}</b></div>
            <div className={ligne}><span>À partager</span><b className="tabular-nums">{ariary(aPartager)}</b></div>
            <div className={ligne}><span>Part de la compagnie ({String(v.taux_compagnie).replace('.', ',')} %)</span><b className="tabular-nums">{ariary(v.part_compagnie)}</b></div>
          </div>
          <div className="flex items-baseline justify-between rounded-2xl bg-ocean-950 px-4 py-3.5 text-white">
            <span className="text-[14px] font-bold">{v.etat === 'regle' ? 'Versé au chauffeur' : 'À verser au chauffeur'}</span>
            <b className="text-[24px] tabular-nums">{ariary(v.part_chauffeur)}</b>
          </div>

          {v.etat === 'regle' ? (
            <p className="m-0 flex items-start gap-2 rounded-xl bg-succes-fond px-3.5 py-3 text-[13.5px] font-bold text-succes">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
              Réglé le {dateFr(v.regle_le)} à {String(v.regle_le).slice(11, 16)} par {v.regle_par || '—'}.
            </p>
          ) : v.etat === 'retard' ? (
            <p className="m-0 flex items-start gap-2 rounded-xl border border-danger-bord bg-danger-fond px-3.5 py-3 text-[13.5px] font-bold text-danger">
              <BellRing className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
              La date du voyage est passée{v.rappel_le ? ' : un rappel a été envoyé' : ''}.{v.remplissage < 50 ? ` La voiture est partie à ${v.remplissage} %.` : ''}
            </p>
          ) : !v.reglable ? (
            <p className="m-0 flex items-start gap-2 rounded-xl bg-fond px-3.5 py-3 text-[13.5px] font-bold text-encre-douce">
              <Hourglass className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
              {raisonInactif(v)}. Les montants peuvent encore changer tant que la voiture n’est pas partie.
            </p>
          ) : null}
          {v.fige_le && <p className="m-0 text-[12.5px] font-semibold text-encre-douce">Montants, voiture et chauffeur enregistrés au départ, le {dateFr(v.fige_le)} à {String(v.fige_le).slice(11, 16)}.</p>}
          {erreur && <p role="alert" className="m-0 rounded-xl bg-danger-fond px-3 py-2 text-[13.5px] font-bold text-danger">{erreur}</p>}
        </div>
      )}
      <Dialogue ouvert={confirmer} titre="Marquer ce versement comme réglé ?" confirmer="Oui, c’est réglé" chargement={envoi} onConfirmer={regler} onFermer={() => setConfirmer(false)}>
        {v && `Vous confirmez que ${v.chauffeur.nom || 'le chauffeur'} a bien reçu ${ariary(v.part_chauffeur)} pour ce voyage. Cette action est enregistrée à votre nom et ne peut pas être annulée.`}
      </Dialogue>
    </Tiroir>
  );
}

