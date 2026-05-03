const isDev = import.meta.env.VITE_APP_ENV === 'development';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
    isDev ? 'http://localhost:3000' : 'https://glonass-bot.ru/api'
);

export const API_ENDPOINTS = {
    users: '/users',
    posts: '/posts',
    media: '/media',
    excel: {
        import: '/excel/import',
        export: '/excel/export',
    },
} as const;

export const CONFIG = {
    isDev,
    apiBaseUrl: API_BASE_URL,
} as const;