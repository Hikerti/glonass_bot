import { PostType } from '@shared/types/common.types.ts';

export interface PostDTO {
    id: string;
    type: PostType;
    text: string;
    interval: string;
    /** Start date of the mailing schedule. */
    startDate?: string | null;
    /** End date of the mailing schedule. */
    date: string;
    media: string[];
    active: boolean;
    postToWall?: boolean;
    postToMessage?: boolean;
    createdAt: string;
}

export interface PostCreateDTO {
    type: PostType;
    text: string;
    interval: string;
    /** Start date of the mailing schedule. */
    startDate?: string | null;
    /** End date of the mailing schedule. */
    date: string;
    media: string[];
    active: boolean;
    postToWall?: boolean;
    postToMessage?: boolean;
}

export type PostUpdateDTO = Partial<PostCreateDTO>;

export interface MediaUploadResponse {
    url: string;
    key: string;
}

export interface GeneratePostTextDTO {
    prompt: string;
    channel?: string;
}

export interface GeneratePostTextResponseDTO {
    text: string;
}
