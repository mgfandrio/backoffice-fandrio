import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  Banknote,
  Bus,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  Gauge,
  Navigation,
  QrCode,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { obtenir, useCompteursCompagnie } from '@/api/requetes';
import { messageErreur } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Erreur, Pastille, Squelette, Tonalite, Vide } from '@/components/ui';
import { Barre, Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, ariaryCourt, dateISO, heure, jourLong, jourRelatif, lireDate, nombre, nomMois, pluriel } from '@/utils/format';

/** Tableau de bord de l'admin compagnie. */

const PALETTE = ['#0B4F8A', '#2E8FE0', '#E4A13A', '#16A05D', '#5FB0F2', '#7A8AA0'];

interface Etat {
  libelle: string;
  tonalite: Tonalite;
  action: string;
  vers: string;
}

function etatDepart(v: any): Etat {
  const d = lireDate(v.date);
  const [h, m] = String(v.heure_depart || '00:00').split(':').map(Number);
  if (d) d.setHours(h || 0, m || 0);
  const proche = !!d && d.getTime() - Date.now() < 3 * 3600 * 1000;
  if (v.suivi === 'en_route') return { libelle: 'En route', tonalite: 'marine', action: 'Suivre', vers: '/compagnie/suivi' };
  if (v.suivi === 'arrive') return { libelle: 'Arrivé', tonalite: 'succes', action: 'Suivre', vers: '/compagnie/suivi' };
  if (Number(v.statut) === 4) return { libelle: 'Annulé', tonalite: 'danger', action: 'Voir', vers: '/compagnie/voyages' };
  if (Number(v.statut) === 3) return { libelle: 'Parti', tonalite: 'neutre', action: 'Suivre', vers: '/compagnie/suivi' };
  if (v.publie === false) return { libelle: 'Non publié', tonalite: 'neutre', action: 'Voir', vers: '/compagnie/planning' };
  if (proche) return { libelle: 'Embarquement', tonalite: 'alerte', action: 'Embarquer', vers: `/compagnie/embarquement?voyage=${v.id}` };
  if (!v.is_active) return { libelle: 'En pause', tonalite: 'alerte', action: 'Voir', vers: '/compagnie/voyages' };
  if (Number(v.places_reservees) >= Number(v.places_disponibles)) return { libelle: 'Complet', tonalite: 'succes', action: 'Voir', vers: '/compagnie/voyages' };
  return { libelle: 'En vente', tonalite: 'info', action: 'Vendre', vers: '/compagnie/guichet' };
}

