import { api, apiMultipart } from '../../../shared/api/axios';
import { API_ENDPOINTS } from '../../../shared/api/config';
import { PaginationType, PostType } from '../../../shared/types/common.types';
import { PostDTO, PostCreateDTO, PostUpdateDTO, MediaUploadResponse } from '../types/post.types';

interface GetPostsParams {
    page: number;
    limit: number;
    type?: PostType;
}

export const postApi = {
    getList: async (params: GetPostsParams) => {
        const queryParams: Record<string, string | number> = {
            page: params.page,
            limit: params.limit
        };

        if (params.type) queryParams.type = params.type;

        const { data } = await api.get<PaginationType<PostDTO>>(API_ENDPOINTS.posts, {
            params: queryParams
        });
        return data;
    },

    findById: async (id: string) => {
        const { data } = await api.get<PostDTO>(`${API_ENDPOINTS.posts}/${id}`);
        return data;
    },

    create: async (dto: PostCreateDTO) => {
        const { data } = await api.post<PostDTO>(API_ENDPOINTS.posts, dto);
        return data;
    },

    update: async (id: string, dto: PostUpdateDTO) => {
        const { data } = await api.put<PostDTO>(`${API_ENDPOINTS.posts}/${id}`, dto);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await api.delete<PostDTO>(`${API_ENDPOINTS.posts}/${id}`);
        return data;
    },

    uploadMedia: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiMultipart.post<MediaUploadResponse>('/media/upload', formData);
        return data;
    },

    deleteMedia: async (key: string) => {
        const { data } = await api.delete(`/media/${key}`);
        return data;
    },
};
