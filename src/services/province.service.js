import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const ProvinceService = {
    getAll: (params = {}) => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.LISTE, { params }),
    getStats: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.STATISTIQUES),
    getOrientations: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.ORIENTATIONS),
    getDetail: (id) => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.DETAIL(id)),
    modifier: (id, data) => ApiService.put(API_ENDPOINTS.ADMIN.PROVINCES.MODIFIER(id), data),
    supprimer: (id) => ApiService.delete(API_ENDPOINTS.ADMIN.PROVINCES.SUPPRIMER(id)),
};

export default ProvinceService;
