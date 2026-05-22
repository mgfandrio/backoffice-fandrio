import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const DashboardService = {
    getUtilisateursStats: () => ApiService.get(API_ENDPOINTS.ADMIN.UTILISATEURS.STATISTIQUES),
    getCompagniesStats: () => ApiService.get(API_ENDPOINTS.ADMIN.COMPAGNIES.STATISTIQUES),
    getProvincesStats: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.STATISTIQUES),
    getCommissionsDashboard: () => ApiService.get(API_ENDPOINTS.ADMIN.COMMISSIONS.DASHBOARD),
    getUtilisateurs: () => ApiService.get(API_ENDPOINTS.ADMIN.UTILISATEURS.LISTE),
    getCompagnies: () => ApiService.get(API_ENDPOINTS.ADMIN.COMPAGNIES.LISTE),
    getProvinces: () => ApiService.get(API_ENDPOINTS.ADMIN.PROVINCES.LISTE),
};

export default DashboardService;
