import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Champ, Dialogue, Selecteur, Squelette, Tiroir } from '@/components/ui';

/**
 * Créer une compagnie (identité, activité, partenaires, administrateur) ou la
 * modifier (identité et activité). Mêmes règles que le formulaire mobile.
 */

const VIDE = {
  nom: '',
  description: '',
  telephone: '',
  email: '',
  adresse: '',
  nif: '',
  stat: '',
  localisation: '',
  frequence: 'mensuelle',
  papiActif: false,
  papiCle: '',
  papiSecret: '',
  adminPrenom: '',
  adminNom: '',
  adminEmail: '',
  adminTelephone: '',
  adminMdp: '',
};

export function FormulaireCompagnie({ ouvert, compagnieId, onFermer, onEnregistre }: { ouvert: boolean; compagnieId?: number | null; onFermer: () => void; onEnregistre?: (id?: number) => void }) {
  const queryClient = useQueryClient();
  const edition = !!compagnieId;
  const etapes = edition ? ['Identité', 'Activité'] : ['Identité', 'Activité', 'Partenaires', 'Administrateur'];
  const [etape, setEtape] = useState(0);
  const [f, setF] = useState({ ...VIDE });
  const [desservies, setDesservies] = useState<number[]>([]);
  const [partenaires, setPartenaires] = useState<number[]>([]);
  const [rechercheP, setRechercheP] = useState('');
  const [modes, setModes] = useState<any[]>([]);
  const [papiConfigure, setPapiConfigure] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string; ok?: boolean } | null>(null);
  const maj = (x: Partial<typeof VIDE>) => setF((v) => ({ ...v, ...x }));

  const provinces = useQuery({ queryKey: ['systeme', 'provinces', 'toutes'], queryFn: async () => ((await obtenir('/api/admin/provinces/recuperListeProvince', { per_page: 200 })).data?.provinces || []) as any[], enabled: ouvert });
  const compagnies = useQuery({ queryKey: ['systeme', 'compagnies', 'toutes'], queryFn: async () => ((await obtenir('/api/admin/compagnies/recupListecompagnie', { per_page: 200, statut: 1 })).data?.compagnies || []) as any[], enabled: ouvert && !edition });
  const existante = useQuery({ queryKey: ['systeme', 'compagnie', compagnieId], queryFn: async () => (await obtenir(`/api/admin/compagnies/detailCompagnie/${compagnieId}`)).data, enabled: ouvert && edition });

  useEffect(() => {
    if (!ouvert) return;
    setEtape(0);
    setF({ ...VIDE });
    setDesservies([]);
    setPartenaires([]);
    setRechercheP('');
    setModes([]);
    setPapiConfigure(false);
  }, [ouvert, compagnieId]);

  useEffect(() => {
    const c = existante.data;
    if (!ouvert || !edition || !c) return;
    setF({ ...VIDE, nom: c.nom || '', description: c.description || '', telephone: c.telephone || '', email: c.email || '', adresse: c.adresse || '', nif: c.nif || '', stat: c.stat || '', localisation: c.localisation?.id ? String(c.localisation.id) : '', frequence: c.frequence_collecte === 'hebdomadaire' ? 'hebdomadaire' : 'mensuelle', papiActif: !!c.papi_actif });
    setDesservies((c.provinces_desservies || []).map((p: any) => Number(p.id)));
    setModes((c.modes_paiement_acceptes || []).map((m: any) => ({ id: m.id, numero: m.numero || '', titulaire: m.titulaire || '' })));
    setPapiConfigure(!!c.papi_configure);
  }, [existante.data, ouvert, edition]);

  const autres = useMemo(() => {
    const r = rechercheP.trim().toLowerCase();
    return (compagnies.data || []).filter((c) => !r || `${c.nom} ${c.localisation?.nom || ''}`.toLowerCase().includes(r));
  }, [compagnies.data, rechercheP]);

  const verifier = (n: number): string | null => {
    if (n === 0) {
      if (!f.nom.trim()) return 'Indiquez le nom de la compagnie.';
      if (!f.description.trim()) return 'Ajoutez une courte description.';
      if (!f.telephone.trim() || !f.email.trim()) return 'Indiquez le téléphone et l’e-mail de la compagnie.';
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'L’e-mail de la compagnie n’est pas valide.';
      if (!f.adresse.trim()) return 'Indiquez l’adresse du siège.';
    }
    if (n === 1) {
      if (!f.localisation) return 'Choisissez la province du siège.';
      if (!f.nif.trim() || !f.stat.trim()) return 'Indiquez le NIF et le numéro STAT.';
      if (f.papiActif && !papiConfigure && !f.papiCle.trim()) return 'Saisissez la clé API PAPI pour activer le paiement en ligne.';
    }
    if (n === 2 && !edition && (compagnies.data || []).length > 0 && partenaires.length === 0) return 'Choisissez au moins une compagnie partenaire.';
    if (n === 3) {
      if (!f.adminPrenom.trim() || !f.adminNom.trim()) return 'Indiquez le prénom et le nom de l’administrateur.';
      if (!/^\S+@\S+\.\S+$/.test(f.adminEmail.trim())) return 'L’e-mail de l’administrateur n’est pas valide.';
      if (!f.adminTelephone.trim()) return 'Indiquez le téléphone de l’administrateur.';
      if (f.adminMdp.length < 6) return 'Le mot de passe doit avoir au moins 6 caractères.';
    }
    return null;
  };

  const suivant = () => {
    const e = verifier(etape);
    if (e) return setMessage({ titre: 'Il manque une information', texte: e });
    if (etape < etapes.length - 1) setEtape(etape + 1);
    else enregistrer();
  };

  const enregistrer = async () => {
    const base: any = {
      comp_nom: f.nom.trim(),
      comp_description: f.description.trim(),
      comp_phone: f.telephone.trim(),
      comp_email: f.email.trim(),
      comp_adresse: f.adresse.trim(),
      comp_nif: f.nif.trim(),
      comp_stat: f.stat.trim(),
      comp_localisation: Number(f.localisation),
      provinces_desservies: desservies,
      comm_frequence_collecte: f.frequence,
      papi_actif: f.papiActif,
      ...(f.papiCle.trim() ? { papi_api_key: f.papiCle.trim() } : {}),
      ...(f.papiSecret.trim() ? { papi_webhook_secret: f.papiSecret.trim() } : {}),
    };
    setEnvoi(true);
    try {
      let id = compagnieId || undefined;
      if (edition) await api.put(`/api/admin/compagnies/updateCompagnie/${compagnieId}`, { ...base, modes_paiement: modes });
      else {
        const r = await api.post('/api/admin/compagnies/creerCompagnie', {
          ...base,
          modes_paiement: [],
          partenaires,
          admin_prenom: f.adminPrenom.trim(),
          admin_nom: f.adminNom.trim(),
          admin_email: f.adminEmail.trim(),
          admin_telephone: f.adminTelephone.trim(),
          admin_mot_de_passe: f.adminMdp,
        });
        id = r.data?.data?.compagnie?.id;
      }
      queryClient.invalidateQueries({ queryKey: ['systeme'] });
      setMessage({ titre: edition ? 'Compagnie modifiée' : 'Compagnie créée', texte: edition ? 'Les modifications sont enregistrées.' : `${f.adminPrenom} peut maintenant se connecter avec ${f.adminEmail}.`, ok: true });
      onEnregistre?.(id);
    } catch (e) {
      setMessage({ titre: edition ? 'Modification impossible' : 'Création impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  const chargement = provinces.isLoading || (edition && existante.isLoading);
  return (
    <Tiroir
      ouvert={ouvert}
      titre={edition ? 'Modifier la compagnie' : 'Nouvelle compagnie'}
      sousTitre={`Étape ${etape + 1} sur ${etapes.length} · ${etapes[etape]}`}
      onFermer={onFermer}
      pied={
        <>
          {etape > 0 && (
            <Bouton variante="secondaire" onClick={() => setEtape(etape - 1)}>
              Retour
            </Bouton>
          )}
          <Bouton icone={etape === etapes.length - 1 ? Check : undefined} onClick={suivant} chargement={envoi} className="flex-1">
            {etape < etapes.length - 1 ? 'Continuer' : edition ? 'Enregistrer' : 'Créer la compagnie'}
          </Bouton>
        </>
      }
    >
      {/* Progression */}
      <ol className="m-0 mb-5 flex list-none gap-2 p-0" aria-label="Étapes">
        {etapes.map((e, i) => (
          <li key={e} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= etape ? 'bg-ocean-800' : 'bg-champ'}`} />
            <span className={`text-[12px] font-bold ${i === etape ? 'text-ocean-800' : 'text-encre-douce'}`}>
              {i + 1}. {e}
            </span>
          </li>
        ))}
      </ol>

      {chargement ? (
        <Squelette className="h-64" />
      ) : etape === 0 ? (
        <div className="flex flex-col gap-3">
          <Champ libelle="Nom de la compagnie" value={f.nom} onChange={(e) => maj({ nom: e.target.value })} placeholder="Mahery Trans" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-encre-douce">Description</span>
            <textarea value={f.description} onChange={(e) => maj({ description: e.target.value })} rows={3} placeholder="Ce que les voyageurs doivent savoir" className="rounded-champ border-[1.5px] border-champ px-3 py-2.5 text-sm font-semibold outline-none focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Téléphone" type="tel" value={f.telephone} onChange={(e) => maj({ telephone: e.target.value })} placeholder="034 00 000 00" />
            <Champ libelle="E-mail" type="email" value={f.email} onChange={(e) => maj({ email: e.target.value })} placeholder="contact@…" />
          </div>
          <Champ libelle="Adresse du siège" value={f.adresse} onChange={(e) => maj({ adresse: e.target.value })} placeholder="Lot, quartier, ville" />
        </div>
      ) : etape === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecteur
              libelle="Province du siège"
              value={f.localisation}
              onChange={(e) => {
                maj({ localisation: e.target.value });
                const id = Number(e.target.value);
                if (id) setDesservies((d) => (d.includes(id) ? d : [...d, id]));
              }}
            >
              <option value="">Choisir</option>
              {(provinces.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Selecteur>
            <Selecteur libelle="Collecte de la commission" value={f.frequence} onChange={(e) => maj({ frequence: e.target.value })}>
              <option value="mensuelle">Mensuelle</option>
              <option value="hebdomadaire">Hebdomadaire</option>
            </Selecteur>
            <Champ libelle="NIF" value={f.nif} inputMode="numeric" onChange={(e) => maj({ nif: e.target.value })} />
            <Champ libelle="STAT" value={f.stat} onChange={(e) => maj({ stat: e.target.value })} placeholder="N° statistique" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-bold text-encre-douce">Provinces desservies (les trajets ne pourront arriver que dans ces provinces)</span>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
              {(provinces.data || []).map((p) => {
                const actif = desservies.includes(Number(p.id));
                return (
                  <label key={p.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-[14px] font-bold ${actif ? 'border-ocean-800 bg-ocean-50' : 'border-champ bg-white'}`}>
                    <input type="checkbox" checked={actif} onChange={() => setDesservies((d) => (actif ? d.filter((x) => x !== Number(p.id)) : [...d, Number(p.id)]))} className="h-[18px] w-[18px] accent-ocean-800" />
                    {p.nom}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-carte border border-ligne bg-white p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={f.papiActif} onChange={(e) => maj({ papiActif: e.target.checked })} className="h-5 w-5 accent-ocean-800" />
              <span>
                <b className="block text-[14px]">Paiement en ligne (PAPI)</b>
                <span className="text-[12.5px] font-semibold text-encre-douce">{papiConfigure ? 'Clé PAPI déjà configurée' : 'Les clients paient en ligne via PAPI'}</span>
              </span>
            </label>
            {f.papiActif && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ libelle="Clé API PAPI" type="password" autoComplete="off" value={f.papiCle} onChange={(e) => maj({ papiCle: e.target.value })} aide={papiConfigure ? 'Laissez vide pour garder la clé actuelle.' : undefined} />
                <Champ libelle="Secret du webhook" type="password" autoComplete="off" value={f.papiSecret} onChange={(e) => maj({ papiSecret: e.target.value })} />
              </div>
            )}
          </div>
        </div>
      ) : etape === 2 ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] font-semibold leading-relaxed text-encre-douce">
            Elles accueilleront les voitures de cette compagnie à destination : au départ, elles reçoivent le véhicule, le chauffeur et la liste des voyageurs, puis confirment l’arrivée. L’administrateur pourra en ajouter ou en retirer.
          </p>
          {(compagnies.data || []).length === 0 ? (
            <p className="m-0 rounded-xl bg-ocean-50 p-3 text-[14px] font-bold text-ocean-800">C’est la première compagnie : aucun partenaire à choisir pour le moment.</p>
          ) : (
            <>
              <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
                <Search className="h-4 w-4 text-encre-douce" aria-hidden />
                <input value={rechercheP} onChange={(e) => setRechercheP(e.target.value)} placeholder="Nom de la compagnie ou province" aria-label="Rechercher une compagnie" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
              </span>
              <b className="text-[13px] text-ocean-800">
                {partenaires.length} choisie{partenaires.length > 1 ? 's' : ''} sur {(compagnies.data || []).length}
              </b>
              <div className="flex max-h-[380px] flex-col overflow-auto rounded-xl border border-ligne bg-white">
                {autres.map((c, i) => {
                  const actif = partenaires.includes(Number(c.id));
                  return (
                    <label key={c.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${i ? 'border-t border-separateur' : ''} ${actif ? 'bg-ocean-50' : 'hover:bg-[#F8FAFD]'}`}>
                      <input type="checkbox" checked={actif} onChange={() => setPartenaires((p) => (actif ? p.filter((x) => x !== Number(c.id)) : [...p, Number(c.id)]))} className="h-5 w-5 accent-ocean-800" />
                      <span className="flex-1 text-[14px] font-bold">{c.nom}</span>
                      <span className="text-[13px] font-semibold text-encre-douce">{c.localisation?.nom || ''}</span>
                    </label>
                  );
                })}
                {autres.length === 0 && <p className="m-0 p-4 text-center text-[14px] font-semibold text-encre-douce">Aucune compagnie ne correspond.</p>}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] font-semibold text-encre-douce">Ce compte gérera la compagnie dans l’application et sur le back-office (voyages, véhicules, paiements).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Prénom" value={f.adminPrenom} onChange={(e) => maj({ adminPrenom: e.target.value })} />
            <Champ libelle="Nom" value={f.adminNom} onChange={(e) => maj({ adminNom: e.target.value })} />
            <Champ libelle="E-mail de connexion" type="email" autoComplete="off" value={f.adminEmail} onChange={(e) => maj({ adminEmail: e.target.value })} />
            <Champ libelle="Téléphone" type="tel" value={f.adminTelephone} onChange={(e) => maj({ adminTelephone: e.target.value })} />
          </div>
          <Champ libelle="Mot de passe provisoire" type="password" autoComplete="new-password" value={f.adminMdp} onChange={(e) => maj({ adminMdp: e.target.value })} aide="Au moins 6 caractères. À transmettre à l’administrateur, qui pourra le changer." />
        </div>
      )}

      <Dialogue
        ouvert={!!message}
        titre={message?.titre || ''}
        onFermer={() => {
          const ok = message?.ok;
          setMessage(null);
          if (ok) onFermer();
        }}
      >
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}
