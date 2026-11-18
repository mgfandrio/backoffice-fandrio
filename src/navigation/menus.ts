import {
  Bell,
  Building2,
  Bus,
  CalendarDays,
  CreditCard,
  Handshake,
  Home,
  Landmark,
  LucideIcon,
  MapPinned,
  Navigation,
  PieChart,
  QrCode,
  Receipt,
  RotateCcw,
  Route as IconeTrajet,
  Settings,
  Store,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import type { Role } from '@/auth/session';

/**
 * Menus du back-office : TOUTES les fonctionnalités admin de l'app mobile.
 * `etape` : étape du plan qui livre l'écran (0 = disponible).
 * `compteur` : pastille alimentée par l'API (cf. layout/Menu).
 */
export interface EntreeMenu {
  chemin: string;
  libelle: string;
  icone: LucideIcon;
  etape: 0 | 2 | 3 | 4;
  compteur?: 'suivi' | 'planning';
  /** Ce que l'écran contiendra (affiché tant qu'il n'est pas livré). */
  contenu?: string;
}

export interface SectionMenu {
  titre: string;
  entrees: EntreeMenu[];
}

export const MENU_COMPAGNIE: SectionMenu[] = [
  {
    titre: 'Guichet',
    entrees: [
      { chemin: '/compagnie', libelle: 'Accueil', icone: Home, etape: 0 },
      { chemin: '/compagnie/guichet', libelle: 'Vente au guichet', icone: Store, etape: 0, contenu: 'Choix du départ, plan des sièges, saisie des voyageurs, encaissement en espèces, ticket imprimé.' },
      { chemin: '/compagnie/embarquement', libelle: 'Embarquement', icone: QrCode, etape: 0, contenu: 'Lecture des billets à la douchette ou à la caméra, saisie du numéro, liste du voyage, clôture.' },
      { chemin: '/compagnie/reservations', libelle: 'Réservations', icone: Ticket, etape: 0, contenu: 'Réservations par voyage, détail des billets, fiche voyageurs imprimable.' },
      { chemin: '/compagnie/suivi', libelle: 'Suivi des voyages', icone: Navigation, etape: 0, compteur: 'suivi', contenu: 'Départs et arrivées, clôture de l’embarquement, confirmation d’arrivée, retards.' },
    ],
  },
  {
    titre: 'Exploitation',
    entrees: [
      { chemin: '/compagnie/voyages', libelle: 'Voyages', icone: Bus, etape: 0, contenu: 'Liste et détail des voyages : plan des sièges en direct, voyageurs, billets, modifier, publier, pause, annuler, reprogrammer, réactiver.' },
      { chemin: '/compagnie/planning', libelle: 'Planning', icone: CalendarDays, etape: 0, compteur: 'planning', contenu: 'Planning à venir et passé, filtres, rappels de publication, planification sur calendrier.' },
      { chemin: '/compagnie/chauffeurs', libelle: 'Chauffeurs', icone: Users, etape: 0, contenu: 'Ajouter, modifier, activer ou désactiver, supprimer.' },
      { chemin: '/compagnie/vehicules', libelle: 'Véhicules', icone: Bus, etape: 0, contenu: 'Ajouter, modifier, détail, éditeur du plan de sièges.' },
      { chemin: '/compagnie/trajets', libelle: 'Trajets', icone: IconeTrajet, etape: 0, contenu: 'Créer, modifier, activer ou désactiver.' },
    ],
  },
  {
    titre: 'Finances',
    entrees: [
      { chemin: '/compagnie/portefeuille', libelle: 'Portefeuille', icone: Wallet, etape: 0, contenu: 'Chiffre d’affaires, commission à payer en ligne, historique des collectes.' },
      { chemin: '/compagnie/factures', libelle: 'Factures', icone: Receipt, etape: 0, contenu: 'Factures des réservations.' },
      { chemin: '/compagnie/remboursements', libelle: 'Remboursements', icone: RotateCcw, etape: 0, contenu: 'Demandes de remboursement : traiter, refuser.' },
      { chemin: '/compagnie/paiements', libelle: 'Modes de paiement', icone: CreditCard, etape: 0, contenu: 'Numéros MVola, Orange Money et Airtel Money de la compagnie.' },
    ],
  },
  {
    titre: 'Compagnie',
    entrees: [
      { chemin: '/compagnie/parametres', libelle: 'Informations publiques', icone: Settings, etape: 0, contenu: 'Description, contact, adresse, provinces desservies, logo.' },
      { chemin: '/compagnie/partenaires', libelle: 'Compagnies partenaires', icone: Handshake, etape: 0, contenu: 'Ajouter ou retirer les compagnies qui accueillent vos voitures à destination.' },
    ],
  },
];

export const MENU_SYSTEME: SectionMenu[] = [
  {
    titre: 'Administration',
    entrees: [
      { chemin: '/systeme', libelle: 'Accueil', icone: Home, etape: 0 },
      { chemin: '/systeme/utilisateurs', libelle: 'Utilisateurs', icone: Users, etape: 4, contenu: 'Liste, détail, désactiver, réactiver, restaurer, supprimer.' },
      { chemin: '/systeme/compagnies', libelle: 'Compagnies', icone: Building2, etape: 4, contenu: 'Liste, création avec partenaires, fiche : statut, paiement en ligne, offres VIP et Premium, commission.' },
      { chemin: '/systeme/provinces', libelle: 'Provinces', icone: MapPinned, etape: 4, contenu: 'Liste, ajout simple ou multiple, modification, suppression.' },
    ],
  },
  {
    titre: 'Finances',
    entrees: [
      { chemin: '/systeme/commissions', libelle: 'Commissions', icone: PieChart, etape: 4, contenu: 'Tableau de bord, évolution, détail par compagnie, fréquence de collecte.' },
      { chemin: '/systeme/collectes', libelle: 'Collectes', icone: Landmark, etape: 4, contenu: 'Collectes dues, détail, confirmer la réception, relancer, historique.' },
    ],
  },
];

/** Entrées communes (menu du compte). */
export const MENU_COMPTE: EntreeMenu[] = [
  { chemin: '/notifications', libelle: 'Notifications', icone: Bell, etape: 0 },
  { chemin: '/profil', libelle: 'Mon profil', icone: UserRound, etape: 0 },
];

export function menuDe(role: Role | undefined): SectionMenu[] {
  return role === 3 ? MENU_SYSTEME : MENU_COMPAGNIE;
}

/** Entrée correspondant à une adresse (la plus précise). */
export function entreeDe(role: Role | undefined, chemin: string): EntreeMenu | undefined {
  const toutes = [...menuDe(role).flatMap((s) => s.entrees), ...MENU_COMPTE];
  return toutes
    .filter((e) => chemin === e.chemin || chemin.startsWith(`${e.chemin}/`))
    .sort((a, b) => b.chemin.length - a.chemin.length)[0];
}
