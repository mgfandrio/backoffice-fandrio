import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Pencil, Plus, Power, Search } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Kpi, Tableau } from '@/components/tableau';
import { FormulaireCompagnie } from '@/components/systeme/FormulaireCompagnie';
import { DetailCollecte } from './Collectes';
import { ariary, initiales, nombre, pluriel } from '@/utils/format';
import { etatCollecte, etatCompagnie } from '@/utils/systeme';

/** Compagnies : liste, création (avec partenaires), fiche, options, activation. */
export default function Compagnies() {
  const [statut, setStatut] = useState('');
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<number | null>(null);
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; id: number | null }>({ ouvert: false, id: null });

  const stats = useQuery({ queryKey: ['systeme', 'compagnies', 'stats'], queryFn: async () => (await obtenir('/api/admin/compagnies/statistiques')).data });
  const liste = useQuery({ queryKey: ['systeme', 'compagnies', 'liste'], queryFn: async () => ((await obtenir('/api/admin/compagnies/recupListecompagnie', { per_page: 200 })).data?.compagnies || []) as any[] });
  const commissions = useQuery({ queryKey: ['systeme', 'commissions', 'compagnies'], queryFn: async () => ((await obtenir('/api/admin/commissions/compagnies')).data?.compagnies || []) as any[] });
  const parId = useMemo(() => new Map((commissions.data || []).map((c) => [Number(c.comp_id), c])), [commissions.data]);

  const affichees = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return (liste.data || [])
      .filter((c) => {
        const com = parId.get(Number(c.id));
        if (statut === 'suspendues') return !!com?.suspendu;
        if (statut && String(c.statut) !== statut) return false;
        return !r || [c.nom, c.email, c.telephone, c.localisation?.nom].join(' ').toLowerCase().includes(r);
      })
      .sort((a, b) => String(a.nom).localeCompare(String(b.nom)));
  }, [liste.data, parId, statut, recherche]);
  const s = stats.data;
  const suspendues = (commissions.data || []).filter((c) => c.suspendu).length;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Kpi marine icone={Building2} libelle="Compagnies" valeur={nombre(s?.total)} detail={`${nombre(s?.actives)} actives`} chargement={stats.isLoading} />
        <Kpi icone={Building2} ton="neutre" libelle="Inactives" valeur={nombre(s?.inactives)} chargement={stats.isLoading} />
        <Kpi icone={AlertTriangle} ton={suspendues ? 'danger' : 'neutre'} libelle="Suspendues" valeur={nombre(suspendues)} detail="Commission impayée" chargement={commissions.isLoading} />
      </section>

      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={statut} onChange={(e) => setStatut(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Toutes les compagnies</option>
          <option value="1">Actives</option>
          <option value="2">Inactives</option>
          <option value="suspendues">Suspendues (commission impayée)</option>
        </Selecteur>
        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, ville, contact…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, id: null })}>
          Nouvelle compagnie
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : affichees.length === 0 ? (
          <Vide icone={Building2} titre={(liste.data || []).length ? 'Aucune compagnie ne correspond' : 'Aucune compagnie'} />
        ) : (
          <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Siège' }, { titre: 'Contact' }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {affichees.map((c) => {
              const com = parId.get(Number(c.id));
              const e = etatCompagnie(c.statut, com?.suspendu);
              return (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      {c.logo ? <img src={c.logo} alt="" className="h-9 w-9 rounded-[10px] object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ocean-50 text-[13px] font-extrabold text-ocean-800">{initiales(c.nom)}</span>}
                      <span>
                        <b className="block">{c.nom}</b>
                        <span className="text-[12px] font-semibold text-encre-douce">
                          {[c.mode_vip && 'VIP', c.mode_premium && 'Premium', c.papi_actif && 'Paiement en ligne'].filter(Boolean).join(' · ') || 'Classique'}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="font-semibold">{c.localisation?.nom || '—'}</td>
                  <td>
                    <span className="block font-semibold tabular-nums">{c.telephone}</span>
                    <span className="text-[12.5px] font-semibold text-encre-douce">{c.email}</span>
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{com ? ariary(com.brut) : '—'}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{com ? ariary(com.commission) : '—'}</td>
                  <td>
                    <Pastille libelle={e.libelle} tonalite={e.tonalite} />
                  </td>
                  <td className="text-right">
                    <Bouton variante="secondaire" compact onClick={() => setFiche(Number(c.id))}>
                      Ouvrir
                    </Bouton>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Carte>

      <FicheCompagnie compagnieId={fiche} suspendu={fiche ? !!parId.get(fiche)?.suspendu : false} onFermer={() => setFiche(null)} onModifier={(id) => setFormulaire({ ouvert: true, id })} />
      <FormulaireCompagnie ouvert={formulaire.ouvert} compagnieId={formulaire.id} onFermer={() => setFormulaire({ ouvert: false, id: null })} onEnregistre={(id) => !formulaire.id && id && setFiche(id)} />
    </div>
  );
}

