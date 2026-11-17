import { Navigate, Route, Routes } from 'react-router-dom';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { Protege } from '@/auth/Protege';
import { AppLayout } from '@/layout/AppLayout';
import { MENU_COMPAGNIE, MENU_SYSTEME } from '@/navigation/menus';
import Connexion from '@/pages/Connexion';
import AVenir from '@/pages/AVenir';
import Introuvable from '@/pages/Introuvable';
import AccueilCompagnie from '@/pages/compagnie/Accueil';
import AccueilSysteme from '@/pages/systeme/Accueil';
import Notifications from '@/pages/commun/Notifications';
import Profil from '@/pages/commun/Profil';

/** Écrans pas encore livrés : une page qui dit ce qui arrive et à quelle étape. */
const enAttente = (menu: typeof MENU_COMPAGNIE, prefixe: string) =>
  menu
    .flatMap((s) => s.entrees)
    .filter((e) => e.etape > 0)
    .map((e) => <Route key={e.chemin} path={e.chemin.slice(prefixe.length + 1)} element={<AVenir />} />);

function Racine() {
  const { utilisateur } = useAuth();
  return <Navigate to={utilisateur ? accueilDe(utilisateur) : '/connexion'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      <Route
        element={
          <Protege>
            <AppLayout />
          </Protege>
        }
      >
        <Route path="/" element={<Racine />} />
        <Route
          path="/compagnie"
          element={
            <Protege role={2}>
              <AccueilCompagnie />
            </Protege>
          }
        />
        <Route path="/compagnie/*" element={<Protege role={2}><RoutesCompagnie /></Protege>} />
        <Route
          path="/systeme"
          element={
            <Protege role={3}>
              <AccueilSysteme />
            </Protege>
          }
        />
        <Route path="/systeme/*" element={<Protege role={3}><RoutesSysteme /></Protege>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="*" element={<Introuvable />} />
      </Route>
    </Routes>
  );
}

function RoutesCompagnie() {
  return (
    <Routes>
      {enAttente(MENU_COMPAGNIE, '/compagnie')}
      <Route path="*" element={<Introuvable />} />
    </Routes>
  );
}

function RoutesSysteme() {
  return (
    <Routes>
      {enAttente(MENU_SYSTEME, '/systeme')}
      <Route path="*" element={<Introuvable />} />
    </Routes>
  );
}
