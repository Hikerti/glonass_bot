import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import {UserBulkCreateResultDTO, UserDTO, UserRole, User, UserTypeEmail} from "@domains";
import { PaginationType } from "@shared";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    private normalizeEmail(email?: string | null): string | null {
        const normalizedEmail = email?.trim().toLowerCase();
        return normalizedEmail || null;
    }

    private normalizeOptionalString(value?: string | null): string | null {
        const normalizedValue = value?.trim();
        return normalizedValue || null;
    }

    private getRecipientKey(email?: string | null, typeEmail?: UserTypeEmail | null): string | null {
        const normalizedEmail = this.normalizeEmail(email);
        return normalizedEmail && typeEmail ? `${normalizedEmail}:${typeEmail}` : null;
    }

    private async assertRecipientIsUnique(
        email?: string | null,
        typeEmail?: UserTypeEmail | null,
        excludedId?: string,
    ): Promise<void> {
        const normalizedEmail = this.normalizeEmail(email);
        if (!normalizedEmail || !typeEmail) return;

        const query = this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(TRIM("user"."email")) = :email', { email: normalizedEmail })
            .andWhere('"user"."type_email" = :typeEmail', { typeEmail });

        if (excludedId) {
            query.andWhere('"user"."id" <> :excludedId', { excludedId });
        }

        if (await query.getOne()) {
            throw new ConflictException('Recipient with this email already exists for the selected sender');
        }
    }

    async create(userData: UserDTO.Create): Promise<UserDTO> {
        const normalizedEmail = this.normalizeEmail(userData.email);
        await this.assertRecipientIsUnique(normalizedEmail, userData.typeEmail);

        const userEntity = this.userRepository.create({
            name: userData.name,
            email: normalizedEmail,
            phone: this.normalizeOptionalString(userData.phone),
            description: this.normalizeOptionalString(userData.description),
            tgId: userData.tgId ?? null,
            vkId: userData.vkId ?? null,
            typeEmail: userData.typeEmail,
            role: userData.role as UserRole,
        });

        const user = await this.userRepository.save(userEntity);

        return UserDTO.fromModel(user);
    }

    async unsubscribeByEmail(email: string, typeEmail?: UserTypeEmail) {
        const normalizedEmail = this.normalizeEmail(email);
        if (!normalizedEmail) return null;

        const query = this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(TRIM("user"."email")) = :email', { email: normalizedEmail });

        if (typeEmail) {
            query.andWhere('"user"."type_email" = :typeEmail', { typeEmail });
        }

        const user = await query.getOne();

        if (!user) {
            return null;
        }

        await this.userRepository.delete(user.id);

        return UserDTO.fromModel(user);
    }
    
    async createMany(users: UserDTO.Create[]): Promise<UserBulkCreateResultDTO> {
        return await this.userRepository.manager.transaction(async (manager) => {
            const repository = manager.getRepository(User);
            const incomingKeys = new Set<string>();
            const uniqueUsers: UserDTO.Create[] = [];
            let duplicatesInFile = 0;

            for (const user of users) {
                const normalizedUser = {
                    ...user,
                    email: this.normalizeEmail(user.email),
                };
                const key = this.getRecipientKey(normalizedUser.email, normalizedUser.typeEmail);

                if (key && incomingKeys.has(key)) {
                    duplicatesInFile += 1;
                    continue;
                }

                if (key) incomingKeys.add(key);
                uniqueUsers.push(normalizedUser);
            }

            const existingRecipients = await repository
                .createQueryBuilder('user')
                .where('"user"."email" IS NOT NULL')
                .andWhere('"user"."type_email" IS NOT NULL')
                .orderBy('"user"."created_at"', 'ASC')
                .addOrderBy('"user"."id"', 'ASC')
                .getMany();
            const existingByKey = new Map<string, User>();
            const duplicateIds: string[] = [];

            for (const recipient of existingRecipients) {
                const key = this.getRecipientKey(recipient.email, recipient.typeEmail);
                if (!key) continue;

                if (existingByKey.has(key)) {
                    duplicateIds.push(recipient.id);
                } else {
                    existingByKey.set(key, recipient);
                }
            }

            if (duplicateIds.length) {
                await repository.delete(duplicateIds);
            }

            let existingDuplicatesSkipped = 0;
            const usersToCreate = uniqueUsers.filter((user) => {
                const key = this.getRecipientKey(user.email, user.typeEmail);

                if (key && existingByKey.has(key)) {
                    existingDuplicatesSkipped += 1;
                    return false;
                }

                return true;
            });
            const userEntities = usersToCreate.map(u => repository.create({
                name: u.name,
                email: this.normalizeEmail(u.email),
                phone: this.normalizeOptionalString(u.phone),
                description: this.normalizeOptionalString(u.description),
                tgId: u.tgId ?? null,
                vkId: u.vkId ?? null,
                typeEmail: u.typeEmail,
                role: UserRole.CLIENT,
            }));
            const savedUsers = userEntities.length ? await repository.save(userEntities) : [];
            const existingDuplicatesRemoved = duplicateIds.length;

            return {
                users: savedUsers.map(UserDTO.fromModel),
                importedCount: savedUsers.length,
                duplicateCount: duplicatesInFile + existingDuplicatesSkipped + existingDuplicatesRemoved,
                duplicatesInFile,
                existingDuplicatesSkipped,
                existingDuplicatesRemoved,
            };
        });
    }

    async update(id: string, userData: UserDTO.Update): Promise<UserDTO> {
        const existingUser = await this.userRepository.findOneBy({ id });
        if (!existingUser) {
            throw new NotFoundException(`User with id ${id} not found`);
        }

        const normalizedEmail = userData.email === undefined
            ? existingUser.email
            : this.normalizeEmail(userData.email);
        const typeEmail = userData.typeEmail === undefined
            ? existingUser.typeEmail
            : userData.typeEmail;
        const phone = userData.phone === undefined
            ? existingUser.phone
            : this.normalizeOptionalString(userData.phone);
        const description = userData.description === undefined
            ? existingUser.description
            : this.normalizeOptionalString(userData.description);

        await this.assertRecipientIsUnique(normalizedEmail, typeEmail, id);

        this.userRepository.merge(existingUser, {
            name: userData.name,
            email: normalizedEmail,
            phone,
            description,
            tgId: userData.tgId,
            vkId: userData.vkId,
            typeEmail,
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
                phone: null,
                description: null,
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
