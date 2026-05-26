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

export interface UserBulkCreateResultDTO {
    users: UserDTO[];
    importedCount: number;
    duplicateCount: number;
    duplicatesInFile: number;
    existingDuplicatesSkipped: number;
    existingDuplicatesRemoved: number;
}

export interface ExcelImportResultDTO extends UserBulkCreateResultDTO {
    count: number;
}
