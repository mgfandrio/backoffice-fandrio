import ApiService from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

export const AuthService = {
    login: async (credentials) => {
        try {
            const response = await ApiService.post(API_ENDPOINTS.AUTH.LOGIN, {
                identifiant: credentials.identifiant,
                motDePasse: credentials.motDePasse
            });

            if (response.data.statut && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.utilisateur));
                return response.data;
            }
            
            throw new Error(response.data.message || 'Échec de la connexion');
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export default AuthService;
