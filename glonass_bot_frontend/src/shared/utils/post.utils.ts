import { PostType, POST_TYPE_MAPPING } from '../types/common.types';

export const getPostTypeLabel = (type: PostType): string => {
    return POST_TYPE_MAPPING[type] || type;
};

export const getPostTypeIcon = (type: PostType): string => {
    const icons: Record<PostType, string> = {
        [PostType.TG]: 'TG',
        [PostType.TG2]: 'TG',
        [PostType.TG3]: 'TG',
        [PostType.VK]: 'VK',
        [PostType.VK2]: 'VK',
        [PostType.MAIL]: '@',
        [PostType.MAIL2]: '@',
        [PostType.MAIL3]: '@',
    };
    return icons[type] || '#';
};
