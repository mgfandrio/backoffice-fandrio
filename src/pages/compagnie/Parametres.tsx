import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Trash2 } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { session } from '@/auth/session';
import { Bouton, Carte, Champ, Dialogue, Selecteur, Squelette } from '@/components/ui';
import { initiales } from '@/utils/format';

/** Informations publiques de la compagnie (vues par les clients), provinces desservies et logo. */
export default function Parametres() {
  const queryClient = useQueryClient();
  const fichier = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ description: '', telephone: '', email: '', adresse: '', localisation: '' });
  const [desservies, setDesservies] = useState<number[]>([]);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoiLogo, setEnvoiLogo] = useState(false);
  const [retirerLogo, setRetirerLogo] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const compagnie = useQuery({ queryKey: ['ma-compagnie'], queryFn: async () => (await obtenir('/api/adminCompagnie/ma-compagnie')).data });
  const provinces = useQuery({ queryKey: ['provinces'], queryFn: async () => ((await obtenir('/api/adminCompagnie/provinces/recuperListeProvince', { per_page: 200 })).data?.provinces || []) as any[], staleTime: 10 * 60_000 });
  const c = compagnie.data;

  useEffect(() => {
    if (!c) return;
    setF({ description: c.description || '', telephone: c.telephone || '', email: c.email || '', adresse: c.adresse || '', localisation: c.localisation?.id ? String(c.localisation.id) : '' });
    setDesservies((c.provinces_desservies || []).map((p: any) => Number(p.id)));
  }, [c]);

  const basculer = (id: number) => setDesservies((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const enregistrer = async () => {
    const e: Record<string, string> = {};
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (desservies.length === 0) e.provinces = 'Choisissez au moins une province desservie.';
    setErreurs(e);
    if (Object.keys(e).length) return;
    setEnvoi(true);
    try {
      await api.put('/api/adminCompagnie/ma-compagnie', {
        comp_description: f.description.trim() || null,
        comp_phone: f.telephone.trim() || null,
        comp_email: f.email.trim() || null,
        comp_adresse: f.adresse.trim() || null,
        comp_localisation: f.localisation ? Number(f.localisation) : null,
        provinces_desservies: desservies,
      });
      queryClient.invalidateQueries({ queryKey: ['ma-compagnie'] });
      setMessage({ titre: 'C’est enregistré', texte: 'Les clients voient désormais ces informations sur la fiche de votre compagnie.' });
    } catch (err) {
      setMessage({ titre: 'Enregistrement impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  };

  const choisirLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const fi = e.target.files?.[0];
    e.target.value = '';
    if (!fi) return;
    if (fi.size > 5 * 1024 * 1024) return setMessage({ titre: 'Image trop lourde', texte: 'Le logo ne doit pas dépasser 5 Mo.' });
    setEnvoiLogo(true);
    try {
      const d = new FormData();
      d.append('logo', fi);
      const r = await api.post('/api/adminCompagnie/logo', d);
      const url = r.data?.data?.logo_url || null;
      const u = session.utilisateur();
      if (u?.compagnie) session.majUtilisateur({ compagnie: { ...u.compagnie, logo: url } });
      queryClient.invalidateQueries({ queryKey: ['ma-compagnie'] });
    } catch (err) {
      setMessage({ titre: 'Logo non modifié', texte: messageErreur(err) });
    } finally {
      setEnvoiLogo(false);
    }
  };

  const supprimerLogo = async () => {
    setEnvoiLogo(true);
    try {
      await api.delete('/api/adminCompagnie/logo');
      const u = session.utilisateur();
      if (u?.compagnie) session.majUtilisateur({ compagnie: { ...u.compagnie, logo: null } });
      queryClient.invalidateQueries({ queryKey: ['ma-compagnie'] });
    } catch (err) {
      setMessage({ titre: 'Logo non retiré', texte: messageErreur(err) });
    } finally {
      setEnvoiLogo(false);
      setRetirerLogo(false);
    }
  };

  if (compagnie.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:px-7 sm:py-6">
        <Squelette className="h-28" />
        <Squelette className="h-80" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <Carte marine className="flex flex-wrap items-center gap-4 p-5">
        {c?.logo ? (
          <img src={c.logo} alt="" className="h-[72px] w-[72px] rounded-[20px] bg-white object-cover" />
        ) : (
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-white text-2xl font-extrabold text-ocean-950">{initiales(c?.nom)}</span>
        )}
        <div className="min-w-0 flex-1">
          <b className="block text-lg">{c?.nom}</b>
          <span className="text-[13px] font-semibold text-[#DCE8F5]">Logo affiché aux voyageurs · image carrée, 5 Mo maximum</span>
        </div>
        <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choisirLogo} />
        <div className="flex flex-wrap gap-2">
          <Bouton variante="secondaire" icone={Camera} onClick={() => fichier.current?.click()} chargement={envoiLogo}>
            {c?.logo ? 'Changer le logo' : 'Ajouter un logo'}
          </Bouton>
          {c?.logo && (
            <Bouton variante="danger" icone={Trash2} onClick={() => setRetirerLogo(true)} disabled={envoiLogo}>
              Retirer
            </Bouton>
          )}
        </div>
      </Carte>

      <Carte className="flex flex-col gap-4 p-5">
        <h2 className="m-0 text-base font-extrabold">Informations publiques</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Description</span>
          <textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value.slice(0, 2000) })}
            rows={4}
            placeholder="Ce que les voyageurs doivent savoir sur votre compagnie"
            className="rounded-champ border-[1.5px] border-champ bg-white px-3 py-2.5 text-sm font-semibold text-encre outline-none focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Téléphone" type="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} />
          <Champ libelle="E-mail" type="email" value={f.email} erreur={erreurs.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Champ libelle="Adresse" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} />
          <Selecteur libelle="Ville du siège" value={f.localisation} onChange={(e) => setF({ ...f, localisation: e.target.value })} aide="C’est la ville de départ de vos trajets.">
            <option value="">Choisir</option>
            {(provinces.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </Selecteur>
        </div>
      </Carte>

      <Carte className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="m-0 text-base font-extrabold">Provinces desservies</h2>
          <p className="m-0 mt-0.5 text-[13.5px] font-semibold text-encre-douce">Les clients vous trouvent quand ils cherchent un voyage vers ces provinces. Vos trajets ne peuvent arriver que dans ces provinces.</p>
        </div>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
          {(provinces.data || []).map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-[14px] font-bold ${desservies.includes(Number(p.id)) ? 'border-ocean-800 bg-ocean-50' : 'border-champ bg-white'}`}>
              <input type="checkbox" checked={desservies.includes(Number(p.id))} onChange={() => basculer(Number(p.id))} className="h-[18px] w-[18px] accent-ocean-800" />
              {p.nom}
            </label>
          ))}
        </div>
        {erreurs.provinces && <span className="text-xs font-bold text-danger">{erreurs.provinces}</span>}
      </Carte>

      <div className="flex justify-end">
        <Bouton icone={Check} onClick={enregistrer} chargement={envoi}>
          Enregistrer
        </Bouton>
      </div>

      <Dialogue ouvert={retirerLogo} titre="Retirer le logo ?" confirmer="Retirer" danger chargement={envoiLogo} onConfirmer={supprimerLogo} onFermer={() => setRetirerLogo(false)}>
        Les initiales de la compagnie seront affichées à la place.
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
