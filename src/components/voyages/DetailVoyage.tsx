import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Eye, EyeOff, FileText, Flag, Navigation, Pause, Pencil, Play, QrCode, RotateCcw, XCircle, Printer } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useSiegesEnDirect } from '@/api/tempsReel';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Squelette, Tiroir, Vide } from '@/components/ui';
import { Tableau } from '@/components/tableau';
import { LegendePlan, PlanSieges, SiegePlan } from '@/components/sieges/PlanSieges';
import { DonneesFiche, ImpressionFiche, telechargerFichePdf } from '@/components/impression/FicheVoyageurs';
import { ariary, dateISO, heure, jourRelatif, lireDate } from '@/utils/format';
import { chauffeurDe, dateHeureCourte, estEnPause, estNonPublie, etatVoyage, libelleType, publicationPrevue, statutValeur, trajetDe } from '@/utils/voyage';

type Vue = 'plan' | 'voyageurs' | 'billets';
type Action = 'publier' | 'pause' | 'annuler' | 'reactiver' | 'reprogrammer';

/** Fiche d'un voyage (panneau latéral), avec toutes les actions de l'app mobile. */
export function DetailVoyage({ voyageId, apercu, onFermer, onModifier }: { voyageId: number | null; apercu?: any; onFermer: () => void; onModifier: (id: number) => void }) {
  const { utilisateur } = useAuth();
  const queryClient = useQueryClient();
  const [vue, setVue] = useState<Vue>('plan');
  const [sieges, setSieges] = useState<SiegePlan[]>([]);
  const [action, setAction] = useState<Action | null>(null);
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [nouvelleHeure, setNouvelleHeure] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const [fiche, setFiche] = useState<DonneesFiche | null>(null);

  const detail = useQuery({
    queryKey: ['voyage', 'detail', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/voyage/detailVoyage/${voyageId}`)).data,
    enabled: !!voyageId,
  });
  const plan = useQuery({
    queryKey: ['voyage', 'plan', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/reservations/voyages/${voyageId}/plan-sieges`)).data,
    enabled: !!voyageId,
  });
  const voyageurs = useQuery({
    queryKey: ['voyage', 'voyageurs', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/reservations/voyages/${voyageId}/voyageurs`)).data,
    enabled: !!voyageId && (vue === 'voyageurs' || vue === 'plan'),
  });
  const billets = useQuery({
    queryKey: ['voyage', 'billets', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/reservations/voyages/${voyageId}/billets`)).data,
    enabled: !!voyageId && vue === 'billets',
  });

  useEffect(() => {
    if (plan.data?.plan) setSieges(plan.data.plan);
  }, [plan.data]);
  useEffect(() => {
    if (voyageId) setVue('plan');
  }, [voyageId]);
  useSiegesEnDirect(
    voyageId,
    (code, statut) => setSieges((p) => p.map((s) => (String(s.code) === code ? { ...s, statut } : s))),
    () => plan.refetch()
  );

  const v = detail.data || apercu || {};
  const id = Number(v.id ?? voyageId);
  const statut = statutValeur(v);
  const actif = statut === 1 || statut === 2;
  const nonPublie = estNonPublie(v);
  const pause = estEnPause(v);
  const parti = v.suivi === 'en_route' || v.suivi === 'arrive';
  const prevue = publicationPrevue(v);
  const e = etatVoyage(v);
  const aujourdhui = String(v.date || '').slice(0, 10) === dateISO();
  const aBord = (voyageurs.data?.voyageurs || []).filter((x: any) => x.embarque).map((x: any) => String(x.siege));
  const revenu = (detail.data?.reservations || []).filter((r: any) => Number(r.statut) === 2).reduce((s: number, r: any) => s + Number(r.montant_total || 0), 0);

  const actualiser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['voyage'] });
    queryClient.invalidateQueries({ queryKey: ['voyages'] });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
  }, [queryClient]);

  const executer = async () => {
    if (!action) return;
    setEnvoi(true);
    try {
      const appels: Record<Action, () => Promise<any>> = {
        publier: () => api.patch(`/api/adminCompagnie/voyage/${id}/publier`),
        pause: () => api.patch(`/api/adminCompagnie/voyage/${id}/toggler-activation`),
        annuler: () => api.patch(`/api/adminCompagnie/voyage/${id}/annuler`),
        reactiver: () => api.patch(`/api/adminCompagnie/voyage/${id}/reactiver`),
        reprogrammer: () => api.post(`/api/adminCompagnie/voyage/${id}/reprogrammer`, { voyage_date: nouvelleDate, ...(nouvelleHeure ? { voyage_heure_depart: nouvelleHeure } : {}) }),
      };
      const r = await appels[action]();
      const textes: Record<Action, string> = {
        publier: 'Le voyage est publié : les clients peuvent réserver.',
        pause: pause ? 'Le voyage est rouvert aux réservations.' : 'Le voyage est en pause : il est caché de la recherche.',
        annuler: 'Le voyage est annulé. Les voyageurs sont prévenus et les billets payés passent en remboursement.',
        reactiver: 'Le voyage est réactivé. Modifiez-le pour lui donner une date à venir.',
        reprogrammer: 'Un nouveau voyage est programmé à la date choisie.',
      };
      setMessage({ titre: 'C’est fait', texte: r.data?.message && action !== 'pause' ? `${textes[action]}` : textes[action] });
      actualiser();
    } catch (err) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  };

  /** Fiche voyageurs (plan de la voiture + liste) : PDF téléchargé ou impression. */
  const [prepaFiche, setPrepaFiche] = useState(false);
  const imprimerFiche = async (mode: 'pdf' | 'imprimer') => {
    const liste = voyageurs.data?.voyageurs || [];
    if (!liste.length) return setMessage({ titre: 'Aucun voyageur', texte: 'Ce voyage ne contient aucun voyageur enregistré.' });
    setPrepaFiche(true);
    try {
      const p = plan.data || (await obtenir(`/api/adminCompagnie/reservations/voyages/${voyageId}/plan-sieges`).catch(() => null))?.data;
      const donnees: DonneesFiche = {
        compagnie: utilisateur?.compagnie?.nom || '',
        trajet: trajetDe(v),
        date: lireDate(v.date)?.toLocaleDateString('fr-FR') || '',
        heure: String(v.heure_depart || ''),
        vehicule: v.voiture ? `${v.voiture.matricule} (${[v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')})` : null,
        chauffeur: chauffeurDe(v) || p?.voiture?.chauffeur || null,
        voyageurs: liste,
        plan: p?.plan ? { codes: p.plan.map((s: any) => String(s.code)), grille: p.grille || null } : null,
      };
      if (mode === 'pdf') await telechargerFichePdf(donnees);
      else setFiche(donnees);
    } catch (err) {
      setMessage({ titre: 'Fiche indisponible', texte: messageErreur(err) });
    } finally {
      setPrepaFiche(false);
    }
  };
  const finFiche = useCallback(() => setFiche(null), []);

  const confirmations: Record<Action, { titre: string; texte: string; bouton: string; danger?: boolean }> = {
    publier: { titre: 'Publier ce voyage ?', texte: 'Il devient visible et réservable par les clients.', bouton: 'Publier maintenant' },
    pause: pause
      ? { titre: 'Rouvrir le voyage ?', texte: 'Il redevient visible pour les réservations.', bouton: 'Rouvrir' }
      : { titre: 'Mettre en pause ?', texte: 'Le voyage est caché de la recherche des clients. Les billets déjà vendus restent valables.', bouton: 'Mettre en pause' },
    annuler: { titre: 'Annuler ce voyage ?', texte: `${trajetDe(v)}, ${jourRelatif(v.date).toLowerCase()} à ${heure(v.heure_depart)}. Les voyageurs seront prévenus et les billets payés passeront en remboursement. Cette action est définitive.`, bouton: 'Annuler le voyage', danger: true },
    reactiver: { titre: 'Réactiver ce voyage ?', texte: 'Il repasse en programmé. Vous devrez ensuite le modifier pour lui donner une date à venir.', bouton: 'Réactiver' },
    reprogrammer: { titre: 'Reprogrammer le voyage', texte: 'Un nouveau voyage est créé avec le même trajet et le même véhicule, à la date choisie.', bouton: 'Reprogrammer' },
  };
  const c = action ? confirmations[action] : null;

  return (
    <Tiroir
      ouvert={!!voyageId}
      titre={trajetDe(v)}
      sousTitre={v.date ? `${jourRelatif(v.date)} à ${heure(v.heure_depart)} · ${libelleType(v.type)} · ${v.voiture?.matricule || ''}${chauffeurDe(v) ? ` · ${chauffeurDe(v)}` : ''}` : undefined}
      onFermer={onFermer}
      pied={
        <>
          {actif && !parti && (
            <Bouton variante="secondaire" icone={Pencil} onClick={() => onModifier(id)}>
              Modifier
            </Bouton>
          )}
          {nonPublie && (
            <Bouton icone={Eye} onClick={() => setAction('publier')}>
              Publier maintenant
            </Bouton>
          )}
          {actif && !nonPublie && !parti && (
            <Bouton variante="secondaire" icone={pause ? Play : Pause} onClick={() => setAction('pause')}>
              {pause ? 'Rouvrir' : 'Mettre en pause'}
            </Bouton>
          )}
          {aujourdhui && actif && !parti && (
            <Bouton variante="secondaire" icone={QrCode} vers={`/compagnie/embarquement?voyage=${id}`}>
              Embarquement
            </Bouton>
          )}
          <Bouton variante="secondaire" icone={FileText} chargement={prepaFiche} onClick={() => imprimerFiche('pdf')}>
            Fiche voyageurs (PDF)
          </Bouton>
          <Bouton variante="secondaire" icone={Printer} disabled={prepaFiche} onClick={() => imprimerFiche('imprimer')}>
            Imprimer la fiche
          </Bouton>
          {(statut === 3 || statut === 4) && (
            <Bouton variante="secondaire" icone={CalendarClock} onClick={() => setAction('reprogrammer')}>
              Reprogrammer
            </Bouton>
          )}
          {statut === 4 && (
            <Bouton variante="secondaire" icone={RotateCcw} onClick={() => setAction('reactiver')}>
              Réactiver
            </Bouton>
          )}
          {actif && !parti && (
            <Bouton variante="danger" icone={XCircle} onClick={() => setAction('annuler')} className="ml-auto">
              Annuler le voyage
            </Bouton>
          )}
        </>
      }
    >
      {detail.isLoading && !apercu ? (
        <Squelette className="h-64" />
      ) : detail.isError ? (
        <Erreur message={messageErreur(detail.error)} onReessayer={() => detail.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <Carte className="flex flex-wrap items-center gap-4 p-4">
            <Pastille libelle={e.libelle} tonalite={e.tonalite} />
            <span className="text-[14px] font-semibold text-encre-douce">
              Tarif <b className="text-encre">{ariary(v.trajet?.tarif)}</b>
            </span>
            <span className="ml-auto text-[14px] font-semibold text-encre-douce">
              Revenu encaissé <b className="text-[18px] tabular-nums text-encre">{ariary(revenu)}</b>
            </span>
          </Carte>

          {nonPublie && (
            <div className="flex items-start gap-3 rounded-carte border border-ocean-100 bg-ocean-50 p-4 text-ocean-800">
              <EyeOff className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
              <div>
                <b className="block text-[14.5px] text-ocean-950">{prevue ? `Publication programmée le ${dateHeureCourte(prevue)}` : 'Voyage planifié, pas encore publié'}</b>
                <span className="text-[13.5px] font-semibold">Les clients ne voient pas encore ce voyage. Modifiez-le si besoin, puis publiez-le au moment voulu.</span>
              </div>
            </div>
          )}

          {'reception' in v && (
            <div className="flex items-start gap-3 rounded-carte border border-ligne bg-white p-4">
              {parti ? <Navigation className="mt-0.5 h-5 w-5 flex-none text-ocean-800" aria-hidden /> : <Flag className="mt-0.5 h-5 w-5 flex-none text-ocean-800" aria-hidden />}
              <div>
                <b className="block text-[14px]">{v.suivi === 'en_route' ? 'Voiture en route' : v.suivi === 'arrive' ? 'Voiture arrivée à destination' : `Compagnie de réception : ${v.reception?.nom || 'aucune'}`}</b>
                <span className="text-[13.5px] font-semibold text-encre-douce">
                  {parti
                    ? 'Détail et confirmation d’arrivée dans le suivi des voyages.'
                    : v.reception?.nom
                      ? 'Elle recevra le véhicule, le chauffeur et la liste des voyageurs à la clôture de l’embarquement.'
                      : 'Vous confirmerez vous-même l’arrivée. Choisissez une compagnie partenaire avec « Modifier ».'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 overflow-hidden rounded-carte border border-ligne bg-white text-center">
            {[
              { l: 'Payés', n: plan.data?.sieges_reserves, c: 'text-encre' },
              { l: 'Paiement en cours', n: plan.data?.sieges_temporaires, c: 'text-alerte' },
              { l: 'Libres', n: plan.data?.sieges_disponibles, c: 'text-encre' },
            ].map((x, i) => (
              <div key={x.l} className={`py-3 ${i ? 'border-l border-separateur' : ''}`}>
                <b className={`block text-[20px] tabular-nums ${x.c}`}>{plan.isLoading ? '…' : x.n ?? 0}</b>
                <span className="text-[12.5px] font-bold text-encre-douce">{x.l}</span>
              </div>
            ))}
          </div>

          <div role="group" aria-label="Affichage" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-ligne">
            {(
              [
                ['plan', 'Plan des sièges'],
                ['voyageurs', `Voyageurs${voyageurs.data?.total ? ` (${voyageurs.data.total})` : ''}`],
                ['billets', 'Billets'],
              ] as [Vue, string][]
            ).map(([cle, l]) => (
              <button key={cle} type="button" aria-pressed={vue === cle} onClick={() => setVue(cle)} className={`h-9 flex-1 rounded-[9px] text-[13.5px] font-bold ${vue === cle ? 'bg-ocean-800 text-white' : 'text-encre-douce hover:bg-fond'}`}>
                {l}
              </button>
            ))}
          </div>

          {vue === 'plan' &&
            (plan.isLoading ? (
              <Squelette className="mx-auto h-80 w-64" />
            ) : !plan.data?.plan ? (
              <Vide icone={Navigation} titre="Plan des sièges indisponible" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <PlanSieges sieges={sieges} grille={plan.data.grille} aBord={aBord} />
                <LegendePlan />
                <span className="text-[12.5px] font-semibold text-encre-douce">Les sièges en vert sont occupés par des voyageurs déjà à bord.</span>
              </div>
            ))}

          {vue === 'voyageurs' &&
            (voyageurs.isLoading ? (
              <Squelette className="h-40" />
            ) : !(voyageurs.data?.voyageurs || []).length ? (
              <Vide icone={Navigation} titre="Aucun voyageur pour le moment" />
            ) : (
              <Carte className="overflow-hidden">
                <Tableau colonnes={[{ titre: 'Siège' }, { titre: 'Voyageur' }, { titre: 'Téléphone' }, { titre: 'Billet' }, { titre: 'État' }]}>
                  {[...voyageurs.data.voyageurs]
                    .sort((a: any, b: any) => a.siege - b.siege)
                    .map((p: any) => (
                      <tr key={`${p.reservation_id}-${p.voyageur_id}`}>
                        <td className="font-extrabold tabular-nums">{p.siege}</td>
                        <td className="font-bold">{`${p.prenom || ''} ${p.nom || ''}`.trim()}</td>
                        <td className="font-semibold tabular-nums">{p.phone || '—'}</td>
                        <td>
                          <span className="block font-semibold tabular-nums text-encre-douce">{p.reservation_numero}</span>
                          <span className="text-[12px] font-semibold text-encre-douce">{p.canal === 'guichet' ? 'Guichet' : 'En ligne'}</span>
                        </td>
                        <td>
                          <Pastille libelle={p.embarque ? 'À bord' : 'Pas encore'} tonalite={p.embarque ? 'succes' : 'neutre'} />
                        </td>
                      </tr>
                    ))}
                </Tableau>
              </Carte>
            ))}

          {vue === 'billets' &&
            (billets.isLoading ? (
              <Squelette className="h-40" />
            ) : !(billets.data?.billets || []).length ? (
              <Vide icone={Navigation} titre="Aucun billet vendu" />
            ) : (
              <Carte className="overflow-hidden">
                <Tableau colonnes={[{ titre: 'Billet' }, { titre: 'Client' }, { titre: 'Sièges' }, { titre: 'Paiement' }, { titre: 'Montant', droite: true }]}>
                  {billets.data.billets.map((b: any) => (
                    <tr key={b.res_id}>
                      <td className="whitespace-nowrap">
                        <b className="block tabular-nums">{b.res_numero}</b>
                        <span className="text-[12px] font-semibold tabular-nums text-encre-douce">{b.date_reservation}</span>
                      </td>
                      <td className="font-bold">{b.canal === 'guichet' ? 'Vente au guichet' : b.client ? `${b.client.prenom || ''} ${b.client.nom || ''}`.trim() : '—'}</td>
                      <td className="font-bold tabular-nums">{(b.sieges || []).join(', ')}</td>
                      <td className="font-semibold">{b.canal === 'guichet' ? 'Espèces' : b.type_paiement?.nom || '—'}</td>
                      <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(b.montant_total)}</td>
                    </tr>
                  ))}
                </Tableau>
              </Carte>
            ))}
        </div>
      )}

      <Dialogue
        ouvert={!!action}
        titre={c?.titre || ''}
        confirmer={c?.bouton}
        danger={c?.danger}
        chargement={envoi}
        onConfirmer={() => {
          if (action === 'reprogrammer' && !nouvelleDate) return setMessage({ titre: 'Date manquante', texte: 'Choisissez la nouvelle date du voyage.' });
          executer();
        }}
        onFermer={() => setAction(null)}
      >
        {c?.texte}
        {action === 'reprogrammer' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Champ libelle="Nouvelle date" type="date" min={dateISO()} value={nouvelleDate} onChange={(ev) => setNouvelleDate(ev.target.value)} />
            <Champ libelle="Heure (facultatif)" type="time" value={nouvelleHeure} onChange={(ev) => setNouvelleHeure(ev.target.value)} aide="Sinon, la même heure." />
          </div>
        )}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
      <ImpressionFiche fiche={fiche} onTermine={finFiche} />
    </Tiroir>
  );
}
