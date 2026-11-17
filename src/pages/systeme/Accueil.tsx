import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Building2, Landmark, MapPinned, PieChart as IconeCamembert, Ticket, TrendingUp, Users } from 'lucide-react';
import { obtenir } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Pastille, Squelette, Vide } from '@/components/ui';
import { Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, ariaryCourt, jourLong, nombre, nomMois, pluriel } from '@/utils/format';

/** Tableau de bord de l'admin système : commissions, collectes, compagnies. */

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « 2026-11 » → « nov. 2026 » */
const libelleMois = (m?: string) => {
  const [a, n] = String(m || '').split('-');
  return MOIS_COURTS[Number(n) - 1] ? `${MOIS_COURTS[Number(n) - 1]} ${a}` : '';
};

const donnees = (r: any) => (r && r.statut !== false && 'data' in r ? r.data : null);

/** Collecte : 2 = payée ; en attente, ou en retard si l'échéance (JJ/MM/AAAA) est passée. */
function etatCollecte(c: any): 'payee' | 'attente' | 'retard' {
  if (Number(c?.statut) === 2) return 'payee';
  const [j, m, a] = String(c?.date_prevue || '').split('/').map(Number);
  const echeance = a ? new Date(a, m - 1, j) : null;
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return echeance && echeance < auj ? 'retard' : 'attente';
}

function Bulle({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-xs font-bold text-encre-douce">{libelleMois(label)}</p>
      <p className="m-0 text-sm font-extrabold tabular-nums text-encre">Commission : {ariary(payload[0].value)}</p>
      <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">Ventes : {ariary(payload[0].payload.brut)}</p>
    </div>
  );
}

