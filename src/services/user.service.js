import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const UserService = {
    getAll: (params = {}) => ApiService.get(API_ENDPOINTS.ADMIN.UTILISATEURS.LISTE, { params }),
    getStats: () => ApiService.get(API_ENDPOINTS.ADMIN.UTILISATEURS.STATISTIQUES),
    getDetail: (id) => ApiService.get(API_ENDPOINTS.ADMIN.UTILISATEURS.DETAIL(id)),
    activer: (id) => ApiService.patch(API_ENDPOINTS.ADMIN.UTILISATEURS.ACTIVER(id)),
    desactiver: (id) => ApiService.patch(API_ENDPOINTS.ADMIN.UTILISATEURS.DESACTIVER(id)),
    reactiver: (id) => ApiService.patch(API_ENDPOINTS.ADMIN.UTILISATEURS.REACTIVER(id)),
    changerStatut: (id, data) => ApiService.patch(API_ENDPOINTS.ADMIN.UTILISATEURS.CHANGER_STATUT(id), data),
    supprimer: (id) => ApiService.delete(API_ENDPOINTS.ADMIN.UTILISATEURS.SUPPRIMER(id)),
};

export default UserService;
