import { Injectable } from '@nestjs/common';
import {UserRepository} from "./user.repository";
import {User, UserBulkCreateResultDTO, UserDTO, UserRole, UserTypeEmail} from "@domains";
import {PaginationType} from "@shared";

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getListUsers(page: number, limit: number, role?: UserRole, typeEmail?: UserTypeEmail, search?: string): Promise<PaginationType<UserDTO>> {
        return await this.userRepository.getList(page, limit, role, typeEmail, search)
    }

    async create(dto: UserDTO.Create): Promise<UserDTO> {
        return await this.userRepository.create(dto);
    }

    async unsubscribeByEmail(email: string, typeEmail?: UserTypeEmail) {
        return await this.userRepository.unsubscribeByEmail(email, typeEmail);
    }

    async createMany(dto: UserDTO.Create[]): Promise<UserBulkCreateResultDTO> {
        return await this.userRepository.createMany(dto);
    }

    async update(id: string, dto: UserDTO.Update): Promise<UserDTO> {
        return await this.userRepository.update(id, dto);
    }

    async delete(id: string): Promise<UserDTO> {
        return await this.userRepository.delete(id);
    }

    async createOrUpdateByVkId(vkId: number, name?: string): Promise<User> {
        return this.userRepository.createOrUpdateByVkId(vkId, name)
    }

    async removeByVkIds(vkIds: number[]): Promise<void> {
        return this.userRepository.removeByVkIds(vkIds)
    }

    async getAllVkIds(): Promise<number[]> {
        return this.userRepository.getAllVkIds()
    }
}
