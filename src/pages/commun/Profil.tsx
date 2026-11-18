import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Camera, Check, KeyRound, Trash2 } from 'lucide-react';
import { api, ErreurApi, messageErreur } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { session } from '@/auth/session';
import { Bouton, Carte, Champ, Dialogue } from '@/components/ui';
import { initiales } from '@/utils/format';

/** Mon profil : identité, photo, mot de passe (mêmes routes que l'app mobile). */
export default function Profil() {
  const { utilisateur } = useAuth();
  const [form, setForm] = useState({
    nom: utilisateur?.nom || '',
    prenom: utilisateur?.prenom || '',
    email: utilisateur?.email || '',
    telephone: utilisateur?.telephone || '',
  });
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [erreursInfos, setErreursInfos] = useState<Record<string, string>>({});
  const [erreursMdp, setErreursMdp] = useState<Record<string, string>>({});
  const [envoiInfos, setEnvoiInfos] = useState(false);
  const [envoiMdp, setEnvoiMdp] = useState(false);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const [retirerPhoto, setRetirerPhoto] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  const nom = `${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}`.trim();
  const champsErreurs = (e: unknown): Record<string, string> =>
    e instanceof ErreurApi && e.erreurs ? Object.fromEntries(Object.entries(e.erreurs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])) : {};

  const enregistrerInfos = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.nom.trim()) err.nom = 'Indiquez votre nom.';
    if (!form.prenom.trim()) err.prenom = 'Indiquez votre prénom.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) err.email = 'Adresse e-mail invalide.';
    if (!form.telephone.trim()) err.telephone = 'Indiquez votre téléphone.';
    setErreursInfos(err);
    if (Object.keys(err).length) return;
    setEnvoiInfos(true);
    try {
      const r = await api.put('/api/profil', {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
      });
      session.majUtilisateur({ nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim(), telephone: form.telephone.trim(), ...(r.data?.utilisateur?.photo !== undefined ? { photo: r.data.utilisateur.photo } : {}) });
      setMessage({ titre: 'Profil enregistré', texte: 'Vos informations sont à jour.' });
    } catch (e) {
      setErreursInfos(champsErreurs(e));
      if (!(e instanceof ErreurApi && e.erreurs)) setMessage({ titre: 'Profil non enregistré', texte: messageErreur(e) });
    } finally {
      setEnvoiInfos(false);
    }
  };

  const changerMotDePasse = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!mdp.ancien) err.ancien = 'Saisissez votre mot de passe actuel.';
    if (mdp.nouveau.length < 6) err.nouveau = 'Au moins 6 caractères.';
    if (mdp.confirmation !== mdp.nouveau) err.confirmation = 'Les deux mots de passe ne sont pas identiques.';
    setErreursMdp(err);
    if (Object.keys(err).length) return;
    setEnvoiMdp(true);
    try {
      await api.put('/api/profil/mot-de-passe', {
        ancien_mot_de_passe: mdp.ancien,
        nouveau_mot_de_passe: mdp.nouveau,
        nouveau_mot_de_passe_confirmation: mdp.confirmation,
      });
      setMdp({ ancien: '', nouveau: '', confirmation: '' });
      setMessage({ titre: 'Mot de passe modifié', texte: 'Utilisez le nouveau mot de passe à votre prochaine connexion, sur le web comme sur mobile.' });
    } catch (e) {
      const c = champsErreurs(e);
      setErreursMdp({ ancien: c.ancien_mot_de_passe || (!Object.keys(c).length ? messageErreur(e) : ''), nouveau: c.nouveau_mot_de_passe || '' });
    } finally {
      setEnvoiMdp(false);
    }
  };

  const choisirPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setMessage({ titre: 'Image trop lourde', texte: 'La photo ne doit pas dépasser 5 Mo.' });
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setMessage({ titre: 'Format non pris en charge', texte: 'Choisissez une image JPEG, PNG ou WebP.' });
    setEnvoiPhoto(true);
    try {
      const donnees = new FormData();
      donnees.append('photo', f);
      const r = await api.post('/api/profil/photo', donnees);
      session.majUtilisateur({ photo: r.data?.data?.photo_url || null });
    } catch (err) {
      setMessage({ titre: 'Photo non modifiée', texte: messageErreur(err) });
    } finally {
      setEnvoiPhoto(false);
    }
  };

  const supprimerPhoto = async () => {
    setEnvoiPhoto(true);
    try {
      await api.delete('/api/profil/photo');
      session.majUtilisateur({ photo: null });
      setRetirerPhoto(false);
    } catch (err) {
      setRetirerPhoto(false);
      setMessage({ titre: 'Photo non retirée', texte: messageErreur(err) });
    } finally {
      setEnvoiPhoto(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:px-7 sm:py-6">
      {/* Identité */}
      <Carte marine className="flex flex-wrap items-center gap-4 p-5">
        <div className="relative">
          {utilisateur?.photo ? (
            <img src={utilisateur.photo} alt="" className="h-[72px] w-[72px] rounded-[20px] object-cover" />
          ) : (
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-ocean-800 text-2xl font-extrabold">{initiales(nom)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <b className="block text-lg">{nom}</b>
          <span className="block text-[13px] font-semibold text-marine-texte">
            {utilisateur?.role === 3 ? 'Admin système' : `Admin compagnie · ${utilisateur?.compagnie?.nom || ''}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choisirPhoto} />
          <Bouton variante="secondaire" icone={Camera} onClick={() => fichier.current?.click()} chargement={envoiPhoto}>
            {utilisateur?.photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Bouton>
          {utilisateur?.photo && (
            <Bouton variante="danger" icone={Trash2} onClick={() => setRetirerPhoto(true)} disabled={envoiPhoto}>
              Retirer
            </Bouton>
          )}
        </div>
      </Carte>

      <Carte className="p-5">
        <form onSubmit={enregistrerInfos} noValidate className="flex flex-col gap-4">
          <h2 className="m-0 text-base font-extrabold">Informations personnelles</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Prénom" value={form.prenom} erreur={erreursInfos.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} autoComplete="given-name" />
            <Champ libelle="Nom" value={form.nom} erreur={erreursInfos.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoComplete="family-name" />
            <Champ libelle="E-mail de connexion" type="email" value={form.email} erreur={erreursInfos.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            <Champ libelle="Téléphone" type="tel" value={form.telephone} erreur={erreursInfos.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} autoComplete="tel" />
          </div>
          <div>
            <Bouton type="submit" icone={Check} chargement={envoiInfos}>
              Enregistrer
            </Bouton>
          </div>
        </form>
      </Carte>

      <Carte className="p-5">
        <form onSubmit={changerMotDePasse} noValidate className="flex flex-col gap-4">
          <h2 className="m-0 text-base font-extrabold">Mot de passe</h2>
          <Champ libelle="Mot de passe actuel" type="password" value={mdp.ancien} erreur={erreursMdp.ancien} onChange={(e) => setMdp({ ...mdp, ancien: e.target.value })} autoComplete="current-password" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Nouveau mot de passe" type="password" value={mdp.nouveau} erreur={erreursMdp.nouveau} aide="Au moins 6 caractères." onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })} autoComplete="new-password" />
            <Champ libelle="Confirmer le nouveau mot de passe" type="password" value={mdp.confirmation} erreur={erreursMdp.confirmation} onChange={(e) => setMdp({ ...mdp, confirmation: e.target.value })} autoComplete="new-password" />
          </div>
          <div>
            <Bouton type="submit" variante="secondaire" icone={KeyRound} chargement={envoiMdp}>
              Changer le mot de passe
            </Bouton>
          </div>
        </form>
      </Carte>

      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
      <Dialogue ouvert={retirerPhoto} titre="Retirer la photo ?" confirmer="Retirer" danger chargement={envoiPhoto} onConfirmer={supprimerPhoto} onFermer={() => setRetirerPhoto(false)}>
        Vos initiales seront affichées à la place.
      </Dialogue>
    </div>
  );
}
