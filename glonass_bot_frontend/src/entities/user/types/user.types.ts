import { UserRole, UserTypeEmail } from '../../../shared/types/common.types';

export interface UserDTO {
    id: string;
    name: string;
    email?: string | null;
    tgId?: string | null;
    vkId?: number | null;
    role: UserRole;
    typeEmail?: UserTypeEmail | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserCreateDTO {
    name: string;
    email?: string | null;
    tgId?: string | null;
    vkId?: number | null;
    role: UserRole;
    typeEmail?: UserTypeEmail | null;
}

export type UserUpdateDTO = Partial<UserCreateDTO>;
