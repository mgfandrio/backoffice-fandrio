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
            STATISTIQUES: '/admin/utilisateurs/statistiques'
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
