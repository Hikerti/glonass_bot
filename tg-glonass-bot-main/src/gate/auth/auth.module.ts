import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {AuthRepository} from "./auth.repository";
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "@domains";

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
    ],
  providers: [AuthService, AuthRepository],
  controllers: [AuthController]
})
export class AuthModule {}
