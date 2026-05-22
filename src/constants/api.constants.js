export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL,
    TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT),
    API_KEY: import.meta.env.VITE_API_KEY,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': import.meta.env.VITE_API_KEY
    }
};

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/connexion',
        LOGOUT: '/deconnexion',
        REFRESH: '/rafraichir-token',
        ME: '/moi'
    },
    ADMIN: {
        UTILISATEURS: {
            LISTE: '/admin/utilisateurs/recupListeUtilisateur',
            STATISTIQUES: '/admin/utilisateurs/statistiques',
            DETAIL: (id) => `/admin/utilisateurs/detailUtilisateur/${id}`,
            MODIFIER: (id) => `/admin/utilisateurs/modifierUtilisateur/${id}`,
            ACTIVER: (id) => `/admin/utilisateurs/${id}/activer`,
            DESACTIVER: (id) => `/admin/utilisateurs/${id}/desactiver`,
            REACTIVER: (id) => `/admin/utilisateurs/${id}/reactiver`,
            CHANGER_STATUT: (id) => `/admin/utilisateurs/${id}/statut`,
            SUPPRIMER: (id) => `/admin/utilisateurs/delete/${id}`,
        },
        COMPAGNIES: {
            LISTE: '/admin/compagnies/recupListecompagnie',
            STATISTIQUES: '/admin/compagnies/statistiques'
        },
        PROVINCES: {
            LISTE: '/admin/provinces/recuperListeProvince',
            STATISTIQUES: '/admin/provinces/statistiques'
        },
        COMMISSIONS: {
            DASHBOARD: '/admin/commissions/dashboard'
        }
    }
};
