import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCheck, Flag, Lock, Navigation, Phone, QrCode } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Squelette, Tonalite, Vide } from '@/components/ui';
import { Tiroir } from '@/components/ui/Tiroir';
import { Tableau } from '@/components/tableau';
import { heure, pluriel } from '@/utils/format';

/**
 * Suivi des voitures en route entre la compagnie de départ et la compagnie de
 * réception : « Départs » (mes voitures) et « Arrivées » (celles de mes partenaires).
 */

type Onglet = 'departs' | 'arrivees';

const jourHeure = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const trajetDe = (v: any) => `${v.trajet?.depart || 'Départ'} → ${v.trajet?.arrivee || 'Arrivée'}`;
const chauffeurDe = (v: any) => (v.chauffeur ? `${v.chauffeur.prenom} ${v.chauffeur.nom}`.trim() : '');

function etat(v: any): { libelle: string; tonalite: Tonalite } {
  if (v.en_retard) return { libelle: 'En retard', tonalite: 'danger' };
  if (v.statut_suivi === 'en_route') return { libelle: 'En route', tonalite: 'info' };
  if (v.statut_suivi === 'arrive') return { libelle: 'Arrivé', tonalite: 'succes' };
  if (v.statut_suivi === 'a_cloturer') return new Date(v.depart_prevu) <= new Date() ? { libelle: 'À clôturer', tonalite: 'alerte' } : { libelle: 'Départ proche', tonalite: 'neutre' };
  return { libelle: 'Attendu', tonalite: 'neutre' };
}

