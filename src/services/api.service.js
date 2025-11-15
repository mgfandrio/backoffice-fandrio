import axiosInstance from '../config/axios.config';
import { API_ENDPOINTS } from '../constants/api.constants';

export const ApiService = {
    // Auth services
    login: (credentials) => {
        return axiosInstance.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    },

    logout: () => {
        return axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    },

    // Generic methods
    get: (endpoint) => {
        return axiosInstance.get(endpoint);
    },

    post: (endpoint, data) => {
        return axiosInstance.post(endpoint, data);
    },

    put: (endpoint, data) => {
        return axiosInstance.put(endpoint, data);
    },

    delete: (endpoint) => {
        return axiosInstance.delete(endpoint);
    }
};

export default ApiService;
