import { api, apiMultipart } from '../../../shared/api/axios';
import { API_ENDPOINTS } from '../../../shared/api/config';
import { PaginationType, UserRole, UserTypeEmail } from '../../../shared/types/common.types';
import { UserDTO, UserCreateDTO, UserUpdateDTO } from '../types/user.types';

interface GetUsersParams {
    page: number;
    limit: number;
    role?: UserRole;
    typeEmail?: UserTypeEmail; // Добавили фильтр по typeEmail
}

export const userApi = {
    getList: async (params: GetUsersParams) => {
        const queryParams: Record<string, string | number> = {
            page: params.page,
            limit: params.limit
        };

        if (params.role) queryParams.role = params.role;
        if (params.typeEmail) queryParams.typeEmail = params.typeEmail;

        const { data } = await api.get<PaginationType<UserDTO>>(API_ENDPOINTS.users, {
            params: queryParams
        });
        return data;
    },

    create: async (dto: UserCreateDTO) => {
        const { data } = await api.post<UserDTO>(API_ENDPOINTS.users, dto);
        return data;
    },

    createMany: async (users: UserCreateDTO[]) => {
        const { data } = await api.post<UserDTO[]>(`${API_ENDPOINTS.users}/bulk`, users);
        return data;
    },

    update: async (id: string, dto: UserUpdateDTO) => {
        const { data } = await api.put<UserDTO>(`${API_ENDPOINTS.users}/${id}`, dto);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await api.delete<UserDTO>(`${API_ENDPOINTS.users}/${id}`);
        return data;
    },

    uploadExcel: async (file: File, typeEmail?: UserTypeEmail) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiMultipart.post(API_ENDPOINTS.excel.import, formData, {
            params: {
                typeEmail: typeEmail || UserTypeEmail.MAIL,
            },
        });

        return data;
    },

    exportExcel: async () => {
        const { data } = await api.get(API_ENDPOINTS.excel.export, {
            responseType: 'blob',
        });

        return data;
    },
};
