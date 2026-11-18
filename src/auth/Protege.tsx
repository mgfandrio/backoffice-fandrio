import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { accueilDe, useAuth } from './AuthContext';
import type { Role } from './session';

/** Réservé aux admins connectés ; `role` restreint à un rôle précis. */
export function Protege({ role, children }: { role?: Role; children: ReactNode }) {
  const { utilisateur } = useAuth();
  const location = useLocation();
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  // Mot de passe provisoire : rien d'autre tant qu'il n'est pas changé
  if (utilisateur.mdp_provisoire && location.pathname !== '/premier-mot-de-passe') return <Navigate to="/premier-mot-de-passe" replace />;
  if (role && utilisateur.role !== role) return <Navigate to={accueilDe(utilisateur)} replace />;
  return <>{children}</>;
}
