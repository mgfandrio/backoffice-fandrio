import { lazy, ReactNode, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { Protege } from '@/auth/Protege';
import { AppLayout } from '@/layout/AppLayout';
import { MENU_COMPAGNIE, MENU_SYSTEME } from '@/navigation/menus';
import { Squelette } from '@/components/ui';
import Connexion from '@/pages/Connexion';
import AVenir from '@/pages/AVenir';
import Introuvable from '@/pages/Introuvable';

// Chaque écran est chargé à la demande : l'application s'ouvre plus vite
const AccueilCompagnie = lazy(() => import('@/pages/compagnie/Accueil'));
const Guichet = lazy(() => import('@/pages/compagnie/Guichet'));
const Embarquement = lazy(() => import('@/pages/compagnie/Embarquement'));
const Reservations = lazy(() => import('@/pages/compagnie/Reservations'));
const Suivi = lazy(() => import('@/pages/compagnie/Suivi'));
const Voyages = lazy(() => import('@/pages/compagnie/Voyages'));
const Planning = lazy(() => import('@/pages/compagnie/Planning'));
const Chauffeurs = lazy(() => import('@/pages/compagnie/Chauffeurs'));
const Vehicules = lazy(() => import('@/pages/compagnie/Vehicules'));
const Trajets = lazy(() => import('@/pages/compagnie/Trajets'));
const Portefeuille = lazy(() => import('@/pages/compagnie/Portefeuille'));
const Factures = lazy(() => import('@/pages/compagnie/Factures'));
const Remboursements = lazy(() => import('@/pages/compagnie/Remboursements'));
const Paiements = lazy(() => import('@/pages/compagnie/Paiements'));
const Parametres = lazy(() => import('@/pages/compagnie/Parametres'));
const Partenaires = lazy(() => import('@/pages/compagnie/Partenaires'));
const AccueilSysteme = lazy(() => import('@/pages/systeme/Accueil'));
const Utilisateurs = lazy(() => import('@/pages/systeme/Utilisateurs'));
const Compagnies = lazy(() => import('@/pages/systeme/Compagnies'));
const Provinces = lazy(() => import('@/pages/systeme/Provinces'));
const Commissions = lazy(() => import('@/pages/systeme/Commissions'));
const Collectes = lazy(() => import('@/pages/systeme/Collectes'));
const Notifications = lazy(() => import('@/pages/commun/Notifications'));
const Profil = lazy(() => import('@/pages/commun/Profil'));

/** Écrans pas encore livrés : une page qui dit ce qui arrive et à quelle étape. */
const enAttente = (menu: typeof MENU_COMPAGNIE, prefixe: string) =>
  menu
    .flatMap((s) => s.entrees)
    .filter((e) => e.etape > 0)
    .map((e) => <Route key={e.chemin} path={e.chemin.slice(prefixe.length + 1)} element={<AVenir />} />);

/** Pendant le chargement d'un écran : des blocs gris à la place du contenu. */
function Chargement({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
          <Squelette className="h-24" />
          <Squelette className="h-64" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

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
              <Chargement>
                <AccueilCompagnie />
              </Chargement>
            </Protege>
          }
        />
        <Route
          path="/compagnie/*"
          element={
            <Protege role={2}>
              <Chargement>
                <RoutesCompagnie />
              </Chargement>
            </Protege>
          }
        />
        <Route
          path="/systeme"
          element={
            <Protege role={3}>
              <Chargement>
                <AccueilSysteme />
              </Chargement>
            </Protege>
          }
        />
        <Route
          path="/systeme/*"
          element={
            <Protege role={3}>
              <Chargement>
                <RoutesSysteme />
              </Chargement>
            </Protege>
          }
        />
        <Route
          path="/notifications"
          element={
            <Chargement>
              <Notifications />
            </Chargement>
          }
        />
        <Route
          path="/profil"
          element={
            <Chargement>
              <Profil />
            </Chargement>
          }
        />
        <Route path="*" element={<Introuvable />} />
      </Route>
    </Routes>
  );
}

function RoutesCompagnie() {
  return (
    <Routes>
      <Route path="guichet" element={<Guichet />} />
      <Route path="embarquement" element={<Embarquement />} />
      <Route path="reservations" element={<Reservations />} />
      <Route path="suivi" element={<Suivi />} />
      <Route path="voyages" element={<Voyages />} />
      <Route path="planning" element={<Planning />} />
      <Route path="chauffeurs" element={<Chauffeurs />} />
      <Route path="vehicules" element={<Vehicules />} />
      <Route path="trajets" element={<Trajets />} />
      <Route path="portefeuille" element={<Portefeuille />} />
      <Route path="factures" element={<Factures />} />
      <Route path="remboursements" element={<Remboursements />} />
      <Route path="paiements" element={<Paiements />} />
      <Route path="parametres" element={<Parametres />} />
      <Route path="partenaires" element={<Partenaires />} />
      {enAttente(MENU_COMPAGNIE, '/compagnie')}
      <Route path="*" element={<Introuvable />} />
    </Routes>
  );
}

function RoutesSysteme() {
  return (
    <Routes>
      <Route path="utilisateurs" element={<Utilisateurs />} />
      <Route path="compagnies" element={<Compagnies />} />
      <Route path="provinces" element={<Provinces />} />
      <Route path="commissions" element={<Commissions />} />
      <Route path="collectes" element={<Collectes />} />
      {enAttente(MENU_SYSTEME, '/systeme')}
      <Route path="*" element={<Introuvable />} />
    </Routes>
  );
}