/** Infobulle des graphiques. */
function Bulle({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-xs font-bold text-encre-douce">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="m-0 text-sm font-extrabold tabular-nums text-encre">
          {format ? format(p.value, p) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AccueilCompagnie() {
  const { utilisateur } = useAuth();
  const auj = new Date();
  const dans7 = new Date();
  dans7.setDate(dans7.getDate() + 6);
  const { planning } = useCompteursCompagnie();

  const finances = useQuery({
    queryKey: ['tableau-bord-financier'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/reservations/tableau-bord-financier')).data,
    refetchInterval: 60_000,
  });
  const exploitation = useQuery({
    queryKey: ['tableau-bord-exploitation'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/tableau-bord')).data,
    refetchInterval: 5 * 60_000,
  });
  const departs = useQuery({
    queryKey: ['voyages', 'semaine', dateISO(auj)],
    queryFn: async () =>
      ((await obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', { date_debut: dateISO(auj), date_fin: dateISO(dans7), per_page: 100, sort_field: 'voyage_date' })).data?.voyages || []) as any[],
    refetchInterval: 60_000,
  });
  const suiviDeparts = useQuery({
    queryKey: ['suivi', 'departs'],
    queryFn: async () => ((await obtenir('/api/adminCompagnie/suivi', { onglet: 'departs' })).data?.voyages || []) as any[],
    refetchInterval: 60_000,
  });
  const arrivees = useQuery({
    queryKey: ['suivi', 'arrivees'],
    queryFn: async () => ((await obtenir('/api/adminCompagnie/suivi', { onglet: 'arrivees' })).data?.voyages || []) as any[],
    refetchInterval: 60_000,
  });

  const f = finances.data;
  const e = exploitation.data;
  const enRoute = (suiviDeparts.data || []).filter((v) => v.statut_suivi === 'en_route');
  const enRetard = (suiviDeparts.data || []).filter((v) => v.en_retard);
  const aCloturer = (suiviDeparts.data || []).filter((v) => v.statut_suivi === 'a_cloturer' && new Date(v.depart_prevu) <= new Date());
  const attendues = (arrivees.data || []).filter((v) => v.statut_suivi !== 'arrive');
  const rappels = planning.data?.total || 0;

  // Prochains départs, triés par date puis heure
  const prochains = useMemo(
    () =>
      [...(departs.data || [])]
        .filter((v) => Number(v.statut) !== 4)
        .sort((a, b) => `${a.date} ${a.heure_depart}`.localeCompare(`${b.date} ${b.heure_depart}`))
        .slice(0, 8),
    [departs.data]
  );
  const departsDuJour = (departs.data || []).filter((v) => v.date === dateISO(auj) && Number(v.statut) !== 4).length;

  // Chiffre d'affaires des 30 derniers jours (jours sans vente à 0)
  const serie30 = useMemo(() => {
    const parJour = new Map<string, number>((f?.evolution_journaliere || []).map((j: any) => [String(j.jour).slice(0, 10), Number(j.ca) || 0]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const cle = dateISO(d);
      return { jour: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), libelle: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), ca: parJour.get(cle) || 0 };
    });
  }, [f?.evolution_journaliere]);
  const total30 = serie30.reduce((s, j) => s + j.ca, 0);

  const paiements: any[] = (f?.repartition_paiement || []).filter((p: any) => Number(p.montant) > 0);
  const totalPaiements = paiements.reduce((s, p) => s + Number(p.montant), 0);
  const recentes: any[] = f?.reservations_recentes || [];

  return (
    <div className="flex flex-col gap-5 p-4 sm:px-7 sm:py-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold text-encre">Bonjour {utilisateur?.prenom}</h2>
          <p className="m-0 mt-0.5 text-[14px] font-semibold text-encre-douce">
            {jourLong()} · {departs.isLoading ? '…' : pluriel(departsDuJour, 'départ')} aujourd’hui · {utilisateur?.compagnie?.nom}
          </p>
        </div>
        <Bouton variante="secondaire" icone={QrCode} vers="/compagnie/embarquement">
          Embarquement
        </Bouton>
      </div>

      {/* À faire maintenant */}
      {(aCloturer.length > 0 || enRetard.length > 0 || rappels > 0) && (
        <section aria-label="À faire maintenant" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {aCloturer.length > 0 && (
            <AFaire
              ton="alerte"
              icone={CheckCheck}
              titre={aCloturer.length > 1 ? `${aCloturer.length} embarquements à clôturer` : 'Embarquement à clôturer'}
              detail={aCloturer.map((v) => `${v.trajet.depart} → ${v.trajet.arrivee} · ${v.heure_depart}`).join(' · ')}
              lien="/compagnie/suivi"
              action="Clôturer"
            />
          )}
          {enRetard.length > 0 && (
            <AFaire
              ton="danger"
              icone={AlertTriangle}
              titre={enRetard.length > 1 ? `${enRetard.length} voitures en retard` : 'Voiture en retard'}
              detail={enRetard.map((v) => `${v.voiture?.matricule || ''} · attendue à ${v.trajet.arrivee} vers ${heure(v.arrivee_prevue)}`).join(' · ')}
              lien="/compagnie/suivi"
              action="Voir"
            />
          )}
          {rappels > 0 && (
            <AFaire ton="info" icone={CalendarDays} titre={`${pluriel(rappels, 'voyage')} à publier`} detail="Départs des 3 prochains jours en attente de publication" lien="/compagnie/planning" action="Planning" />
          )}
        </section>
      )}

      {/* Indicateurs */}
      <section aria-label="Indicateurs" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        <Kpi
          marine
          icone={TrendingUp}
          libelle={`Chiffre d’affaires · ${nomMois()}`}
          valeur={ariary(f?.ca?.ce_mois, false)}
          unite="Ar"
          tendance={f?.ca?.evolution_mois}
          detail={`Mois dernier : ${ariary(f?.ca?.mois_dernier)}`}
          chargement={finances.isLoading}
        />
        <Kpi icone={Banknote} libelle="Recette du jour" valeur={ariary(f?.ca?.aujourdhui, false)} unite="Ar" detail={`Cette semaine : ${ariary(f?.ca?.cette_semaine)}`} chargement={finances.isLoading} />
        <Kpi
          icone={Ticket}
          libelle="Réservations"
          valeur={nombre(f?.totaux?.reservations)}
          detail={`dont ${nombre(f?.totaux?.reservations_aujourdhui)} aujourd’hui`}
          chargement={finances.isLoading}
        />
        <Kpi icone={Users} libelle="Voyageurs transportés" valeur={nombre(f?.totaux?.voyageurs)} detail={`sur ${pluriel(Number(f?.totaux?.voyages) || 0, 'voyage')}`} chargement={finances.isLoading} />
        <Kpi
          icone={Gauge}
          ton="succes"
          libelle="Taux de remplissage moyen"
          valeur={`${String(f?.taux_remplissage ?? 0).replace('.', ',')} %`}
          detail={<Barre pct={Number(f?.taux_remplissage) || 0} ton="succes" />}
          chargement={finances.isLoading}
        />
        <Kpi
          icone={Navigation}
          ton={enRetard.length ? 'danger' : 'ocean'}
          libelle="Voitures en route"
          valeur={String(enRoute.length)}
          detail={enRetard.length ? <span className="font-extrabold text-danger">dont {enRetard.length} en retard</span> : `${pluriel(attendues.length, 'arrivée attendue', 'arrivées attendues')}`}
          chargement={suiviDeparts.isLoading}
        />
      </section>

      {/* Graphiques */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panneau titre="Chiffre d’affaires des 30 derniers jours" sousTitre={finances.isLoading ? undefined : `Total : ${ariary(total30)}`} className="xl:col-span-2" lien="/compagnie/portefeuille" libelleLien="Portefeuille">
          {finances.isLoading ? (
            <Squelette className="h-[260px]" />
          ) : finances.isError ? (
            <Erreur message={messageErreur(finances.error)} onReessayer={() => finances.refetch()} />
          ) : (
            <div className="h-[260px]" role="img" aria-label={`Chiffre d’affaires par jour sur 30 jours, total ${ariary(total30)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie30} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="jour" tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} interval={4} />
                  <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip cursor={{ fill: '#EBF2F9' }} content={<Bulle format={(v: number) => ariary(v)} />} labelFormatter={(_, p) => p?.[0]?.payload?.libelle} />
                  <Bar dataKey="ca" fill="#0B4F8A" radius={[5, 5, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panneau>

        <Panneau titre="Moyens de paiement" sousTitre="Répartition des montants encaissés">
          {finances.isLoading ? (
            <Squelette className="h-[260px]" />
          ) : paiements.length === 0 ? (
            <Vide icone={Banknote} titre="Aucun paiement encaissé" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="h-[150px]" role="img" aria-label="Répartition des paiements par moyen">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paiements} dataKey="montant" nameKey="type" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                      {paiements.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<Bulle format={(v: number, p: any) => `${p.name} : ${ariary(v)}`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {paiements.map((p, i) => (
                  <li key={p.type} className="flex items-center gap-3 text-[14px]">
                    <span className="h-3 w-3 flex-none rounded-[4px]" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-bold text-encre">{p.type}</span>
                    <span className="font-semibold tabular-nums text-encre-douce">{pluriel(Number(p.count) || 0, 'vente')}</span>
                    <b className="w-[54px] text-right tabular-nums">{totalPaiements ? Math.round((Number(p.montant) / totalPaiements) * 100) : 0} %</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panneau>
      </div>

      {/* Prochains départs + suivi */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panneau titre="Prochains départs" sousTitre="Les 7 prochains jours" lien="/compagnie/planning" libelleLien="Planning" className="xl:col-span-2" sansMarge>
          {departs.isLoading ? (
            <div className="flex flex-col gap-2 p-5">{[0, 1, 2].map((i) => <Squelette key={i} className="h-11" />)}</div>
          ) : departs.isError ? (
            <div className="p-5">
              <Erreur message={messageErreur(departs.error)} onReessayer={() => departs.refetch()} />
            </div>
          ) : prochains.length === 0 ? (
            <Vide icone={Bus} titre="Aucun départ dans les 7 prochains jours">
              Planifiez vos prochains voyages dans le planning.
            </Vide>
          ) : (
            <Tableau
              colonnes={[
                { titre: 'Départ' },
                { titre: 'Trajet' },
                { titre: 'Véhicule · chauffeur' },
                { titre: 'Places vendues' },
                { titre: 'État' },
                { titre: 'Action', cache: true },
              ]}
            >
              {prochains.map((v) => {
                const etat = etatDepart(v);
                const pris = Number(v.places_reservees) || 0;
                const total = Number(v.places_disponibles) || 0;
                const ch = v.voiture?.chauffeur;
                return (
                  <tr key={v.id}>
                    <td className="whitespace-nowrap">
                      <b className="block tabular-nums">{heure(v.heure_depart)}</b>
                      <span className="text-[12.5px] font-semibold text-encre-douce">{jourRelatif(v.date)}</span>
                    </td>
                    <td className="font-bold">
                      {v.trajet?.province_depart} → {v.trajet?.province_arrivee}
                    </td>
                    <td>
                      <span className="block font-bold">{v.voiture?.matricule || '—'}</span>
                      <span className={`text-[12.5px] font-semibold ${ch ? 'text-encre-douce' : 'text-alerte'}`}>{ch ? `${ch.prenom} ${ch.nom}` : 'Aucun chauffeur'}</span>
                    </td>
                    <td className="min-w-[150px]">
                      <span className="flex items-center gap-2.5">
                        <Barre pct={total ? (pris / total) * 100 : 0} ton={pris >= total && total ? 'succes' : 'ocean'} />
                        <b className="min-w-[48px] text-right tabular-nums">
                          {pris}/{total}
                        </b>
                      </span>
                    </td>
                    <td>
                      <Pastille libelle={etat.libelle} tonalite={etat.tonalite} />
                    </td>
                    <td className="text-right">
                      <Bouton variante="secondaire" compact vers={etat.vers}>
                        {etat.action}
                      </Bouton>
                    </td>
                  </tr>
                );
              })}
            </Tableau>
          )}
        </Panneau>

        <Panneau titre="Arrivées attendues" sousTitre="Voitures envoyées par vos partenaires" lien="/compagnie/suivi" libelleLien="Suivi" sansMarge>
          {arrivees.isLoading ? (
            <div className="p-5">
              <Squelette className="h-24" />
            </div>
          ) : attendues.length === 0 ? (
            <Vide icone={Navigation} titre="Aucune voiture attendue">
              Les voitures de vos partenaires apparaissent ici dès leur départ.
            </Vide>
          ) : (
            <ul className="m-0 list-none p-0">
              {attendues.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center gap-3 border-b border-separateur px-5 py-3 last:border-b-0">
                  <span className="w-12 text-[15px] font-extrabold tabular-nums">{heure(v.statut_suivi === 'en_route' ? v.arrivee_prevue : v.depart_prevu)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">
                      {v.compagnie_depart?.nom} · {v.voiture?.matricule}
                    </b>
                    <span className="block truncate text-[12.5px] font-semibold text-encre-douce">
                      {v.trajet.depart} → {v.trajet.arrivee} · {pluriel(v.nb_voyageurs, 'voyageur')}
                    </span>
                  </span>
                  <Pastille libelle={v.en_retard ? 'En retard' : v.statut_suivi === 'en_route' ? 'En route' : 'Attendu'} tonalite={v.en_retard ? 'danger' : v.statut_suivi === 'en_route' ? 'info' : 'neutre'} />
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>

      {/* Dernières réservations + exploitation */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panneau titre="Dernières réservations" lien="/compagnie/reservations" libelleLien="Toutes les réservations" className="xl:col-span-2" sansMarge>
          {finances.isLoading ? (
            <div className="flex flex-col gap-2 p-5">{[0, 1, 2].map((i) => <Squelette key={i} className="h-10" />)}</div>
          ) : recentes.length === 0 ? (
            <Vide icone={Ticket} titre="Aucune réservation pour le moment" />
          ) : (
            <Tableau
              colonnes={[
                { titre: 'Billet' },
                { titre: 'Client' },
                { titre: 'Trajet' },
                { titre: 'Places', droite: true },
                { titre: 'Canal' },
                { titre: 'Paiement' },
                { titre: 'Montant', droite: true },
                { titre: 'Date' },
              ]}
            >
              {recentes.slice(0, 8).map((r) => (
                <tr key={r.res_numero}>
                  <td className="whitespace-nowrap font-bold tabular-nums">{r.res_numero}</td>
                  <td className="max-w-[180px] truncate font-semibold">{r.canal === 'guichet' ? 'Vente au guichet' : r.client || '—'}</td>
                  <td className="whitespace-nowrap font-semibold">{r.trajet || '—'}</td>
                  <td className="text-right font-bold tabular-nums">{r.nb_voyageurs}</td>
                  <td>
                    <Pastille libelle={r.canal === 'guichet' ? 'Guichet' : 'En ligne'} tonalite={r.canal === 'guichet' ? 'neutre' : 'info'} point={false} />
                  </td>
                  <td className="whitespace-nowrap font-semibold">{r.type_paiement || '—'}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(r.montant)}</td>
                  <td className="whitespace-nowrap font-semibold tabular-nums text-encre-douce">{r.date}</td>
                </tr>
              ))}
            </Tableau>
          )}
        </Panneau>

        <Panneau titre="Exploitation" sousTitre="État de la flotte et des voyages" sansMarge>
          {exploitation.isLoading ? (
            <div className="p-5">
              <Squelette className="h-40" />
            </div>
          ) : (
            <dl className="m-0 grid grid-cols-2">
              {[
                { l: 'Véhicules disponibles', v: `${nombre(e?.voitures?.disponibles)} / ${nombre(e?.voitures?.total)}`, lien: '/compagnie/vehicules' },
                { l: 'Chauffeurs actifs', v: `${nombre(e?.chauffeurs?.actifs)} / ${nombre(e?.chauffeurs?.total)}`, lien: '/compagnie/chauffeurs' },
                { l: 'Voyages ouverts', v: nombre(e?.voyages?.ouverts), lien: '/compagnie/voyages' },
                { l: 'Non publiés', v: nombre(e?.voyages?.non_publies), lien: '/compagnie/planning' },
                { l: 'En pause', v: nombre(e?.voyages?.en_pause), lien: '/compagnie/voyages' },
                { l: 'Voyages complets', v: nombre(f?.totaux?.voyages_complets), lien: '/compagnie/voyages' },
                { l: 'Terminés', v: nombre(e?.voyages?.termines), lien: '/compagnie/planning' },
                { l: 'Annulés', v: nombre(e?.voyages?.annules), lien: '/compagnie/planning' },
              ].map((x, i) => (
                <Link
                  key={x.l}
                  to={x.lien}
                  className={`flex flex-col gap-1 border-separateur px-5 py-3.5 no-underline hover:bg-[#F8FAFD] ${i % 2 === 0 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''}`}
                >
                  <dt className="text-[12.5px] font-bold text-encre-douce">{x.l}</dt>
                  <dd className="m-0 text-[20px] font-extrabold tabular-nums text-encre">{x.v}</dd>
                </Link>
              ))}
            </dl>
          )}
        </Panneau>
      </div>

      <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-semibold text-encre-douce">
        <CalendarRange className="h-4 w-4" aria-hidden />
        Données actualisées automatiquement chaque minute.
      </p>
    </div>
  );
}

function AFaire({ ton, icone: Icone, titre, detail, lien, action }: { ton: 'alerte' | 'danger' | 'info'; icone: typeof CheckCheck; titre: string; detail: string; lien: string; action: string }) {
  const tons = {
    alerte: 'border-alerte-bord bg-alerte-fond text-alerte',
    danger: 'border-danger-bord bg-danger-fond text-danger',
    info: 'border-ocean-100 bg-ocean-50 text-ocean-800',
  }[ton];
  return (
    <div className={`flex items-center gap-3 rounded-carte border px-4 py-3.5 ${tons}`}>
      <Icone className="h-[22px] w-[22px] flex-none" aria-hidden />
      <span className="min-w-0 flex-1">
        <b className="block text-[14px]">{titre}</b>
        <span className="block truncate text-[13px] font-semibold text-encre-douce">{detail}</span>
      </span>
      <Bouton variante="secondaire" compact vers={lien}>
        {action}
      </Bouton>
    </div>
  );
}
