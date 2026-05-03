import axios from 'axios';
import { API_BASE_URL } from './config';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiMultipart = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

// Interceptors для обработки ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

apiMultipart.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Multipart Error:', error);
        return Promise.reject(error);
    }
);