export default function AccueilSysteme() {
  const { utilisateur } = useAuth();
  const q = useQuery({
    queryKey: ['systeme', 'accueil'],
    queryFn: async () => {
      const [su, sc, sp, dash, col, cies] = await Promise.all([
        obtenir('/api/admin/utilisateurs/statistiques').catch(() => null),
        obtenir('/api/admin/compagnies/statistiques').catch(() => null),
        obtenir('/api/admin/provinces/statistiques').catch(() => null),
        obtenir('/api/admin/commissions/dashboard').catch(() => null),
        obtenir('/api/admin/commissions/collectes', { per_page: 100 }).catch(() => null),
        obtenir('/api/admin/commissions/compagnies').catch(() => null),
      ]);
      return {
        users: donnees(su),
        cies: donnees(sc),
        provinces: donnees(sp),
        dash: donnees(dash),
        collectes: (donnees(col)?.collectes || []) as any[],
        commissionsCies: (donnees(cies)?.compagnies || []) as any[],
      };
    },
    refetchInterval: 5 * 60_000,
  });

  const d = q.data;
  const charge = q.isLoading;
  const mois = d?.dash?.par_periode?.ce_mois || {};
  const evolution: any[] = d?.dash?.evolution_mensuelle || [];
  const precedent = evolution.length >= 2 ? Number(evolution[evolution.length - 2]?.commission) || 0 : 0;
  const variation = precedent > 0 ? (((Number(mois.commission) || 0) - precedent) / precedent) * 100 : null;
  const collectes = d?.collectes || [];
  const enAttente = collectes.filter((c) => etatCollecte(c) !== 'payee');
  const enRetard = collectes.filter((c) => etatCollecte(c) === 'retard');
  const montantAttente = enAttente.reduce((s, c) => s + Number(c.montant_commission || 0), 0);
  const cies = [...(d?.commissionsCies || [])].sort((a, b) => Number(b.commission) - Number(a.commission));
  const suspendues = cies.filter((c) => c.suspendu).length;

  return (
    <div className="flex flex-col gap-5 p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold text-encre">Bonjour {utilisateur?.prenom}</h2>
          <p className="m-0 mt-0.5 text-[14px] font-semibold text-encre-douce">{jourLong()} · Administration FANDRIO</p>
        </div>
        <Bouton vers="/systeme/compagnies" icone={Building2}>
          Compagnies
        </Bouton>
      </div>

      {(enRetard.length > 0 || suspendues > 0) && (
        <section aria-label="À traiter" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {enRetard.length > 0 && (
            <div className="flex items-center gap-3 rounded-carte border border-danger-bord bg-danger-fond px-4 py-3.5 text-danger">
              <AlertTriangle className="h-[22px] w-[22px] flex-none" aria-hidden />
              <span className="min-w-0 flex-1">
                <b className="block text-[14px]">{pluriel(enRetard.length, 'collecte')} en retard</b>
                <span className="block text-[13px] font-semibold text-encre-douce">Échéance passée sans paiement</span>
              </span>
              <Bouton variante="secondaire" compact vers="/systeme/collectes">
                Voir
              </Bouton>
            </div>
          )}
          {suspendues > 0 && (
            <div className="flex items-center gap-3 rounded-carte border border-alerte-bord bg-alerte-fond px-4 py-3.5 text-alerte">
              <Building2 className="h-[22px] w-[22px] flex-none" aria-hidden />
              <span className="min-w-0 flex-1">
                <b className="block text-[14px]">{pluriel(suspendues, 'compagnie suspendue', 'compagnies suspendues')}</b>
                <span className="block text-[13px] font-semibold text-encre-douce">Commission impayée : voyages cachés aux clients</span>
              </span>
              <Bouton variante="secondaire" compact vers="/systeme/commissions">
                Voir
              </Bouton>
            </div>
          )}
        </section>
      )}

      <section aria-label="Indicateurs" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        <Kpi marine icone={TrendingUp} libelle={`Commissions · ${nomMois()}`} valeur={ariary(mois.commission, false)} unite="Ar" tendance={variation} detail={`Taux : ${d?.dash?.taux_commission ?? 5} %`} chargement={charge} />
        <Kpi icone={Ticket} libelle={`Ventes des compagnies · ${nomMois()}`} valeur={ariary(mois.brut, false)} unite="Ar" detail={`${pluriel(Number(mois.billets) || 0, 'billet')} vendus`} chargement={charge} />
        <Kpi icone={Landmark} ton={enRetard.length ? 'danger' : 'alerte'} libelle="Collectes en attente" valeur={ariary(montantAttente, false)} unite="Ar" detail={pluriel(enAttente.length, 'collecte')} chargement={charge} />
        <Kpi icone={Building2} libelle="Compagnies actives" valeur={nombre(d?.cies?.actives)} detail={`sur ${nombre(d?.cies?.total)} · ${pluriel(suspendues, 'suspendue')}`} chargement={charge} />
        <Kpi icone={Users} libelle="Utilisateurs" valeur={nombre(d?.users?.total)} detail={`${nombre(d?.users?.nouveaux_ce_mois)} nouveaux ce mois`} chargement={charge} />
        <Kpi icone={MapPinned} ton="neutre" libelle="Provinces" valeur={nombre(d?.provinces?.total)} detail="desservies par le réseau" chargement={charge} />
      </section>

      <Panneau titre="Commissions des 12 derniers mois" sousTitre="Commission FANDRIO par mois (survolez une barre pour le détail)" lien="/systeme/commissions" libelleLien="Commissions">
        {charge ? (
          <Squelette className="h-[260px]" />
        ) : evolution.length === 0 ? (
          <Vide icone={IconeCamembert} titre="Pas encore de commissions" />
        ) : (
          <div className="h-[260px]" role="img" aria-label="Commissions mois par mois">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="mois" tickFormatter={libelleMois} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} />
                <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip cursor={{ fill: '#EBF2F9' }} content={<Bulle />} />
                <Bar dataKey="commission" fill="#0B4F8A" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panneau>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panneau titre="Compagnies" sousTitre={`Ventes et commission · ${nomMois()}`} lien="/systeme/compagnies" libelleLien="Toutes les compagnies" sansMarge>
          {charge ? (
            <div className="p-5">
              <Squelette className="h-40" />
            </div>
          ) : cies.length === 0 ? (
            <Vide icone={Building2} titre="Aucune compagnie" />
          ) : (
            <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Billets', droite: true }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'État' }]}>
              {cies.slice(0, 8).map((c) => (
                <tr key={c.comp_id}>
                  <td className="font-bold">{c.comp_nom}</td>
                  <td className="text-right font-semibold tabular-nums">{nombre(c.billets)}</td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(c.brut)}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.commission)}</td>
                  <td>
                    {c.suspendu ? (
                      <Pastille libelle="Suspendue" tonalite="danger" />
                    ) : Number(c.comp_statut) === 1 ? (
                      <Pastille libelle="Active" tonalite="succes" />
                    ) : (
                      <Pastille libelle="Inactive" tonalite="neutre" />
                    )}
                  </td>
                </tr>
              ))}
            </Tableau>
          )}
        </Panneau>

        <Panneau titre="Collectes à encaisser" sousTitre="Commissions dues par les compagnies" lien="/systeme/collectes" libelleLien="Toutes les collectes" sansMarge>
          {charge ? (
            <div className="p-5">
              <Squelette className="h-40" />
            </div>
          ) : enAttente.length === 0 ? (
            <Vide icone={Landmark} titre="Aucune collecte en attente">
              Toutes les commissions dues ont été encaissées.
            </Vide>
          ) : (
            <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Période' }, { titre: 'Montant', droite: true }, { titre: 'Échéance' }, { titre: 'État' }]}>
              {enAttente.slice(0, 8).map((c) => (
                <tr key={c.coll_id}>
                  <td className="font-bold">
                    <Link to="/systeme/collectes" className="text-encre no-underline hover:underline">
                      {c.comp_nom}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap font-semibold tabular-nums text-encre-douce">
                    {c.periode_debut} – {c.periode_fin}
                  </td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.montant_commission)}</td>
                  <td className="whitespace-nowrap font-semibold tabular-nums">{c.date_prevue}</td>
                  <td>{etatCollecte(c) === 'retard' ? <Pastille libelle="En retard" tonalite="danger" /> : <Pastille libelle="En attente" tonalite="alerte" />}</td>
                </tr>
              ))}
            </Tableau>
          )}
        </Panneau>
      </div>
    </div>
  );
}
