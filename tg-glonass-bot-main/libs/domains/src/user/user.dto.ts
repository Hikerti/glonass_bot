import { IsEmail, IsOptional, IsString } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import {User, UserRole, UserTypeEmail} from "./user.entites";

export class UserDTO {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsEmail()
    @IsOptional()
    email?: string | null;

    @IsString()
    @IsOptional()
    tgId?: string | null;

    @IsString()
    @IsOptional()
    vkId?: number | null;

    @IsString()
    @IsOptional()
    typeEmail?: UserTypeEmail | null;

    @IsString()
    role: UserRole;

    @IsString()
    createdAt: string;

    @IsString()
    updatedAt: string;

    static fromModel(model: User): UserDTO {
        const dateToString = (dateInput: Date | string) => {
            const dateObject = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
            return dateObject.toISOString();
        };

        return {
            id: model.id,
            name: model.name,
            email: model.email,
            tgId: model.tgId ?? null,
            vkId: model.vkId ?? null,
            typeEmail: model.typeEmail,
            role: model.role,
            createdAt: dateToString(model.createdAt),
            updatedAt: dateToString(model.updatedAt),
        }
    }
}

export namespace UserDTO {
    export class Create extends OmitType(UserDTO, ['id', 'createdAt', 'updatedAt'] as const) {}
    export class Update extends PartialType(Create) {}
}