function Option({ titre, detail, actif, onChange, desactive }: { titre: string; detail: string; actif: boolean; onChange: (v: boolean) => void; desactive?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 border-b border-separateur px-4 py-3 last:border-b-0 ${desactive ? 'opacity-60' : ''}`}>
      <span className="flex-1">
        <b className="block text-[14px]">{titre}</b>
        <span className="text-[12.5px] font-semibold text-encre-douce">{detail}</span>
      </span>
      <span className="text-[13px] font-bold text-encre-douce">{actif ? 'Activé' : 'Désactivé'}</span>
      <input type="checkbox" checked={actif} disabled={desactive} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-ocean-800" aria-label={titre} />
    </label>
  );
}

/** Fiche d'une compagnie (panneau latéral). */
function FicheCompagnie({ compagnieId, suspendu, onFermer, onModifier }: { compagnieId: number | null; suspendu: boolean; onFermer: () => void; onModifier: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [occupe, setOccupe] = useState(false);
  const [confirmerStatut, setConfirmerStatut] = useState(false);
  const [collecte, setCollecte] = useState<number | null>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const detail = useQuery({ queryKey: ['systeme', 'compagnie', compagnieId], queryFn: async () => (await obtenir(`/api/admin/compagnies/detailCompagnie/${compagnieId}`)).data, enabled: !!compagnieId });
  const chiffres = useQuery({ queryKey: ['systeme', 'commission', compagnieId], queryFn: async () => (await obtenir(`/api/admin/commissions/compagnies/${compagnieId}`)).data, enabled: !!compagnieId });
  const collectes = useQuery({ queryKey: ['systeme', 'collectes', 'compagnie', compagnieId], queryFn: async () => ((await obtenir('/api/admin/commissions/collectes', { comp_id: compagnieId, per_page: 5 })).data?.collectes || []) as any[], enabled: !!compagnieId });
  const c = detail.data;

  const agir = async (appel: () => Promise<any>, succes?: string) => {
    setOccupe(true);
    try {
      await appel();
      queryClient.invalidateQueries({ queryKey: ['systeme'] });
      if (succes) setMessage({ titre: 'C’est fait', texte: succes });
    } catch (e) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(e) });
    } finally {
      setOccupe(false);
    }
  };

  const basculerPapi = (v: boolean) => {
    if (v && !c.papi_configure) return setMessage({ titre: 'Clé PAPI manquante', texte: 'Ajoutez la clé API PAPI avec « Modifier » (étape Activité) avant d’activer le paiement en ligne.' });
    agir(() =>
      api.put(`/api/admin/compagnies/updateCompagnie/${compagnieId}`, {
        comp_nom: c.nom,
        comp_nif: c.nif,
        comp_stat: c.stat,
        comp_description: c.description,
        comp_phone: c.telephone,
        comp_email: c.email,
        comp_adresse: c.adresse,
        comp_localisation: c.localisation?.id,
        papi_actif: v,
      })
    );
  };

  const active = Number(c?.statut) === 1;
  const e = c ? etatCompagnie(c.statut, suspendu) : null;
  const admin = c?.administrateurs?.[0];
  const t = chiffres.data?.totaux;

  return (
    <Tiroir
      ouvert={!!compagnieId}
      titre={c?.nom || 'Compagnie'}
      sousTitre={c ? `${c.localisation?.nom || ''} · créée le ${String(c.date_creation || '').slice(0, 10).split('-').reverse().join('/')}` : undefined}
      onFermer={onFermer}
      pied={
        c && (
          <>
            <Bouton variante="secondaire" icone={Pencil} onClick={() => onModifier(c.id)}>
              Modifier
            </Bouton>
            <Bouton variante={active ? 'danger' : 'succes'} icone={Power} onClick={() => setConfirmerStatut(true)} className="ml-auto">
              {active ? 'Désactiver la compagnie' : 'Réactiver la compagnie'}
            </Bouton>
          </>
        )
      }
    >
      {detail.isLoading || !c ? (
        <Squelette className="h-64" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {e && <Pastille libelle={e.libelle} tonalite={e.tonalite} />}
            {suspendu && <span className="text-[13px] font-bold text-danger">Voyages cachés aux clients tant que la commission n’est pas payée.</span>}
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-carte border border-ligne bg-white text-center">
            {[
              ['Ventes', t ? ariary(t.brut) : '…'],
              ['Commission', t ? ariary(t.commission) : '…'],
              ['Billets', t ? nombre(t.total_billets) : '…'],
            ].map(([l, v], i) => (
              <div key={l} className={`py-3 ${i ? 'border-l border-separateur' : ''}`}>
                <b className="block text-[17px] tabular-nums">{v}</b>
                <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
              </div>
            ))}
          </div>

          <Carte className="grid gap-0 p-0 sm:grid-cols-2">
            {[
              ['Responsable', admin ? `${admin.prenom} ${admin.nom} · ${admin.telephone}` : '—'],
              ['Contact', `${c.telephone} · ${c.email}`],
              ['Siège', `${c.localisation?.nom || '—'} · ${c.adresse || ''}`],
              ['NIF · STAT', [c.nif, c.stat].filter(Boolean).join(' · ') || '—'],
              ['Provinces desservies', (c.provinces_desservies || []).map((p: any) => p.nom).join(', ') || '—'],
              ['Moyens de paiement', (c.modes_paiement_acceptes || []).map((m: any) => m.nom).join(', ') || 'Aucun'],
            ].map(([l, v], i) => (
              <div key={l} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i < 4 ? 'border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                <b className="text-[14px]">{v}</b>
              </div>
            ))}
          </Carte>

          <h3 className="m-0 text-[15px] font-extrabold">Options</h3>
          <Carte className="overflow-hidden p-0">
            <Option titre="Paiement en ligne" detail={c.papi_configure ? 'Clé PAPI configurée' : 'Clé PAPI à ajouter (Modifier)'} actif={!!c.papi_actif} onChange={basculerPapi} desactive={occupe} />
            <Option titre="Offres VIP" detail="Véhicules et trajets VIP" actif={!!c.mode_vip} onChange={(v) => agir(() => api.patch(`/api/admin/compagnies/${c.id}/modes`, { mode_vip: v }))} desactive={occupe} />
            <Option titre="Offres Premium" detail="Véhicules et trajets Premium" actif={!!c.mode_premium} onChange={(v) => agir(() => api.patch(`/api/admin/compagnies/${c.id}/modes`, { mode_premium: v }))} desactive={occupe} />
            <Option titre="Commission active" detail="Prélever la commission FANDRIO sur les ventes en ligne" actif={c.commission_active !== false} onChange={(v) => agir(() => api.patch(`/api/admin/commissions/compagnies/${c.id}/toggle`, { actif: v }))} desactive={occupe} />
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex-1">
                <b className="block text-[14px]">Collecte de la commission</b>
                <span className="text-[12.5px] font-semibold text-encre-douce">Fréquence à laquelle la commission est demandée</span>
              </span>
              <Selecteur libelle="Fréquence de collecte" libelleCache value={c.frequence_collecte === 'hebdomadaire' ? 'hebdomadaire' : 'mensuelle'} disabled={occupe} onChange={(ev) => agir(() => api.patch(`/api/admin/commissions/compagnies/${c.id}/frequence`, { frequence: ev.target.value }), 'La fréquence de collecte est modifiée.')} className="w-[180px]">
                <option value="mensuelle">Mensuelle</option>
                <option value="hebdomadaire">Hebdomadaire</option>
              </Selecteur>
            </div>
          </Carte>

          <h3 className="m-0 text-[15px] font-extrabold">Compagnies partenaires</h3>
          <Carte className="p-4">
            {(c.partenaires || []).length === 0 ? (
              <p className="m-0 text-[14px] font-semibold text-alerte">Aucune compagnie partenaire : le suivi des voitures se fera sans compagnie de réception.</p>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {c.partenaires.map((p: any) => (
                  <li key={p.id} className="rounded-full bg-ocean-50 px-3 py-1.5 text-[13px] font-bold text-ocean-950">
                    {p.nom} · {p.province?.nom || '—'}
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <h3 className="m-0 text-[15px] font-extrabold">Dernières collectes</h3>
          <Carte className="overflow-hidden">
            {collectes.isLoading ? (
              <div className="p-4">
                <Squelette className="h-16" />
              </div>
            ) : (collectes.data || []).length === 0 ? (
              <p className="m-0 p-4 text-[14px] font-semibold text-encre-douce">Aucune collecte pour le moment.</p>
            ) : (
              <Tableau colonnes={[{ titre: 'Période' }, { titre: 'Commission', droite: true }, { titre: 'Échéance' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
                {(collectes.data || []).map((x) => {
                  const ec = etatCollecte(x);
                  return (
                    <tr key={x.coll_id}>
                      <td className="whitespace-nowrap font-semibold tabular-nums">
                        {x.periode_debut} – {x.periode_fin}
                      </td>
                      <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(x.montant_commission)}</td>
                      <td className="whitespace-nowrap font-semibold tabular-nums">{x.date_prevue}</td>
                      <td>
                        <Pastille libelle={ec.libelle} tonalite={ec.tonalite} />
                      </td>
                      <td className="text-right">
                        <Bouton variante="secondaire" compact onClick={() => setCollecte(x.coll_id)}>
                          Ouvrir
                        </Bouton>
                      </td>
                    </tr>
                  );
                })}
              </Tableau>
            )}
          </Carte>
          <p className="m-0 text-[13px] font-semibold text-encre-douce">{pluriel((chiffres.data?.evolution_mensuelle || []).length, 'mois')} d’activité enregistrés.</p>
        </div>
      )}

      <DetailCollecte collecteId={collecte} onFermer={() => setCollecte(null)} />
      <Dialogue
        ouvert={confirmerStatut}
        titre={active ? 'Désactiver la compagnie ?' : 'Réactiver la compagnie ?'}
        confirmer={active ? 'Désactiver' : 'Réactiver'}
        danger={active}
        chargement={occupe}
        onConfirmer={async () => {
          await agir(() => api.patch(`/api/admin/compagnies/${compagnieId}/statut`, { statut: active ? 2 : 1 }), active ? 'La compagnie est désactivée.' : 'La compagnie est réactivée.');
          setConfirmerStatut(false);
        }}
        onFermer={() => setConfirmerStatut(false)}
      >
        {active ? 'Ses voyages ne seront plus proposés aux clients et son administrateur ne pourra plus se connecter.' : 'La compagnie retrouvera l’accès à FANDRIO et ses voyages redeviendront visibles.'}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}
