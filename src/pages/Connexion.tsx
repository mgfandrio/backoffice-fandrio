import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, Navigation, ShieldCheck, Store } from 'lucide-react';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { messageErreur } from '@/api/client';
import { Paysage } from '@/components/connexion/Paysage';
import logoFandrio from '@/assets/logo-fandrio.png';

/** Logo FANDRIO (même image que l'application mobile). */
function Logo({ className = '' }: { className?: string }) {
  return <img src={logoFandrio} alt="" className={className} />;
}

const ATOUTS = [
  { icone: Store, libelle: 'Vente au guichet' },
  { icone: Navigation, libelle: 'Suivi en temps réel' },
  { icone: ShieldCheck, libelle: 'Accès sécurisé' },
];

export default function Connexion() {
  const { utilisateur, expiree, connecter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [voir, setVoir] = useState(false);
  const [aide, setAide] = useState(false);
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

  const champ =
    'h-12 w-full rounded-xl border-[1.5px] border-champ bg-[#F7FAFD] pl-11 text-[14.5px] font-semibold text-encre outline-none transition placeholder:font-medium placeholder:text-gris-clair hover:border-ocean-200 focus:border-ocean-800 focus:bg-white focus:ring-4 focus:ring-ocean-500/15';

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F3F7FB] font-sans text-encre lg:flex-row">
      {/* ── Visuel ── */}
      <section className="relative isolate flex min-h-[300px] flex-col overflow-hidden text-white lg:min-h-screen lg:w-[56%]">
        <Paysage className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#020E1C]/80 via-[#031A30]/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#020E1C]/60 to-transparent" />

        {/* Bord droit en arc unique, avec un halo clair (grand écran) */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[22%] lg:block" aria-hidden>
          <path d="M70 0 C66 42 40 76 0 100 L100 100 L100 0 Z" fill="#FFFFFF" opacity="0.18" />
          <path d="M78 0 C75 44 50 78 10 100 L100 100 L100 0 Z" fill="#F3F7FB" />
        </svg>
        <header className="flex items-center gap-3 p-6 sm:p-10">
          <Logo className="h-12 w-12 drop-shadow-[0_8px_20px_rgba(46,143,224,0.45)]" />
          <span>
            <b className="block text-[22px] font-extrabold leading-none tracking-[0.06em]">FANDRIO</b>
            <span className="mt-1 block text-[12px] font-semibold tracking-wide text-white/70">Voyagez. Réservez. Partez.</span>
          </span>
        </header>

        <div className="hidden flex-1 flex-col justify-center px-10 pb-10 lg:flex xl:px-14">
          <h1 className="m-0 text-[40px] font-extrabold leading-[1.1] tracking-[-0.01em] xl:text-[50px]">
            Pilotez votre compagnie,
            <br />
            <span className="whitespace-nowrap bg-gradient-to-r from-[#7CC2FF] to-[#FFD08A] bg-clip-text text-transparent">du guichet à l’arrivée.</span>
          </h1>
          <p className="mt-5 max-w-[440px] text-[16px] font-medium leading-relaxed text-white/80">
            Ventes, embarquement, départs et recettes réunis sur un seul écran. Moins de papier, plus de voyageurs, et chaque trajet sous contrôle.
          </p>
          <ul className="m-0 mt-9 flex list-none flex-wrap gap-3 p-0">
            {ATOUTS.map(({ icone: Icone, libelle }) => (
              <li key={libelle} className="flex w-[132px] flex-col items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Icone className="h-5 w-5 text-[#9FD2FF]" aria-hidden />
                </span>
                <span className="text-[12.5px] font-bold leading-tight">{libelle}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-auto hidden px-10 pb-8 text-[12px] font-semibold text-white/55 lg:block xl:px-14">© {new Date().getFullYear()} FANDRIO · Madagascar</footer>
      </section>

      {/* ── Formulaire ── */}
      <main className="relative z-10 -mt-24 flex flex-1 items-start justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-10 lg:pb-0">
        {/* Trame de points discrète */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 hidden opacity-60 lg:block"
          style={{
            backgroundImage: 'radial-gradient(#C9DBEE 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 70% 40%, #000 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 70% 40%, #000 20%, transparent 75%)',
          }}
        />

        <form onSubmit={envoyer} noValidate className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white bg-white/95 px-7 pb-9 pt-10 shadow-[0_40px_90px_-30px_rgba(6,42,74,0.45),0_2px_6px_rgba(6,42,74,0.06)] backdrop-blur sm:px-10">
          {/* Vague décorative */}
          <svg viewBox="0 0 430 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full" aria-hidden>
            <defs>
              <linearGradient id="vague" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#2E8FE0" stopOpacity="0" />
                <stop offset="1" stopColor="#0B4F8A" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path d="M0 120 C140 120 260 100 330 60 C370 38 400 22 430 0 L430 120 Z" fill="url(#vague)" />
            <path d="M120 120 C230 112 320 92 430 40 L430 120 Z" fill="#062A4A" opacity="0.9" />
          </svg>

          <div className="relative flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ocean-50 ring-8 ring-ocean-50/50">
              <Logo className="h-11 w-11" />
            </span>
            <h2 className="m-0 mt-5 text-[28px] font-extrabold tracking-[-0.01em]">Connexion</h2>
            <p className="m-0 mt-1.5 text-[14px] font-semibold text-encre-douce">Accédez à votre espace administrateur</p>
          </div>

          <div className="relative mt-8 flex flex-col gap-5">
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

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-encre">
                <Mail className="h-4 w-4 text-ocean-800" aria-hidden />
                E-mail ou téléphone
              </span>
              <span className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gris-clair" aria-hidden />
                <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" autoFocus placeholder="ex. nom@domaine.com" className={champ} />
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[13px] font-extrabold text-encre">
                <LockKeyhole className="h-4 w-4 text-ocean-800" aria-hidden />
                Mot de passe
              </span>
              <span className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gris-clair" aria-hidden />
                <input type={voir ? 'text' : 'password'} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" placeholder="Votre mot de passe" className={`${champ} pr-12`} />
                <button type="button" onClick={() => setVoir(!voir)} aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-encre-douce hover:bg-ocean-50 hover:text-ocean-800">
                  {voir ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={envoi}
              className="group mt-2 flex h-[52px] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-ocean-800 to-ocean-950 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(11,79,138,0.8)] transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500/30 disabled:opacity-70"
            >
              {envoi ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              {envoi ? 'Connexion…' : 'Se connecter'}
              {!envoi && <ArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" aria-hidden />}
            </button>

            <div className="flex items-center gap-3 text-[12px] font-bold text-gris-clair">
              <span className="h-px flex-1 bg-separateur" />
              ou
              <span className="h-px flex-1 bg-separateur" />
            </div>

            <div className="pb-6 text-center">
              <button type="button" onClick={() => setAide(!aide)} aria-expanded={aide} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13.5px] font-extrabold text-ocean-800 hover:bg-ocean-50">
                <KeyRound className="h-4 w-4" aria-hidden />
                Mot de passe oublié ?
              </button>
              {aide && (
                <p className="m-0 mt-2 rounded-xl bg-ocean-50 px-4 py-3 text-[13px] font-semibold leading-relaxed text-ocean-950">
                  Pour des raisons de sécurité, contactez l’administrateur FANDRIO : il vous donnera un nouveau mot de passe.
                </p>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
