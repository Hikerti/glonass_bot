import {UserDTO, User} from "@domains";
import {Injectable, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";

@Injectable()
export class AuthRepository {
    constructor(
        @InjectRepository(User)
        private readonly database: Repository<User>
    ) {}

    async findUserById(id: string): Promise<UserDTO> {
        const user = await this.database.findOneBy({ id });

        if (!user) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return UserDTO.fromModel(user)
    }

    async findUserByTgId(tgId: string): Promise<UserDTO> {
        const user = await this.database.findOneBy({ tgId });

        if (!user) {
            throw new NotFoundException(`User with tgId ${tgId} not found`)
        }

        return UserDTO.fromModel(user)
    }

    async deleteUserByTgId(tgId: string): Promise<UserDTO> {
        const userToDelete = await this.database.findOneBy({ tgId });

        if (!userToDelete) {
            throw new NotFoundException(`User with tgId ${tgId} not found`)
        }

        await this.database.delete({ tgId });

        return UserDTO.fromModel(userToDelete)
    }
}