import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { session } from '@/auth/session';
import logoFandrio from '@/assets/logo-fandrio.png';

/**
 * Premier mot de passe : la personne s'est connectée avec un mot de passe
 * provisoire (donné par l'admin principal ou par FANDRIO). Elle choisit son
 * mot de passe personnel avant d'accéder au back-office.
 */
export default function PremierMotDePasse() {
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();
  const [provisoire, setProvisoire] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (!utilisateur) return <Navigate to="/connexion" replace />;
  if (!utilisateur.mdp_provisoire) return <Navigate to={accueilDe(utilisateur)} replace />;

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!provisoire.trim()) return setErreur('Saisissez le mot de passe provisoire qu’on vous a donné.');
    if (nouveau.length < 6) return setErreur('Votre nouveau mot de passe doit contenir au moins 6 caractères.');
    if (nouveau !== confirmation) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setEnvoi(true);
    setErreur(null);
    try {
      await api.put('/api/profil/mot-de-passe', {
        ancien_mot_de_passe: provisoire.trim().toUpperCase(),
        nouveau_mot_de_passe: nouveau,
        nouveau_mot_de_passe_confirmation: confirmation,
      });
      session.majUtilisateur({ mdp_provisoire: false });
      navigate(accueilDe(utilisateur), { replace: true });
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible d’enregistrer le mot de passe.'));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'h-12 w-full rounded-xl border-[1.5px] border-champ bg-[#F7FAFD] px-4 text-[14.5px] font-semibold text-encre outline-none transition placeholder:font-medium placeholder:text-gris-clair focus:border-ocean-800 focus:bg-white focus:ring-4 focus:ring-ocean-500/15';

  return (
    <div className="flex min-h-screen items-center justify-center bg-fond p-4 font-sans text-encre">
      <form onSubmit={envoyer} noValidate className="w-full max-w-[460px] rounded-[28px] border border-white bg-white px-7 pb-8 pt-9 shadow-[0_40px_90px_-30px_rgba(6,42,74,0.45)] sm:px-10">
        <div className="flex flex-col items-center text-center">
          <img src={logoFandrio} alt="" className="h-14 w-14" />
          <h1 className="m-0 mt-5 text-[24px] font-extrabold">Choisissez votre mot de passe</h1>
          <p className="m-0 mt-2 text-[14px] font-semibold leading-relaxed text-encre-douce">
            Bonjour {utilisateur.prenom}, vous vous êtes connecté avec un mot de passe provisoire. Choisissez maintenant votre mot de passe personnel : vous seul le connaîtrez.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-4">
          {erreur && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger-bord bg-danger-fond p-3 text-[13px] font-bold text-danger">
              <AlertCircle className="mt-px h-[18px] w-[18px] flex-none" aria-hidden />
              {erreur}
            </div>
          )}
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[13px] font-extrabold"><KeyRound className="h-4 w-4 text-ocean-800" aria-hidden />Mot de passe provisoire</span>
            <input value={provisoire} onChange={(e) => setProvisoire(e.target.value)} autoComplete="current-password" autoFocus placeholder="Ex. : K7M4-Q9TP" className={`${champ} uppercase tracking-[0.08em] placeholder:normal-case placeholder:tracking-normal`} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[13px] font-extrabold"><ShieldCheck className="h-4 w-4 text-ocean-800" aria-hidden />Nouveau mot de passe</span>
            <span className="relative">
              <input type={voir ? 'text' : 'password'} value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" placeholder="Au moins 6 caractères" className={`${champ} pr-12`} />
              <button type="button" onClick={() => setVoir(!voir)} aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-encre-douce hover:bg-ocean-50">
                {voir ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-extrabold">Confirmez le nouveau mot de passe</span>
            <input type={voir ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" className={champ} />
          </label>
          <button type="submit" disabled={envoi} className="mt-2 h-[52px] rounded-xl bg-gradient-to-r from-ocean-800 to-ocean-950 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(11,79,138,0.8)] transition hover:brightness-110 disabled:opacity-70">
            {envoi ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
          <button type="button" onClick={() => deconnecter()} className="inline-flex items-center justify-center gap-1.5 self-center rounded-lg px-2 py-1 text-[13.5px] font-extrabold text-ocean-800 hover:bg-ocean-50">
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      </form>
    </div>
  );
}
