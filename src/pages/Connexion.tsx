import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock } from 'lucide-react';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { messageErreur } from '@/api/client';
import { Bouton, Champ } from '@/components/ui';

export default function Connexion() {
  const { utilisateur, expiree, connecter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (utilisateur) return <Navigate to={accueilDe(utilisateur)} replace />;

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifiant.trim() || !motDePasse) {
      setErreur('Saisissez votre e-mail (ou téléphone) et votre mot de passe.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const u = await connecter(identifiant, motDePasse);
      // Retour à la page demandée si elle correspond au rôle
      const depuis: string | undefined = (location.state as any)?.depuis;
      const prefixe = u.role === 3 ? '/systeme' : '/compagnie';
      const commun = depuis === '/notifications' || depuis === '/profil';
      navigate(depuis && (depuis.startsWith(prefixe) || commun) ? depuis : accueilDe(u), { replace: true });
    } catch (e) {
      setErreur(messageErreur(e, 'Connexion impossible.'));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-fond font-sans text-encre">
      {/* Bandeau marine (grand écran) */}
      <section className="hidden flex-1 flex-col justify-between bg-ocean-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ocean-800 text-xl font-extrabold">F</span>
          <b className="text-xl tracking-wide">FANDRIO</b>
        </div>
        <div className="max-w-md">
          <h1 className="m-0 text-4xl font-extrabold leading-tight">Le back-office des compagnies de voyage</h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-marine-texte">
            Vente au guichet, embarquement, planning, suivi des voitures et finances : tout ce que vous faites sur l’application mobile, depuis votre ordinateur.
          </p>
        </div>
        <span className="text-xs font-semibold text-marine-section">Espace réservé aux administrateurs</span>
      </section>

      {/* Formulaire */}
      <main className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={envoyer} noValidate className="flex w-full max-w-[400px] flex-col gap-4">
          <div className="mb-2 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ocean-800 text-xl font-extrabold text-white">F</span>
            <b className="text-xl tracking-wide">FANDRIO</b>
          </div>
          <div>
            <h2 className="m-0 text-2xl font-extrabold">Connexion</h2>
            <p className="mt-1 text-sm font-semibold text-gris">Avec les identifiants de votre compte administrateur.</p>
          </div>

          {expiree && !erreur && (
            <div role="status" className="flex items-start gap-2.5 rounded-xl border border-alerte-bord bg-alerte-fond p-3 text-[13px] font-bold text-alerte">
              <Clock className="mt-px h-[18px] w-[18px] flex-none" aria-hidden />
              Votre session a expiré. Reconnectez-vous pour continuer.
            </div>
          )}
          {erreur && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger-bord bg-danger-fond p-3 text-[13px] font-bold text-danger">
              <AlertCircle className="mt-px h-[18px] w-[18px] flex-none" aria-hidden />
              {erreur}
            </div>
          )}

          <Champ libelle="E-mail ou téléphone" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" autoFocus />
          <Champ libelle="Mot de passe" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" />
          <Bouton type="submit" chargement={envoi} className="mt-2 h-12">
            Se connecter
          </Bouton>
          <p className="m-0 text-center text-xs font-semibold text-gris">Mot de passe oublié ? Contactez l’administrateur FANDRIO.</p>
        </form>
      </main>
    </div>
  );
}
