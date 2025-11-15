import axios from 'axios';
import { API_CONFIG } from '../constants/api.constants';
import AuthService from '../services/auth.service';

const axiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        ...API_CONFIG.HEADERS,
    }
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            switch (error.response.status) {
                case 401:
                    AuthService.logout();
                    window.location.href = '/';
                    break;
                case 403:
                    return Promise.reject({
                        message: "Vous n'avez pas les permissions nécessaires"
                    });
                case 422:
                    return Promise.reject({
                        message: "Données invalides",
                        errors: error.response.data.errors
                    });
                default:
                    return Promise.reject({
                        message: error.response.data.message || "Une erreur est survenue"
                    });
            }
        }

        return Promise.reject({
            message: "Erreur de connexion au serveur"
        });
    }
);

export default axiosInstance;
