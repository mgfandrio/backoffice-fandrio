import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu as IconeMenu, Plus, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useNonLues } from '@/api/requetes';
import { entreeDe } from '@/navigation/menus';
import { Bouton, Dialogue } from '@/components/ui';
import { Menu } from './Menu';

/**
 * Cadre du back-office : menu latéral (fixe sur grand écran, tiroir sur petit
 * écran), barre du haut avec le titre, les notifications et la vente rapide.
 */
export function AppLayout() {
  const { utilisateur, deconnecter } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tiroir, setTiroir] = useState(false);
  const [confirmerSortie, setConfirmerSortie] = useState(false);
  const [sortie, setSortie] = useState(false);
  const { data: nonLues = 0 } = useNonLues();
  const entree = entreeDe(utilisateur?.role, location.pathname);
  const compagnie = utilisateur?.role === 2;

  // Titre de l'onglet du navigateur
  useEffect(() => {
    document.title = `${entree?.libelle || 'Back-office'} · FANDRIO`;
  }, [entree]);

  // F2 : nouvelle vente au guichet (admin compagnie)
  useEffect(() => {
    if (!compagnie) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/compagnie/guichet');
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [compagnie, navigate]);

  // Le tiroir se ferme au changement de page
  useEffect(() => setTiroir(false), [location.pathname]);

  const seDeconnecter = async () => {
    setSortie(true);
    await deconnecter();
    setSortie(false);
    setConfirmerSortie(false);
    navigate('/connexion', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-fond font-sans text-encre">
      {/* Menu fixe (grand écran) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none lg:block">
        <Menu onDeconnexion={() => setConfirmerSortie(true)} />
      </aside>

      {/* Menu en tiroir (petit écran) */}
      {tiroir && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ocean-950/50" aria-label="Fermer le menu" onClick={() => setTiroir(false)} />
          <div className="absolute inset-y-0 left-0 w-[272px] max-w-[85vw]">
            <Menu onNaviguer={() => setTiroir(false)} onDeconnexion={() => setConfirmerSortie(true)} />
            <button
              type="button"
              onClick={() => setTiroir(false)}
              aria-label="Fermer le menu"
              className="absolute right-2 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-marine-menu hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-ligne bg-white px-4 py-3 sm:px-7">
          <button
            type="button"
            onClick={() => setTiroir(true)}
            aria-label="Ouvrir le menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-ligne text-ocean-950 lg:hidden"
          >
            <IconeMenu className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="m-0 min-w-0 flex-1 truncate text-xl font-extrabold">{entree?.libelle || 'FANDRIO'}</h1>
          <Link
            to="/notifications"
            aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-ligne text-ocean-950 hover:bg-ocean-50"
          >
            <Bell className="h-5 w-5" aria-hidden />
            {nonLues > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-ocean-800 px-1 text-[10px] font-extrabold text-white">
                {nonLues > 99 ? '99+' : nonLues}
              </span>
            )}
          </Link>
          {compagnie && (
            <Bouton vers="/compagnie/guichet" icone={Plus} touche="F2" className="hidden sm:inline-flex">
              Nouvelle vente
            </Bouton>
          )}
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <Dialogue
        ouvert={confirmerSortie}
        titre="Se déconnecter ?"
        confirmer="Se déconnecter"
        danger
        chargement={sortie}
        onConfirmer={seDeconnecter}
        onFermer={() => setConfirmerSortie(false)}
      >
        Vous devrez saisir à nouveau vos identifiants.
      </Dialogue>
    </div>
  );
}