export default function Suivi() {
  const queryClient = useQueryClient();
  const [onglet, setOnglet] = useState<Onglet>('departs');
  const [detail, setDetail] = useState<any>(null);
  const [action, setAction] = useState<{ type: 'cloturer' | 'arrive'; v: any } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const q = useQuery({
    queryKey: ['suivi', 'liste', onglet],
    queryFn: async () => (await obtenir('/api/adminCompagnie/suivi', { onglet })).data as { voyages: any[]; compteurs: any },
    refetchInterval: 60_000,
  });
  const voyages = q.data?.voyages || [];
  const c = q.data?.compteurs;

  const sections = useMemo(() => {
    const par = (s: string) => voyages.filter((v) => v.statut_suivi === s);
    const enRoute = par('en_route').sort((a, b) => Number(b.en_retard) - Number(a.en_retard));
    return onglet === 'departs'
      ? [
          { titre: 'À clôturer', items: par('a_cloturer') },
          { titre: 'En route', items: enRoute },
          { titre: 'Arrivés (30 derniers jours)', items: par('arrive') },
        ]
      : [
          { titre: 'En route vers vous', items: enRoute },
          { titre: 'Attendus aujourd’hui et demain', items: par('attendu') },
          { titre: 'Arrivés (30 derniers jours)', items: par('arrive') },
        ];
  }, [voyages, onglet]);

  const retards = voyages.filter((v) => v.en_retard).length;
  const aCloturer = voyages.filter((v) => v.statut_suivi === 'a_cloturer' && new Date(v.depart_prevu) <= new Date()).length;

  const executer = async () => {
    if (!action) return;
    setEnvoi(true);
    try {
      const url = `/api/adminCompagnie/suivi/${action.v.id}/${action.type === 'cloturer' ? 'cloturer' : 'arrive'}`;
      const r = await api.post(url);
      const reception = action.v.compagnie_reception?.nom;
      setMessage(
        action.type === 'cloturer'
          ? { titre: 'Voiture en route', texte: reception ? `${reception} a été prévenue et a reçu la liste des voyageurs.` : 'Le voyage est maintenant « En route ».' }
          : { titre: 'Arrivée confirmée', texte: r.data?.message || 'Le voyage est marqué « Arrivé ».' }
      );
      if (detail?.id === action.v.id) setDetail(r.data?.data || null);
      queryClient.invalidateQueries({ queryKey: ['suivi'] });
      queryClient.invalidateQueries({ queryKey: ['embarquement'] });
    } catch (e) {
      setMessage({ titre: action.type === 'cloturer' ? 'Embarquement non clôturé' : 'Arrivée non confirmée', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Départs ou arrivées" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-ligne">
          {(
            [
              ['departs', `Mes départs${c?.a_cloturer ? ` (${c.a_cloturer} à clôturer)` : ''}`],
              ['arrivees', `Arrivées de mes partenaires${c?.en_route_vers_moi ? ` (${c.en_route_vers_moi})` : ''}`],
            ] as [Onglet, string][]
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              aria-pressed={onglet === cle}
              onClick={() => setOnglet(cle)}
              className={`h-10 rounded-[9px] px-4 text-[14px] font-bold ${onglet === cle ? 'bg-ocean-800 text-white' : 'text-encre-douce hover:bg-fond'}`}
            >
              {libelle}
            </button>
          ))}
        </div>
        <p className="m-0 text-[13.5px] font-semibold text-encre-douce">Actualisé automatiquement chaque minute.</p>
      </div>

      {retards > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-carte border border-danger-bord bg-danger-fond p-4 text-danger">
          <AlertTriangle className="h-6 w-6 flex-none" aria-hidden />
          <p className="m-0 text-[14px] font-bold leading-relaxed">
            {pluriel(retards, 'voiture')} en retard : l’heure d’arrivée prévue est dépassée depuis plus d’une heure. Appelez le chauffeur (numéro dans le tableau).
          </p>
        </div>
      )}
      {onglet === 'departs' && aCloturer > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-carte border border-alerte-bord bg-alerte-fond p-4 text-alerte">
          <CheckCheck className="h-6 w-6 flex-none" aria-hidden />
          <p className="m-0 text-[14px] font-bold leading-relaxed">
            L’heure de départ est passée pour {pluriel(aCloturer, 'voyage')}. Clôturez l’embarquement pour prévenir la compagnie de réception. Sans clôture, la voiture passera « En route » automatiquement une heure après le départ.
          </p>
        </div>
      )}

      {q.isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Squelette key={i} className="h-14" />)}</div>
      ) : q.isError ? (
        <Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} />
      ) : voyages.length === 0 ? (
        <Carte>
          <Vide icone={Navigation} titre={onglet === 'departs' ? 'Aucun départ à suivre' : 'Aucune voiture attendue'}>
            {onglet === 'departs'
              ? 'Vos voyages apparaissent ici 3 h avant le départ. Clôturez l’embarquement quand tout le monde est à bord : la compagnie de réception est prévenue.'
              : 'Les voitures que vos partenaires vous envoient apparaissent ici, avec la liste des voyageurs, dès leur départ.'}
          </Vide>
        </Carte>
      ) : (
        sections
          .filter((s) => s.items.length)
          .map((s) => (
            <Carte key={s.titre} className="overflow-hidden">
              <div className="flex items-baseline gap-3 border-b border-separateur px-5 py-3.5">
                <h2 className="m-0 flex-1 text-[16px] font-extrabold">{s.titre}</h2>
                <span className="text-[13px] font-bold text-encre-douce">{pluriel(s.items.length, 'voyage')}</span>
              </div>
              <Tableau
                colonnes={[
                  { titre: 'Trajet' },
                  { titre: 'Départ' },
                  { titre: 'Arrivée' },
                  { titre: 'Véhicule · chauffeur' },
                  { titre: 'Voyageurs', droite: true },
                  { titre: onglet === 'departs' ? 'Réception' : 'Envoyé par' },
                  { titre: 'État' },
                  { titre: 'Actions', cache: true },
                ]}
              >
                {s.items.map((v) => {
                  const e = etat(v);
                  const autre = onglet === 'departs' ? v.compagnie_reception : v.compagnie_depart;
                  return (
                    <tr key={v.id}>
                      <td className="font-bold">{trajetDe(v)}</td>
                      <td className="whitespace-nowrap font-semibold tabular-nums">{jourHeure(v.depart_le || v.depart_prevu)}</td>
                      <td className={`whitespace-nowrap font-semibold tabular-nums ${v.en_retard ? 'text-danger' : ''}`}>
                        {v.statut_suivi === 'arrive' ? jourHeure(v.arrivee_le) : `vers ${jourHeure(v.arrivee_prevue)}`}
                      </td>
                      <td>
                        <span className="block font-bold">{v.voiture?.matricule || '—'}</span>
                        {v.chauffeur ? (
                          <a href={`tel:${String(v.chauffeur.telephone).replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 text-[12.5px] font-bold no-underline hover:underline">
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                            {chauffeurDe(v)} · {v.chauffeur.telephone}
                          </a>
                        ) : (
                          <span className="text-[12.5px] font-semibold text-alerte">Aucun chauffeur</span>
                        )}
                      </td>
                      <td className="text-right font-bold tabular-nums">{v.nb_voyageurs}</td>
                      <td className="font-semibold">{autre?.nom || (onglet === 'departs' ? 'Aucune' : '—')}</td>
                      <td>
                        <Pastille libelle={e.libelle} tonalite={e.tonalite} />
                      </td>
                      <td>
                        <span className="flex justify-end gap-2">
                          {onglet === 'departs' && v.statut_suivi === 'a_cloturer' && (
                            <Bouton compact icone={CheckCheck} onClick={() => setAction({ type: 'cloturer', v })} disabled={!v.peut_cloturer} title={!v.peut_cloturer ? 'Possible à partir de 3 h avant le départ' : undefined}>
                              Clôturer
                            </Bouton>
                          )}
                          {v.peut_marquer_arrive && (
                            <Bouton variante="succes" compact icone={Flag} onClick={() => setAction({ type: 'arrive', v })}>
                              Arrivé
                            </Bouton>
                          )}
                          <Bouton variante="secondaire" compact onClick={() => setDetail(v)}>
                            Détail
                          </Bouton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </Tableau>
            </Carte>
          ))
      )}

      <DetailSuivi voyage={detail} onFermer={() => setDetail(null)} onAction={(type, v) => setAction({ type, v })} />

      <Dialogue
        ouvert={!!action}
        titre={action?.type === 'cloturer' ? 'Clôturer l’embarquement ?' : 'Confirmer l’arrivée ?'}
        confirmer={action?.type === 'cloturer' ? 'Clôturer et partir' : 'Arrivée confirmée'}
        chargement={envoi}
        onConfirmer={executer}
        onFermer={() => setAction(null)}
      >
        {action?.type === 'cloturer' && action.v && (
          <>
            {action.v.embarques} voyageur(s) à bord sur {action.v.confirmes} billet(s) confirmé(s).
            {action.v.confirmes - action.v.embarques > 0 && ` Les ${action.v.confirmes - action.v.embarques} non embarqué(s) ne figureront pas sur la liste.`}
            {action.v.compagnie_reception ? ` ${action.v.compagnie_reception.nom} recevra le détail du voyage et la liste des voyageurs.` : ' Aucune compagnie de réception : vous confirmerez vous-même l’arrivée.'} La voiture passera « En route » et la vente sera fermée.
          </>
        )}
        {action?.type === 'arrive' &&
          action.v &&
          (action.v.sens === 'depart'
            ? `Le voyage ${trajetDe(action.v)} sera marqué « Arrivé »${action.v.compagnie_reception ? ` et ${action.v.compagnie_reception.nom} sera prévenue` : ''}.`
            : `${action.v.compagnie_depart?.nom || 'La compagnie de départ'} sera prévenue que la voiture ${action.v.voiture?.matricule || ''} est bien arrivée.`)}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}

/** Fiche d'un voyage suivi (panneau latéral) avec la liste des voyageurs. */
function DetailSuivi({ voyage, onFermer, onAction }: { voyage: any; onFermer: () => void; onAction: (t: 'cloturer' | 'arrive', v: any) => void }) {
  const q = useQuery({
    queryKey: ['suivi', 'detail', voyage?.id],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/suivi/${voyage.id}`)).data,
    enabled: !!voyage,
  });
  const v = q.data || voyage;
  if (!voyage) return <Tiroir ouvert={false} titre="" onFermer={onFermer}>{null}</Tiroir>;
  const e = etat(v);
  const estDepart = v.sens === 'depart';
  const reception = v.compagnie_reception;
  const explication = v.en_retard
    ? `Arrivée prévue vers ${heure(v.arrivee_prevue)} dépassée. Appelez le chauffeur pour savoir où en est la voiture.`
    : v.statut_suivi === 'a_cloturer'
      ? v.peut_cloturer
        ? 'Scannez les billets puis clôturez l’embarquement quand la voiture part.'
        : 'L’embarquement pourra être clôturé 3 h avant le départ.'
      : v.statut_suivi === 'attendu'
        ? 'La voiture n’est pas encore partie. Vous recevrez une notification et la liste des voyageurs à son départ.'
        : v.statut_suivi === 'en_route'
          ? estDepart && !v.peut_marquer_arrive && reception
            ? `${reception.nom} confirmera l’arrivée. Sans confirmation de sa part, vous pourrez le faire à partir du ${jourHeure(v.arrivee_possible_des)}.`
            : 'Confirmez l’arrivée dès que la voiture est à destination.'
          : 'Voyage terminé.';

  return (
    <Tiroir
      ouvert={!!voyage}
      titre={trajetDe(v)}
      sousTitre={`Départ ${jourHeure(v.depart_le || v.depart_prevu)}`}
      onFermer={onFermer}
      pied={
        <>
          {estDepart && v.statut_suivi === 'a_cloturer' && (
            <>
              <Bouton icone={CheckCheck} onClick={() => onAction('cloturer', v)} disabled={!v.peut_cloturer}>
                Clôturer l’embarquement
              </Bouton>
              <Bouton variante="secondaire" icone={QrCode} vers={`/compagnie/embarquement?voyage=${v.id}`}>
                Embarquement
              </Bouton>
            </>
          )}
          {v.peut_marquer_arrive && (
            <Bouton variante="succes" icone={Flag} onClick={() => onAction('arrive', v)}>
              Marquer comme arrivé
            </Bouton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Carte className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap gap-2">
            <Pastille libelle={e.libelle} tonalite={e.tonalite} />
            {v.depart_auto && <Pastille libelle="Embarquement non clôturé" tonalite="alerte" point={false} />}
          </div>
          <p className={`m-0 text-[14px] font-semibold leading-relaxed ${v.en_retard ? 'text-danger' : 'text-encre-douce'}`}>{explication}</p>
        </Carte>

        <Carte className="p-0">
          <dl className="m-0 grid sm:grid-cols-2">
            {[
              ['Départ', jourHeure(v.depart_le || v.depart_prevu)],
              [v.statut_suivi === 'arrive' ? 'Arrivée' : 'Arrivée prévue', `${jourHeure(v.statut_suivi === 'arrive' ? v.arrivee_le : v.arrivee_prevue)}${v.arrivee_confirmee_par === 'depart' ? ' (confirmée par la compagnie de départ)' : !v.duree_connue && v.statut_suivi !== 'arrive' ? ' (durée du trajet non renseignée)' : ''}`],
              ['Véhicule', v.voiture ? [v.voiture.matricule, [v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')].filter(Boolean).join(' · ') : 'Non renseigné'],
              ['Chauffeur', v.chauffeur ? `${chauffeurDe(v)} · ${v.chauffeur.telephone}` : 'Aucun chauffeur affecté'],
              ['Compagnie de départ', v.compagnie_depart ? `${v.compagnie_depart.nom}${v.compagnie_depart.telephone && !estDepart ? ` · ${v.compagnie_depart.telephone}` : ''}` : '—'],
              ['Compagnie de réception', reception ? `${reception.nom}${reception.province ? ` · ${reception.province.nom}` : ''}${reception.telephone && estDepart ? ` · ${reception.telephone}` : ''}` : 'Aucune (suivi par la compagnie de départ)'],
            ].map(([l, val], i) => (
              <div key={l} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i < 4 ? 'border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                <dt className="text-[12.5px] font-bold text-encre-douce">{l}</dt>
                <dd className="m-0 text-[14px] font-bold">{val}</dd>
              </div>
            ))}
          </dl>
        </Carte>

        <div className="flex items-baseline justify-between">
          <h3 className="m-0 text-[15px] font-extrabold">Voyageurs</h3>
          <span className="text-[13px] font-bold text-encre-douce">
            {v.statut_suivi === 'a_cloturer' ? `${v.embarques} à bord / ${v.confirmes}` : pluriel(v.nb_voyageurs, 'voyageur')}
          </span>
        </div>
        {q.isLoading ? (
          <Squelette className="h-32" />
        ) : v.liste_visible === false ? (
          <Carte className="flex items-start gap-2.5 p-4">
            <Lock className="mt-0.5 h-4 w-4 flex-none text-encre-douce" aria-hidden />
            <p className="m-0 text-[14px] font-semibold text-encre-douce">
              {v.statut_suivi === 'attendu' ? 'La liste des voyageurs sera visible au départ de la voiture.' : 'Pour protéger les voyageurs, la liste n’est plus affichée 7 jours après l’arrivée.'}
            </p>
          </Carte>
        ) : (v.voyageurs || []).length === 0 ? (
          <Carte>
            <Vide icone={Navigation} titre="Aucun voyageur" />
          </Carte>
        ) : (
          <Carte className="overflow-hidden">
            {v.depart_auto && <p className="m-0 border-b border-separateur px-4 py-2.5 text-[13px] font-bold text-alerte">L’embarquement n’a pas été clôturé : cette liste reprend tous les billets confirmés.</p>}
            <Tableau colonnes={[{ titre: 'Siège' }, { titre: 'Voyageur' }, ...(v.statut_suivi === 'a_cloturer' ? [{ titre: 'État' }] : [])]}>
              {[...v.voyageurs]
                .sort((a: any, b: any) => a.siege - b.siege)
                .map((p: any, i: number) => (
                  <tr key={`${p.siege}-${i}`}>
                    <td className="w-16 font-extrabold tabular-nums">{p.siege}</td>
                    <td className="font-bold">{[p.prenom, p.nom].filter(Boolean).join(' ')}</td>
                    {v.statut_suivi === 'a_cloturer' && (
                      <td>
                        <Pastille libelle={p.embarque ? 'À bord' : 'Pas encore'} tonalite={p.embarque ? 'succes' : 'neutre'} />
                      </td>
                    )}
                  </tr>
                ))}
            </Tableau>
          </Carte>
        )}
      </div>
    </Tiroir>
  );
}
