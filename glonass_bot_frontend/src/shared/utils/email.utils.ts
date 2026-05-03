import { UserTypeEmail, EMAIL_TYPE_MAPPING } from '../types/common.types';

export const getEmailByType = (type?: UserTypeEmail | null): string => {
    if (!type) return 'Не выбрана';
    return EMAIL_TYPE_MAPPING[type] || type;
};

export const getTypeEmailLabel = (type?: UserTypeEmail | null): string => {
    if (!type) return 'Не выбрана';
    const email = EMAIL_TYPE_MAPPING[type];
    return email ? `${type.toUpperCase()} (${email})` : type;
};

export const getShortEmailLabel = (type?: UserTypeEmail | null): string => {
    if (!type) return 'Не выбрана';
    const email = EMAIL_TYPE_MAPPING[type];
    if (!email) return type;

    // Берем часть до @
    const username = email.split('@')[0];
    return `${username}@...`;
};
