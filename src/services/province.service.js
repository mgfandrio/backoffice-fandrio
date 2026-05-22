import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const ProvinceService = {
    getAll: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.LISTE),
    getStats: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.STATISTIQUES),
};

export default ProvinceService;
