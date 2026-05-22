import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const CompanyService = {
    getAll: () => ApiService.get(API_ENDPOINTS.ADMIN.COMPAGNIES.LISTE),
    getStats: () => ApiService.get(API_ENDPOINTS.ADMIN.COMPAGNIES.STATISTIQUES),
    getDetail: (id) => ApiService.get(API_ENDPOINTS.ADMIN.COMPAGNIES.DETAIL(id)),
    creer: (data) => ApiService.post(API_ENDPOINTS.ADMIN.COMPAGNIES.CREER, data),
    modifier: (id, data) => ApiService.put(API_ENDPOINTS.ADMIN.COMPAGNIES.MODIFIER(id), data),
    changerStatut: (id, data) => ApiService.patch(API_ENDPOINTS.ADMIN.COMPAGNIES.CHANGER_STATUT(id), data),
    supprimer: (id) => ApiService.delete(API_ENDPOINTS.ADMIN.COMPAGNIES.SUPPRIMER(id)),
    getProvinces: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.LISTE),
};

export default CompanyService;
