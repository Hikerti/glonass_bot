export interface PaginationType<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    isLast?: boolean;
}

export enum UserRole {
    ADMIN = 'admin',
    CLIENT = 'client',
}

export enum UserTypeEmail {
    MAIL = 'mail',
    MAIL2 = 'mail2',
    MAIL3 = 'mail3',
    MAIL4 = 'mail4',
}

export enum PostType {
    TG = 'tg',
    TG2 = 'tg2',
    TG3 = 'tg3',
    MAIL = 'mail',
    MAIL2 = 'mail2',
    MAIL3 = 'mail3',
    MAIL4 = 'mail4',
    VK = 'vk',
    VK2 = 'vk2',
}

export const EMAIL_TYPE_MAPPING: Record<UserTypeEmail, string> = {
    [UserTypeEmail.MAIL]: 'ostrovbot@ostrov59.ru',
    [UserTypeEmail.MAIL2]: 'kz@ostrov59.ru',
    [UserTypeEmail.MAIL3]: 'avtolyx18@yandex.ru',
    [UserTypeEmail.MAIL4]: 'aposstolistina@yandex.ru',
};

export const POST_TYPE_MAPPING: Record<PostType, string> = {
    [PostType.TG]: 'Telegram',
    [PostType.TG2]: 'Telegram 2',
    [PostType.TG3]: 'Telegram 3',
    [PostType.VK]: 'VK',
    [PostType.VK2]: 'VK 2',
    [PostType.MAIL]: 'ostrovbot@ostrov59.ru',
    [PostType.MAIL2]: 'kz@ostrov59.ru',
    [PostType.MAIL3]: 'avtolyx18@yandex.ru',
    [PostType.MAIL4]: 'aposstolistina@yandex.ru',
};

export const DISABLED_POST_TYPES: PostType[] = [
    PostType.TG,
    PostType.TG2,
    PostType.TG3,
];
