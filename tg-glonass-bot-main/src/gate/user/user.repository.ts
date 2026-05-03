import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import {UserDTO, UserRole, User, UserTypeEmail} from "@domains";
import { PaginationType } from "@shared";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async create(userData: UserDTO.Create): Promise<UserDTO> {
        const userEntity = this.userRepository.create({
            name: userData.name,
            email: userData.email ?? null,
            tgId: userData.tgId ?? null,
            vkId: userData.vkId ?? null,
            typeEmail: userData.typeEmail,
            role: userData.role as UserRole,
        });

        const user = await this.userRepository.save(userEntity);

        return UserDTO.fromModel(user);
    }

    async unsubscribeByEmail(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            return null;
        }

        await this.userRepository.delete(user.id);

        return UserDTO.fromModel(user);
    }
    
    async createMany(users: UserDTO.Create[]): Promise<UserDTO[]> {
        const userEntities = users.map(u => this.userRepository.create({
            name: u.name,
            email: u.email ?? null,
            tgId: u.tgId ?? null,
            vkId: u.vkId ?? null,
            typeEmail: u.typeEmail,
            role: UserRole.CLIENT,
        }));

        const savedUsers = await this.userRepository.save(userEntities);

        return savedUsers.map(UserDTO.fromModel);
    }

    async update(id: string, userData: UserDTO.Update): Promise<UserDTO> {
        const existingUser = await this.userRepository.findOneBy({ id });
        if (!existingUser) {
            throw new NotFoundException(`User with id ${id} not found`);
        }

        this.userRepository.merge(existingUser, {
            name: userData.name,
            email: userData.email,
            tgId: userData.tgId,
            vkId: userData.vkId,
            typeEmail: userData.typeEmail,
            role: userData.role as UserRole,
        });

        const user = await this.userRepository.save(existingUser);

        return UserDTO.fromModel(user);
    }

    async delete(id: string): Promise<UserDTO> {
        const userToDelete = await this.userRepository.findOneBy({ id });

        if (!userToDelete) {
            throw new NotFoundException({ error: 'User not found' });
        }

        await this.userRepository.delete(id);

        return UserDTO.fromModel(userToDelete);
    }

    async getList(page: number = 1, limit: number = 10, role?: UserRole, typeEmail?: UserTypeEmail): Promise<PaginationType<UserDTO>> {
        const skip = (page - 1) * limit;

        const whereCondition: { role?: UserRole; typeEmail?: UserTypeEmail } = {};

        if (role !== undefined && role !== null) {
            whereCondition.role = role;
        }
        if (typeEmail !== undefined && typeEmail !== null) {
            whereCondition.typeEmail = typeEmail;
        }

        const [items, total] = await this.userRepository.findAndCount({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
            where: whereCondition,
        });

        const isLast = (page * limit) >= total;

        return {
            items: items.map(UserDTO.fromModel),
            total,
            page,
            isLast,
            limit,
        };
    }

    async getUser(id: string): Promise<UserDTO> {
        const user = await this.userRepository.findOneBy({ id });

        if (!user) {
            throw new NotFoundException({ error: 'User not found' });
        }

        return UserDTO.fromModel(user);
    }


    async findByVkId(vkId: number): Promise<User | null> {
        return await this.userRepository.findOne({ where: { vkId } });
    }

    async createOrUpdateByVkId(vkId: number, name?: string): Promise<User> {
        let user = await this.findByVkId(vkId);
        if (!user) {
            user = this.userRepository.create({
                vkId,
                name: name ?? `VK User ${vkId}`,
                role: UserRole.CLIENT,
                email: null,
                tgId: null,
            });
        } else {
            user.name = name ?? user.name;
        }
        return await this.userRepository.save(user);
    }

    async removeByVkIds(vkIds: number[]): Promise<void> {
        if (!vkIds.length) return;
        await this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({ vkId: null })
            .where('vkId IN (:...ids)', { ids: vkIds })
            .execute();
    }

    async getAllVkIds(): Promise<number[]> {
        const users = await this.userRepository
            .createQueryBuilder('user')
            .select('user.vkId')
            .where('user.vkId IS NOT NULL')
            .getRawMany<{ user_vkId: number }>();

        return users.map(u => u.user_vkId);
    }
}
