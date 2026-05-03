import { Injectable } from '@nestjs/common';
import {AuthRepository} from "./auth.repository";
import {UserDTO} from "@domains";

@Injectable()
export class AuthService {
    constructor(private readonly authRepository: AuthRepository) {}

    async loginTg(tgId: string): Promise<UserDTO> {
        return await this.authRepository.findUserByTgId(tgId)
    }
    async logoutTg(tgId: string): Promise<UserDTO> {
        return await this.authRepository.deleteUserByTgId(tgId)
    }
}
